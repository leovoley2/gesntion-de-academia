import { supabase } from '../../../lib/supabaseClient';
import type { SedeCancha, TipoSede } from '../../../types/database.types';

export interface DatosSede {
  nombre: string;
  tipo: TipoSede;
  tarifa_hora: number;
}

export async function listarSedes(): Promise<SedeCancha[]> {
  const { data, error } = await supabase
    .from('sedes_canchas')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function crearSede(datos: DatosSede): Promise<void> {
  const { error } = await supabase.from('sedes_canchas').insert(datos);
  if (error) throw error;
}

export async function actualizarSede(id: string, datos: DatosSede): Promise<void> {
  const { error } = await supabase.from('sedes_canchas').update(datos).eq('id', id);
  if (error) throw error;
}

export async function eliminarSede(id: string): Promise<void> {
  const { error } = await supabase.from('sedes_canchas').delete().eq('id', id);
  if (error) throw error;
}
