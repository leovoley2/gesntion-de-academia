import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Si faltan las credenciales NO lanzamos un error en tiempo de carga
 * (eso dejaba la app en blanco). En su lugar marcamos la bandera
 * `supabaseConfigurado` para mostrar un aviso en la UI y usamos valores
 * placeholder para que el cliente se construya sin romper.
 */
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigurado) {
  console.warn(
    '[Supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.local.example a .env.local, rellena tus credenciales y reinicia el servidor.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
