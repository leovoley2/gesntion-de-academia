import { supabase } from '../../../lib/supabaseClient';
import { registrarPago } from '../../pagos/api/pagos.api';
import type {
  MetodoPago,
  ModalidadPersonalizada,
  Perfil,
  Plan,
  TarifaEntrenador,
} from '../../../types/database.types';

/** Paquetes de sesiones personalizadas (descuentos de lsbeachlab.com). */
export const PAQUETES = [
  { sesiones: 4, descuento: 0.05 },
  { sesiones: 8, descuento: 0.1 },
  { sesiones: 12, descuento: 0.15 },
] as const;

export const MODALIDADES: { valor: ModalidadPersonalizada; etiqueta: string; atletas: string }[] = [
  { valor: 'individual', etiqueta: 'Individual', atletas: '1 atleta · sesión exclusiva' },
  { valor: 'duo', etiqueta: 'Dúo', atletas: '2 atletas · precio por atleta' },
  { valor: 'grupo3', etiqueta: 'Grupo de 3', atletas: '3 atletas · precio por atleta' },
  { valor: 'grupo4', etiqueta: 'Grupo de 4', atletas: '4 atletas · precio por atleta' },
];

export async function listarPlanes(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('planes')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface EntrenadorConTarifas extends Perfil {
  tarifas: TarifaEntrenador[];
}

export async function listarEntrenadoresConTarifas(): Promise<EntrenadorConTarifas[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*, tarifas:tarifas_entrenador(*)')
    .eq('rol', 'entrenador')
    .order('nombre_completo', { ascending: true })
    .returns<EntrenadorConTarifas[]>();
  if (error) throw error;
  return data ?? [];
}

/** Solicitud pendiente o membresía viva del alumno (para saber si ya se inscribió). */
export async function miSolicitudOMembresia(alumnoId: string) {
  const { data, error } = await supabase
    .from('matriculas_membresias')
    .select('*')
    .eq('alumno_id', alumnoId)
    .in('estado', ['pendiente', 'activa'])
    .order('fecha_inicio', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

interface BaseSolicitud {
  alumnoId: string;
  metodo: MetodoPago;
  comprobante: File | null;
}

export interface SolicitudAcademia extends BaseSolicitud {
  plan: Plan;
  horarioIds: string[];
}

/**
 * Crea la solicitud de ingreso a la academia: matrícula 'pendiente' + días
 * elegidos + pago por revisar. El admin la aprueba desde "Nuevos ingresos".
 */
export async function crearSolicitudAcademia(s: SolicitudAcademia): Promise<void> {
  const { data: matricula, error } = await supabase
    .from('matriculas_membresias')
    .insert({
      alumno_id: s.alumnoId,
      tipo_membresia: 'mensual',
      estado: 'pendiente',
      plan_id: s.plan.id,
      clases_totales: s.plan.clases_mensuales,
      clases_disponibles: 0,
    })
    .select('id')
    .single();
  if (error) throw error;

  const { error: errInsc } = await supabase.from('inscripciones_clase').upsert(
    s.horarioIds.map((horarioId) => ({
      horario_clase_id: horarioId,
      alumno_id: s.alumnoId,
      matricula_id: matricula.id,
    })),
    { onConflict: 'horario_clase_id,alumno_id', ignoreDuplicates: true }
  );
  if (errInsc) throw errInsc;

  await registrarPago({
    alumno_id: s.alumnoId,
    monto: Number(s.plan.precio_mensual),
    concepto: `Inscripción · Plan ${s.plan.nombre}`,
    metodo_pago: s.metodo,
    comprobante: s.comprobante,
    matricula_id: matricula.id,
  });
}

export interface SolicitudPersonalizada extends BaseSolicitud {
  entrenador: EntrenadorConTarifas;
  modalidad: ModalidadPersonalizada;
  sesiones: number;
  precioTotal: number;
}

/** Precio total del paquete por atleta (tarifa × sesiones, menos descuento). */
export function precioPaquete(
  entrenador: EntrenadorConTarifas,
  modalidad: ModalidadPersonalizada,
  sesiones: number
): number {
  const tarifa = entrenador.tarifas.find((t) => t.modalidad === modalidad);
  if (!tarifa) return 0;
  const paquete = PAQUETES.find((p) => p.sesiones === sesiones);
  const bruto = Number(tarifa.precio_por_atleta) * sesiones;
  return Math.round(bruto * (1 - (paquete?.descuento ?? 0)));
}

/** Solicitud de paquete personalizado: créditos que se activan al aprobar. */
export async function crearSolicitudPersonalizada(s: SolicitudPersonalizada): Promise<void> {
  const etiqueta =
    MODALIDADES.find((m) => m.valor === s.modalidad)?.etiqueta ?? s.modalidad;

  const { data: matricula, error } = await supabase
    .from('matriculas_membresias')
    .insert({
      alumno_id: s.alumnoId,
      tipo_membresia: 'personalizado',
      estado: 'pendiente',
      clases_totales: s.sesiones,
      clases_disponibles: s.sesiones,
    })
    .select('id')
    .single();
  if (error) throw error;

  await registrarPago({
    alumno_id: s.alumnoId,
    monto: s.precioTotal,
    concepto: `Paquete ${s.sesiones} sesiones ${etiqueta} · ${s.entrenador.nombre_completo}`,
    metodo_pago: s.metodo,
    comprobante: s.comprobante,
    matricula_id: matricula.id,
  });
}
