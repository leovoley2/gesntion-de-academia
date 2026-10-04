import { supabase } from '../../../lib/supabaseClient';
import type {
  MatriculaMembresia,
  Perfil,
  TipoMembresia,
  EstadoMembresia,
} from '../../../types/database.types';
import { rango, type Pagina } from '../../../lib/paginacion';

export interface MembresiaConAlumno extends MatriculaMembresia {
  alumno: { nombre_completo: string } | null;
}

/** Membresías con el nombre del alumno embebido (vía FK alumno_id). */
export async function listarMembresias(pagina = 0): Promise<Pagina<MembresiaConAlumno>> {
  const { data, error, count } = await supabase
    .from('matriculas_membresias')
    .select('*, alumno:perfiles!alumno_id(nombre_completo)', { count: 'exact' })
    .order('fecha_inicio', { ascending: false })
    .order('id')
    .range(...rango(pagina))
    .returns<MembresiaConAlumno[]>();
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}

/** Alumnos disponibles para asignarles una membresía. */
export async function listarAlumnos(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('rol', 'alumno')
    .order('nombre_completo', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface DatosMembresia {
  alumno_id: string;
  tipo_membresia: TipoMembresia;
  clases_totales: number;
  fecha_inicio: string;
  fecha_fin: string | null;
}

export async function crearMembresia(datos: DatosMembresia): Promise<void> {
  const { error } = await supabase.from('matriculas_membresias').insert({
    ...datos,
    // Al crear, los créditos disponibles arrancan iguales al total.
    clases_disponibles: datos.clases_totales,
    estado: 'activa',
  });
  if (error) throw error;
}

export async function actualizarEstado(id: string, estado: EstadoMembresia): Promise<void> {
  const { error } = await supabase
    .from('matriculas_membresias')
    .update({ estado })
    .eq('id', id);
  if (error) throw error;
}

export async function eliminarMembresia(id: string): Promise<void> {
  const { error } = await supabase.from('matriculas_membresias').delete().eq('id', id);
  if (error) throw error;
}
