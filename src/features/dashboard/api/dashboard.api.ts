import { supabase } from '../../../lib/supabaseClient';
import type { MatriculaMembresia } from '../../../types/database.types';
import { isoLocal } from '../../../utils/fechas';

export interface MetricasAdmin {
  ingresosMes: number;
  alumnosActivos: number;
  membresiasVencidas: number;
  pagosPendientes: number;
}

export async function metricasAdmin(): Promise<MetricasAdmin> {
  const inicioMes = isoLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [ingresos, activas, vencidas, pendientes] = await Promise.all([
    supabase.from('pagos').select('monto').eq('estado', 'aprobado').gte('fecha_pago', inicioMes),
    supabase
      .from('matriculas_membresias')
      .select('alumno_id')
      .eq('estado', 'activa'),
    supabase
      .from('matriculas_membresias')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'vencida'),
    supabase.from('pagos').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
  ]);

  if (ingresos.error) throw ingresos.error;
  if (activas.error) throw activas.error;
  if (vencidas.error) throw vencidas.error;
  if (pendientes.error) throw pendientes.error;

  const ingresosMes = (ingresos.data ?? []).reduce((s, p) => s + Number(p.monto), 0);
  const alumnosActivos = new Set((activas.data ?? []).map((m) => m.alumno_id)).size;

  return {
    ingresosMes,
    alumnosActivos,
    membresiasVencidas: vencidas.count ?? 0,
    pagosPendientes: pendientes.count ?? 0,
  };
}

/**
 * Membresía "relevante" del alumno: primero una activa, si no una solicitud
 * pendiente de aprobación, y en último caso la más reciente (p. ej. vencida).
 */
export async function miMembresia(alumnoId: string): Promise<MatriculaMembresia | null> {
  const { data, error } = await supabase
    .from('matriculas_membresias')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('fecha_inicio', { ascending: false });
  if (error) throw error;
  const todas = data ?? [];
  return (
    todas.find((m) => m.estado === 'activa') ??
    todas.find((m) => m.estado === 'pendiente') ??
    todas[0] ??
    null
  );
}

/** Número de clases del entrenador para hoy. */
export async function clasesHoyEntrenador(entrenadorId: string): Promise<number> {
  const { count, error } = await supabase
    .from('horarios_clases')
    .select('id', { count: 'exact', head: true })
    .eq('entrenador_id', entrenadorId)
    .eq('dia_semana', new Date().getDay());
  if (error) throw error;
  return count ?? 0;
}
