import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabaseClient';
import type { Perfil, RolUsuario } from '../../../types/database.types';
import { rango, type Pagina } from '../../../lib/paginacion';

/**
 * Extrae el mensaje real de error de una Edge Function. Cuando la función
 * responde con estado != 2xx, supabase-js NO rellena `data`: el cuerpo de la
 * respuesta viaja en `error.context` y hay que leerlo de ahí.
 */
async function mensajeDeFuncion(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const cuerpo = (await error.context.json()) as { error?: string } | null;
      if (cuerpo?.error) return cuerpo.error;
    } catch {
      // cuerpo no-JSON: caemos al mensaje genérico
    }
  }
  return error instanceof Error ? error.message : 'Error inesperado';
}

/** Lista todos los perfiles (solo visible para administrador por RLS). */
export async function listarPerfiles(pagina = 0): Promise<Pagina<Perfil>> {
  const { data, error, count } = await supabase
    .from('perfiles')
    .select('*', { count: 'exact' })
    .order('fecha_registro', { ascending: false })
    .order('id')
    .range(...rango(pagina));
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}

export interface NuevoUsuario {
  nombre_completo: string;
  email: string;
  password: string;
  telefono?: string;
  rol: RolUsuario;
}

/**
 * Crea un usuario llamando a la Edge Function `crear-usuario`, que corre en el
 * servidor con permisos de administrador. Nunca exponemos el service_role aquí.
 */
export async function crearUsuario(payload: NuevoUsuario): Promise<void> {
  const { data, error } = await supabase.functions.invoke('crear-usuario', {
    body: payload,
  });
  if (error) throw new Error(await mensajeDeFuncion(error));
  if (data?.error) throw new Error(data.error);
}

/** Cambia el rol de un perfil existente. */
export async function actualizarRol(id: string, rol: RolUsuario): Promise<void> {
  const { error } = await supabase.from('perfiles').update({ rol }).eq('id', id);
  if (error) throw error;
}

export interface DatosEdicion {
  nombre_completo: string;
  telefono: string | null;
  rol: RolUsuario;
}

/** Edita los datos de un perfil (solo admin por RLS). */
export async function actualizarUsuario(id: string, d: DatosEdicion): Promise<void> {
  const { error } = await supabase.from('perfiles').update(d).eq('id', id);
  if (error) throw error;
}

/** Elimina un usuario por completo (cuenta auth + datos) vía Edge Function. */
export async function eliminarUsuario(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('eliminar-usuario', {
    body: { id },
  });
  if (error) throw new Error(await mensajeDeFuncion(error));
  if (data?.error) throw new Error(data.error);
}
