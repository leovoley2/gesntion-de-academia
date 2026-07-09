# Publicar la app (producción)

La app es un sitio estático (Vite + React). Se publica subiendo la carpeta
`dist/` a un hosting. Recomendado: **Vercel** o **Netlify** (ambos gratis para
este tamaño y con HTTPS automático).

## Variables de entorno (obligatorias en el hosting)

En el panel del hosting, sección *Environment Variables*, agrega:

- `VITE_SUPABASE_URL` = `https://qsflpztuebiqtfdispid.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = tu anon key (Supabase → Project Settings → API)

> Solo la **anon key** (pública). Nunca subas la service_role.

## Opción A — Vercel (recomendada)

1. Sube el proyecto a GitHub (o usa la CLI `vercel`).
2. En vercel.com → *Add New Project* → importa el repo.
3. Framework: **Vite** (se detecta solo). Build: `npm run build`. Output: `dist`.
4. Agrega las 2 variables de entorno de arriba.
5. Deploy. Te da una URL `https://arena-voleibol.vercel.app` (o tu dominio).

El archivo `vercel.json` ya deja configurado el enrutado SPA.

## Opción B — Netlify

1. netlify.com → *Add new site* → conecta el repo (o arrastra la carpeta `dist/`).
2. Build: `npm run build`. Publish directory: `dist`.
3. Agrega las 2 variables de entorno.
4. Deploy.

El archivo `netlify.toml` ya configura build, publish y el enrutado SPA.

## Después del primer deploy

1. **Supabase → Authentication → URL Configuration:**
   - *Site URL*: la URL pública del hosting (ej. `https://arena-voleibol.vercel.app`).
   - *Redirect URLs*: agrega esa misma URL.
2. Revisa el checklist de `SEGURIDAD.md` (protección de contraseñas, etc.).
3. Carga tus datos reales: sedes, horarios de clases y el primer administrador.
4. Prueba el registro de un atleta desde el celular con la URL pública.

## Actualizaciones futuras

Cada vez que cambie el código, `git push` (Vercel/Netlify redeploya solo) o
`npm run build` + volver a subir `dist/`.
