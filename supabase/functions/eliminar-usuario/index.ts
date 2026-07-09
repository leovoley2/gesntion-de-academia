// Edge Function `eliminar-usuario`
// Borra la cuenta auth + perfil (cascade) con permisos de servidor.
// Desplegar con:
//   supabase functions deploy eliminar-usuario
import { CORS, json, exigirAdmin } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const auth = await exigirAdmin(req);
    if (auth instanceof Response) return auth;
    const { admin, callerId } = auth;

    const { id } = await req.json();
    if (!id) return json({ error: 'Falta el id del usuario' }, 400);
    if (id === callerId) {
      return json({ error: 'No puedes eliminar tu propia cuenta de administrador' }, 400);
    }

    // Nota: si el usuario tiene pagos registrados, la FK (on delete restrict)
    // impedirá el borrado; ese mensaje llega al cliente tal cual.
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500);
  }
});
