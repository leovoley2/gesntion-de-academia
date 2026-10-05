// Edge Function `restablecer-password`
// El admin fija una contraseña nueva a otro usuario (p. ej. un alumno que la
// olvidó y no recibe el correo de recuperación). Desplegar con:
//   supabase functions deploy restablecer-password
import { CORS, json, exigirAdmin } from '../_shared/admin.ts';

const MIN_PASSWORD = 8;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const auth = await exigirAdmin(req);
    if (auth instanceof Response) return auth;
    const { admin, callerId } = auth;

    const { id, password } = await req.json();
    if (!id || !password) return json({ error: 'Faltan el usuario o la contraseña' }, 400);
    if (id === callerId) {
      return json({ error: 'Cambia tu propia contraseña desde "Mi cuenta"' }, 400);
    }
    if (String(password).length < MIN_PASSWORD) {
      return json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` }, 400);
    }

    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500);
  }
});
