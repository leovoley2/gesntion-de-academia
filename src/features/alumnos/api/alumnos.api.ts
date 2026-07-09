import { supabase } from '../../../lib/supabaseClient';
import type { Perfil } from '../../../types/database.types';

/** Alumnos (rol=alumno) para el selector de gestión de días. */
export async function listarAlumnos(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('rol', 'alumno')
    .order('nombre_completo', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface InscripcionAlumno {
  id: string;
  horario_clase_id: string;
  horario: {
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    nivel: string;
    sede: { nombre: string } | null;
  } | null;
}

/** Días (clases grupales) en los que está inscrito un alumno. */
export async function inscripcionesDeAlumno(alumnoId: string): Promise<InscripcionAlumno[]> {
  const { data, error } = await supabase
    .from('inscripciones_clase')
    .select(
      'id, horario_clase_id, horario:horarios_clases(dia_semana, hora_inicio, hora_fin, nivel, sede:sedes_canchas!sede_id(nombre))'
    )
    .eq('alumno_id', alumnoId)
    .returns<InscripcionAlumno[]>();
  if (error) throw error;
  return data ?? [];
}

/** Inscribe al alumno en una clase grupal (para que el admin modifique sus días). */
export async function agregarDia(horarioClaseId: string, alumnoId: string): Promise<void> {
  const { error } = await supabase
    .from('inscripciones_clase')
    .insert({ horario_clase_id: horarioClaseId, alumno_id: alumnoId });
  if (error) {
    if (error.code === '23505') throw new Error('El alumno ya está inscrito en ese día.');
    throw error;
  }
}

/** Quita al alumno de una clase grupal. */
export async function quitarDia(inscripcionId: string): Promise<void> {
  const { error } = await supabase.from('inscripciones_clase').delete().eq('id', inscripcionId);
  if (error) throw error;
}
