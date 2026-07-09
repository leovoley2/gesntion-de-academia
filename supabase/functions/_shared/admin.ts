import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/**
 * Crea el cliente con service_role y verifica que quien llama (JWT del
 * header Authorization) sea un administrador. Devuelve el cliente admin
 * o una Response de error lista para retornar.
 */
export async function exigirAdmin(
  req: Request
): Promise<{ admin: SupabaseClient; callerId: string } | Response> {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'No autenticado' }, 401);

  const { data: perfil } = await admin
    .from('perfiles')
    .select('rol')
    .eq('id', data.user.id)
    .single();

  if (perfil?.rol !== 'administrador') {
    return json({ error: 'Solo un administrador puede realizar esta acción' }, 403);
  }
  return { admin, callerId: data.user.id };
}
