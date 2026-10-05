import { supabase } from '../../../lib/supabaseClient';
import type { EstadoAsistencia, TipoMembresia } from '../../../types/database.types';

export interface AlumnoClase {
  alumno_id: string;
  nombre_completo: string;
  /** Plan activo del alumno; null si no tiene ninguno (p. ej. mensualidad vencida). */
  tipo_membresia: TipoMembresia | null;
  estado?: EstadoAsistencia;
}

/** Texto del plan que ve el entrenador junto a cada alumno. */
export function etiquetaPlan(tipo: TipoMembresia | null): string {
  if (!tipo) return 'sin plan activo';
  return tipo === 'paquete_clases' ? 'paquete de clases' : tipo;
}

interface InscritoRow {
  alumno_id: string;
  alumno: { nombre_completo: string } | null;
}

/**
 * Carga los alumnos inscritos en una clase, con su tipo de membresía activa
 * y la asistencia ya registrada para la fecha indicada (para precargar toggles).
 */
export async function getAlumnosDeClase(
  horarioClaseId: string,
  fecha: string
): Promise<AlumnoClase[]> {
  const { data: inscritos, error } = await supabase
    .from('inscripciones_clase')
    .select('alumno_id, alumno:perfiles!alumno_id(nombre_completo)')
    .eq('horario_clase_id', horarioClaseId)
    .returns<InscritoRow[]>();
  if (error) throw error;

  const ids = (inscritos ?? []).map((i) => i.alumno_id);
  if (ids.length === 0) return [];

  // Tipo de membresía activa por alumno (el entrenador la ve por RLS solo
  // para los alumnos de sus clases; migración 0015).
  const { data: membresias } = await supabase
    .from('matriculas_membresias')
    .select('alumno_id, tipo_membresia')
    .in('alumno_id', ids)
    .eq('estado', 'activa');
  const tipoPorAlumno = new Map<string, TipoMembresia>(
    (membresias ?? []).map((m) => [m.alumno_id, m.tipo_membresia])
  );

  // Asistencia ya marcada para esta clase y fecha.
  const { data: asistencias } = await supabase
    .from('control_asistencia')
    .select('alumno_id, estado')
    .eq('horario_clase_id', horarioClaseId)
    .eq('fecha', fecha);
  const estadoPorAlumno = new Map<string, EstadoAsistencia>(
    (asistencias ?? []).map((a) => [a.alumno_id, a.estado])
  );

  return (inscritos ?? []).map((i) => ({
    alumno_id: i.alumno_id,
    nombre_completo: i.alumno?.nombre_completo ?? 'Alumno',
    tipo_membresia: tipoPorAlumno.get(i.alumno_id) ?? null,
    estado: estadoPorAlumno.get(i.alumno_id),
  }));
}

interface MarcarParams {
  horarioClaseId: string;
  fecha: string;
  alumno: AlumnoClase;
  estado: EstadoAsistencia;
}

/**
 * Registra (upsert) la asistencia. El descuento de crédito ocurre de forma
 * automática y segura en el servidor: un trigger sobre `control_asistencia`
 * resta un crédito al marcar 'asistio' (y lo repone si se desmarca).
 * Por eso aquí ya NO llamamos a ninguna función RPC.
 */
export async function marcarAsistencia({ horarioClaseId, fecha, alumno, estado }: MarcarParams) {
  const { error } = await supabase.from('control_asistencia').upsert(
    {
      horario_clase_id: horarioClaseId,
      alumno_id: alumno.alumno_id,
      fecha,
      estado,
    },
    { onConflict: 'horario_clase_id,alumno_id,fecha' }
  );
  if (error) throw error;
}
