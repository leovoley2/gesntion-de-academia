# Academia Vóley Playa 🏐

SPA para la gestión integral de una academia de vóley playa (Perú).
React + Vite + TypeScript + Tailwind + Supabase + TanStack Query. Mobile-first.

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar credenciales
cp .env.local.example .env.local
#    edita .env.local con tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 3. Crear el esquema en Supabase (EN ORDEN)
#    Pega en el SQL Editor, o usa `supabase db push` con la CLI:
#      supabase/migrations/0001_schema_inicial.sql
#      supabase/migrations/0002_alinear_esquema_produccion.sql   ← obligatoria
#    La 0002 crea tablas/columnas que la app usa (inscripciones_clase,
#    tarifa_personalizada, tipo de disponibilidad), los triggers de créditos,
#    el bucket de comprobantes y cierra huecos de seguridad RLS.

# 4. Desplegar las Edge Functions (gestión de usuarios del admin)
supabase functions deploy crear-usuario
supabase functions deploy eliminar-usuario

# 5. (Recomendado) Regenerar tipos desde tu proyecto real
npx supabase gen types typescript --project-id <TU_ID> > src/types/database.types.ts

# 6. Levantar
npm run dev
```

## Tests

```bash
npm test          # unitarios (Vitest, en hora de Perú): fechas, paginación,
                  # contraseñas, precio de paquetes, bloques de disponibilidad, menú
```

**Regresión de la base de datos** (`supabase/tests/regresiones.sql`): 46 casos
sobre RLS, triggers y RPC (bugs 1–6 de la auditoría, métricas/reportes,
vencimiento diario, anti-escalada de rol, qué ve cada rol). Crea sus propios usuarios y datos y
termina en `ROLLBACK`, así que se puede ejecutar contra producción sin dejar rastro:

```bash
psql "$DATABASE_URL" -f supabase/tests/regresiones.sql
```

(o pegarlo en el SQL Editor de Supabase). La primera fila del resultado dice
`TODO OK` o `FALLA`. Ejecútala después de cada migración.

## Estado del proyecto Supabase "gestion" (2026-07-04)

La base de datos del proyecto **gestion** ya está alineada con la app:

- [x] Esquema completo (tablas, columnas, índices únicos, bucket `comprobantes`).
- [x] Triggers de créditos conectados y probados (confirmar/cancelar reserva y asistencia).
- [x] Trigger anti-escalada de rol probado (un alumno no puede hacerse admin).
- [x] Edge Functions `crear-usuario` y `eliminar-usuario` desplegadas y activas.
- [ ] Pendiente (dashboard, no SQL): Supabase → Auth → Passwords → activar
      **Leaked password protection** (aviso del linter de seguridad).

## Checklist para un proyecto nuevo

- [ ] Aplicar en orden `0001`, `0002` y `0003` (verifica en el Table Editor que existan `inscripciones_clase` y el bucket `comprobantes`).
- [ ] Edge Functions `crear-usuario` y `eliminar-usuario` desplegadas.
- [ ] Primer administrador creado: regístralo (o créalo en Auth) y luego en SQL:
      `update perfiles set rol = 'administrador' where id = '<uuid-del-usuario>';`
      (a partir de ahí, los demás usuarios se crean desde la app).
- [ ] En Supabase → Auth → Providers: desactivar signups públicos si solo el admin da de alta usuarios.
- [ ] `.env.local` solo contiene la **anon key** (nunca la service_role).
- [ ] `npm run build` limpio y deploy del contenido de `dist/` (Vercel/Netlify) con las mismas variables `VITE_*` configuradas en el hosting.

## Estructura

```
src/
├── lib/            supabaseClient, queryClient
├── context/        AuthContext (sesión + perfil + rol)
├── routes/         ProtectedRoute, RoleRoute (guards)
├── components/     ui/ (reutilizables) + layout/ (AppShell, BottomNav)
├── features/       auth, dashboard, asistencia, pagos, membresias, reservas
│                   cada feature: components/ + pages/ + api/ + hooks/
└── types/          database.types.ts
```

## Roles y vistas

| Rol | Ve |
|-----|----|
| administrador | Finanzas, pagos, membresías, reportes |
| entrenador | Su agenda, toma de asistencia, su disponibilidad |
| alumno | Sus clases, estado de cuenta, reserva de clases |

## Lógica de negocio en el servidor (migración 0002)
- Confirmar una reserva descuenta 1 crédito del paquete del alumno; cancelarla lo repone (triggers en BD, no en el cliente).
- Marcar `asistio` descuenta crédito; corregir la marca lo repone. Si el alumno es de plan mensual (sin paquete), no se bloquea nada.
- Doble reserva del mismo bloque bloqueada por índice único (la app muestra "Ese horario ya fue reservado").
- Un usuario NO puede cambiarse su propio rol (trigger anti-escalada).
# gesntion-de-academia
