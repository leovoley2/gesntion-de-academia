import { supabase } from '../../../lib/supabaseClient';
import { subirComprobante } from '../../pagos/api/pagos.api';
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
 * El comprobante se sube primero; el resto lo hace el servidor en una sola
 * transacción (si algo falla, no queda una solicitud a medias).
 */
export async function crearSolicitudAcademia(s: SolicitudAcademia): Promise<void> {
  const comprobanteUrl = await subirComprobante(s.alumnoId, s.comprobante);

  const { error } = await supabase.rpc('solicitar_ingreso_academia', {
    p_plan_id: s.plan.id,
    p_horario_ids: s.horarioIds,
    p_metodo: s.metodo,
    p_comprobante_url: comprobanteUrl,
  });
  if (error) throw error;
}

export interface SolicitudPersonalizada extends BaseSolicitud {
  entrenador: EntrenadorConTarifas;
  modalidad: ModalidadPersonalizada;
  sesiones: number;
}

/**
 * Precio total del paquete por atleta (tarifa × sesiones, menos descuento).
 * Solo para mostrarlo: el monto que se cobra lo calcula el servidor con la
 * misma fórmula (`precio_paquete` en la BD).
 */
export function precioPaquete(
  entrenador: EntrenadorConTarifas,
  modalidad: ModalidadPersonalizada,
  sesiones: number
): number {
  const tarifa = entrenador.tarifas.find((t) => t.modalidad === modalidad);
  if (!tarifa) return 0;
  const paquete = PAQUETES.find((p) => p.sesiones === sesiones);
  const bruto = Number(tarifa.precio_por_atleta) * sesiones;
  // Descuento en % entero para evitar errores de coma flotante al redondear.
  const pct = Math.round((paquete?.descuento ?? 0) * 100);
  return Math.round((bruto * (100 - pct)) / 100);
}

/** Solicitud de paquete personalizado: créditos que se activan al aprobar. El monto lo fija el servidor. */
export async function crearSolicitudPersonalizada(s: SolicitudPersonalizada): Promise<void> {
  const comprobanteUrl = await subirComprobante(s.alumnoId, s.comprobante);

  const { error } = await supabase.rpc('solicitar_paquete_personalizado', {
    p_entrenador_id: s.entrenador.id,
    p_modalidad: s.modalidad,
    p_sesiones: s.sesiones,
    p_metodo: s.metodo,
    p_comprobante_url: comprobanteUrl,
  });
  if (error) throw error;
}
