# Seguridad y cumplimiento — Arena Voleibol Club

Resumen del modelo de seguridad de la app y las acciones que quedan pendientes
en el panel de Supabase (no se pueden automatizar desde el código).

## Lo que ya está implementado (código + base de datos)

- **Row Level Security (RLS)** activo en todas las tablas: cada usuario solo
  accede a lo suyo. Los alumnos no pueden leer datos de otros alumnos; el staff
  ve lo necesario para su función; solo el admin gestiona pagos, planes y usuarios.
- **Anti-escalada de rol**: un trigger impide que un usuario se cambie su propio
  `rol` (p. ej. un alumno no puede hacerse administrador).
- **Funciones internas blindadas**: `search_path` fijo y `EXECUTE` revocado para
  clientes en toda la lógica interna (créditos, triggers, alta de usuarios).
- **service_role solo en el servidor**: crear/eliminar usuarios pasa por Edge
  Functions que verifican que quien llama sea admin. La `anon key` del cliente es
  pública por diseño; el `.env.local` está en `.gitignore` (no se sube a git).
- **Storage privado**: los comprobantes de pago viven en un bucket privado; cada
  alumno sube/lee solo su carpeta y el admin ve todos. URLs firmadas temporales.
- **Contraseña mínima 8 caracteres** en registro y alta de usuarios.
- **Consentimiento legal**: al registrarse se exige aceptar Términos y Privacidad;
  la aceptación (versión + fecha) se guarda en la tabla `consentimientos` como
  constancia (Ley N° 29733).

## Pendiente: activar en el panel de Supabase (2 minutos)

Entra a https://supabase.com/dashboard/project/qsflpztuebiqtfdispid

1. **Authentication → Policies/Passwords → Leaked password protection: ON.**
   Rechaza contraseñas filtradas (comprobadas contra HaveIBeenPwned).
2. **Authentication → Passwords → Minimum length: 8** (o más) y, si está
   disponible, exigir letras + números.
3. **Bot/abuso — CAPTCHA:** Authentication → Settings → Enable **CAPTCHA
   protection** (Cloudflare Turnstile o hCaptcha). Evita registros masivos de
   bots en el formulario público. Tras activarlo, hay que pasar el token en el
   `signUp`/`signInWithPassword` del cliente (avísame y lo cableo).
4. **Rate limits:** Authentication → Rate Limits — deja o baja los límites de
   emails/OTP e intentos de inicio de sesión por hora.
5. **URLs permitidas:** Authentication → URL Configuration — pon el **Site URL**
   y agrega solo tus dominios en **Redirect URLs** (cuando hagas el deploy).
6. **MFA para administradores (recomendado):** activa MFA/2FA para las cuentas de
   administrador desde Authentication.

## Notas del linter de seguridad

Las advertencias "SECURITY DEFINER function executable" sobre `mi_rol`,
`aprobar_ingreso`, `rechazar_ingreso`, `renovar_membresia` y
`actualizar_vencimientos` son **esperadas y seguras**: son la función que usan
las reglas RLS y los RPC de administrador que se auto-verifican por dentro
(lanzan error si quien llama no es admin). No pueden revocarse sin romper el
funcionamiento. Ver comentario en `migrations/0007_...sql`.

## Correo de confirmación con la marca

La plantilla HTML está en `supabase/email-templates/confirmar-cuenta.html`.
Para activarla: Supabase → Authentication → Emails → Templates → **Confirm
signup**, pon el asunto sugerido y pega el HTML. (No se puede automatizar desde
el código; es una configuración del panel.)

## Cumplimiento de datos (Perú — Ley N° 29733)

- Términos y Política de Privacidad publicados en la app (`/terminos`, `/privacidad`).
- **Revisar con un abogado** antes del lanzamiento definitivo y **confirmar los
  datos de contacto** en `src/features/legal/version.ts` (email y WhatsApp).
- Evaluar la **inscripción del banco de datos personales** ante la Autoridad
  Nacional de Protección de Datos Personales si corresponde.
- Al cambiar el texto legal, sube `TERMINOS_VERSION` para que se registre un
  nuevo consentimiento.
