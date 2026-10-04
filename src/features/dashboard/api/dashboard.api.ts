import { supabase } from '../../../lib/supabaseClient';
import type { MatriculaMembresia } from '../../../types/database.types';

export interface MetricasAdmin {
  ingresosMes: number;
  alumnosActivos: number;
  membresiasVencidas: number;
  pagosPendientes: number;
}

/** Métricas del panel admin, sumadas en la BD (mes en hora de Perú). */
export async function metricasAdmin(): Promise<MetricasAdmin> {
  const { data, error } = await supabase.rpc('metricas_admin');
  if (error) throw error;
  return {
    ingresosMes: Number(data.ingresosMes),
    alumnosActivos: data.alumnosActivos,
    membresiasVencidas: data.membresiasVencidas,
    pagosPendientes: data.pagosPendientes,
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
