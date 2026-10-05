import { supabase } from '../../../lib/supabaseClient';
import type { HorarioClase, NivelClase, Perfil } from '../../../types/database.types';

export interface HorarioConDatos extends HorarioClase {
  sede: { nombre: string } | null;
  entrenador: { nombre_completo: string } | null;
}

export async function listarHorarios(): Promise<HorarioConDatos[]> {
  const { data, error } = await supabase
    .from('horarios_clases')
    .select('*, sede:sedes_canchas!sede_id(nombre), entrenador:perfiles!entrenador_id(nombre_completo)')
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true })
    .returns<HorarioConDatos[]>();
  if (error) throw error;
  return data ?? [];
}

/** Clases del entrenador para un día de la semana concreto (su agenda). */
export async function listarAgendaEntrenador(
  entrenadorId: string,
  diaSemana: number
): Promise<HorarioConDatos[]> {
  const { data, error } = await supabase
    .from('horarios_clases')
    .select('*, sede:sedes_canchas!sede_id(nombre), entrenador:perfiles!entrenador_id(nombre_completo)')
    .eq('entrenador_id', entrenadorId)
    .eq('dia_semana', diaSemana)
    .order('hora_inicio', { ascending: true })
    .returns<HorarioConDatos[]>();
  if (error) throw error;
  return data ?? [];
}

export interface DatosHorario {
  sede_id: string;
  entrenador_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  nivel: NivelClase;
}

/** Duración máxima razonable de una clase grupal (atrapa errores como 06:30–20:30). */
const MAX_MINUTOS = 4 * 60;

function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Valida una clase antes de crearla o editarla; devuelve el error o null. */
export function validarHorario(d: DatosHorario): string | null {
  if (!d.sede_id) return 'Selecciona una sede.';
  if (!d.entrenador_id) return 'Selecciona un entrenador.';
  const duracion = aMinutos(d.hora_fin) - aMinutos(d.hora_inicio);
  if (duracion <= 0) return 'La hora de fin debe ser después de la de inicio.';
  if (duracion > MAX_MINUTOS) return 'La clase dura más de 4 horas: revisa la hora de fin.';
  return null;
}

export async function crearHorario(d: DatosHorario): Promise<void> {
  const { error } = await supabase.from('horarios_clases').insert(d);
  if (error) throw error;
}

/** Cambia una clase existente; los alumnos inscritos se mantienen en ella. */
export async function actualizarHorario(id: string, d: DatosHorario): Promise<void> {
  const { error } = await supabase.from('horarios_clases').update(d).eq('id', id);
  if (error) throw error;
}

export async function eliminarHorario(id: string): Promise<void> {
  const { error } = await supabase.from('horarios_clases').delete().eq('id', id);
  if (error) throw error;
}

// ---- Inscripciones de alumnos a una clase ----
export interface InscritoConAlumno {
  id: string;
  alumno_id: string;
  alumno: { nombre_completo: string } | null;
}

export async function listarInscritos(horarioClaseId: string): Promise<InscritoConAlumno[]> {
  const { data, error } = await supabase
    .from('inscripciones_clase')
    .select('id, alumno_id, alumno:perfiles!alumno_id(nombre_completo)')
    .eq('horario_clase_id', horarioClaseId)
    .returns<InscritoConAlumno[]>();
  if (error) throw error;
  return data ?? [];
}

export async function inscribirAlumno(horarioClaseId: string, alumnoId: string): Promise<void> {
  const { error } = await supabase
    .from('inscripciones_clase')
    .insert({ horario_clase_id: horarioClaseId, alumno_id: alumnoId });
  if (error) throw error;
}

export async function desinscribir(inscripcionId: string): Promise<void> {
  const { error } = await supabase.from('inscripciones_clase').delete().eq('id', inscripcionId);
  if (error) throw error;
}

/** Alumnos (rol=alumno) para los selectores de inscripción. */
export async function listarAlumnosSimple(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('rol', 'alumno')
    .order('nombre_completo', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
