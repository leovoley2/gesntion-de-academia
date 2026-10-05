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

/*
 * El enlace del correo de "olvidé mi contraseña" vuelve con los datos en el
 * hash (#access_token=…&type=recovery, o #error_code=otp_expired si caducó).
 * supabase-js lo procesa y limpia la URL de forma asíncrona, así que lo leemos
 * aquí, al cargar el módulo y antes de crear el cliente.
 */
const hashInicial = new URLSearchParams(
  typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
);
/** La app se abrió desde el enlace de recuperación de contraseña. */
export const vieneDeRecuperacion = hashInicial.get('type') === 'recovery';
/** Código de error del enlace de Supabase (p. ej. 'otp_expired'), si lo hubo. */
export const errorEnlaceAuth = hashInicial.get('error_code');

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
