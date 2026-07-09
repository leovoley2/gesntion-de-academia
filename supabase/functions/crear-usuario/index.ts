// Edge Function `crear-usuario`
// El admin crea cuentas (alumno/entrenador/administrador) sin exponer el
// service_role en el navegador. Desplegar con:
//   supabase functions deploy crear-usuario
import { CORS, json, exigirAdmin } from '../_shared/admin.ts';

const ROLES = ['administrador', 'entrenador', 'alumno'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const auth = await exigirAdmin(req);
    if (auth instanceof Response) return auth;
    const { admin } = auth;

    const { nombre_completo, email, password, telefono, rol } = await req.json();
    if (!nombre_completo || !email || !password || !rol) {
      return json({ error: 'Faltan datos obligatorios (nombre, email, contraseña, rol)' }, 400);
    }
    if (!ROLES.includes(rol)) return json({ error: `Rol inválido: ${rol}` }, 400);
    if (String(password).length < 8) {
      return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);
    }

    const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo },
    });
    if (errCrear) return json({ error: errCrear.message }, 400);

    // El trigger handle_new_user ya creó el perfil como 'alumno';
    // aquí se ajustan rol y teléfono con permisos de servidor.
    const { error: errPerfil } = await admin
      .from('perfiles')
      .update({ rol, telefono: telefono ?? null, nombre_completo })
      .eq('id', creado.user.id);
    if (errPerfil) return json({ error: errPerfil.message }, 400);

    return json({ ok: true, id: creado.user.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500);
  }
});
