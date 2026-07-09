import { supabase } from '../../../lib/supabaseClient';
import type {
  ModalidadPersonalizada,
  Perfil,
  TarifaEntrenador,
} from '../../../types/database.types';
import { isoLocal } from '../../../utils/fechas';

export interface EntrenadorReserva extends Perfil {
  tarifas: Pick<TarifaEntrenador, 'modalidad' | 'precio_por_atleta'>[];
}

/** Modalidades de clase personalizada que el alumno puede elegir al reservar. */
export const MODALIDADES_RESERVA: {
  valor: ModalidadPersonalizada;
  etiqueta: string;
  detalle: string;
}[] = [
  { valor: 'individual', etiqueta: 'Solo (1)', detalle: 'Solo tú, sesión exclusiva' },
  { valor: 'duo', etiqueta: 'Dúo (2)', detalle: 'Tú y 1 más · precio por persona' },
  { valor: 'grupo3', etiqueta: 'Grupo (3)', detalle: '3 personas · precio por persona' },
  { valor: 'grupo4', etiqueta: 'Grupo (4)', detalle: '4 personas · precio por persona' },
];

/** Precio por atleta de una modalidad según las tarifas del entrenador. */
export function precioModalidad(
  tarifas: { modalidad: string; precio_por_atleta: number }[] | undefined,
  modalidad: ModalidadPersonalizada
): number {
  const t = tarifas?.find((x) => x.modalidad === modalidad);
  return t ? Number(t.precio_por_atleta) : 0;
}

/**
 * Entrenadores disponibles para que el alumno elija con quién reservar, con
 * sus tarifas por modalidad (la fuente única de precios: `tarifas_entrenador`).
 */
export async function listarEntrenadores(): Promise<EntrenadorReserva[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*, tarifas:tarifas_entrenador(modalidad, precio_por_atleta)')
    .eq('rol', 'entrenador')
    .order('nombre_completo', { ascending: true })
    .returns<EntrenadorReserva[]>();
  if (error) throw error;
  return data ?? [];
}

/** Precio de una sesión individual del entrenador (el que aplica al reservar por hora). */
export function tarifaIndividual(e?: { tarifas: { modalidad: string; precio_por_atleta: number }[] }): number {
  const t = e?.tarifas?.find((x) => x.modalidad === 'individual');
  return t ? Number(t.precio_por_atleta) : 0;
}

export interface Bloque {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

/** Disponibilidad futura y habilitada de un entrenador. */
export async function obtenerDisponibilidad(entrenadorId: string): Promise<Bloque[]> {
  const hoy = isoLocal();
  const { data, error } = await supabase
    .from('disponibilidad_entrenador')
    .select('id, fecha, hora_inicio, hora_fin')
    .eq('entrenador_id', entrenadorId)
    .eq('habilitado', true)
    .eq('tipo', 'personalizada') // el alumno solo reserva clases personalizadas
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

interface CrearReservaParams {
  alumnoId: string;
  entrenadorId: string;
  sedeId: string;
  bloque: Bloque;
  modalidad: ModalidadPersonalizada;
}

import type { ClaseReserva, EstadoReserva } from '../../../types/database.types';

export interface ReservaConDatos extends ClaseReserva {
  alumno: { nombre_completo: string } | null;
  sede: { nombre: string } | null;
}

/**
 * Reservas para gestionar. El entrenador ve las suyas; el admin, todas
 * (gobernado por RLS). Por defecto trae las pendientes primero.
 */
export async function listarSolicitudes(entrenadorId?: string): Promise<ReservaConDatos[]> {
  let q = supabase
    .from('clases_personalizadas_reservas')
    .select('*, alumno:perfiles!alumno_id(nombre_completo), sede:sedes_canchas!sede_id(nombre)')
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });
  if (entrenadorId) q = q.eq('entrenador_id', entrenadorId);
  const { data, error } = await q.returns<ReservaConDatos[]>();
  if (error) throw error;
  return data ?? [];
}

export interface MiReserva extends ClaseReserva {
  entrenador: { nombre_completo: string } | null;
  sede: { nombre: string } | null;
}

/** Historial de reservas del propio alumno (las ve por RLS). */
export async function listarMisReservas(alumnoId: string): Promise<MiReserva[]> {
  const { data, error } = await supabase
    .from('clases_personalizadas_reservas')
    .select(
      '*, entrenador:perfiles!entrenador_id(nombre_completo), sede:sedes_canchas!sede_id(nombre)'
    )
    .eq('alumno_id', alumnoId)
    .order('creada_en', { ascending: false })
    .returns<MiReserva[]>();
  if (error) throw error;
  return data ?? [];
}

/**
 * Cambia el estado de una reserva. Al pasar a 'confirmada' el servidor
 * descuenta un crédito (trigger); al cancelar una confirmada, lo repone.
 */
export async function actualizarEstadoReserva(id: string, estado: EstadoReserva): Promise<void> {
  const { error } = await supabase
    .from('clases_personalizadas_reservas')
    .update({ estado })
    .eq('id', id);
  if (error) throw error;
}

/** Crea una solicitud de reserva en estado 'pendiente'. */
export async function crearReserva({
  alumnoId,
  entrenadorId,
  sedeId,
  bloque,
  modalidad,
}: CrearReservaParams) {
  const { error } = await supabase.from('clases_personalizadas_reservas').insert({
    alumno_id: alumnoId,
    entrenador_id: entrenadorId,
    sede_id: sedeId,
    fecha: bloque.fecha,
    hora_inicio: bloque.hora_inicio,
    hora_fin: bloque.hora_fin,
    modalidad,
    estado: 'pendiente',
  });
  if (error) {
    // 23505 = violación de índice único → ese horario ya está reservado.
    if (error.code === '23505') {
      throw new Error('Ese horario ya fue reservado. Elige otro, por favor.');
    }
    throw error;
  }
}
