-- ============================================================
-- MIGRACIÓN 0007 — YA APLICADA AL PROYECTO "gestion" (2026-07-05)
-- Seguridad + blindaje legal (Ley N° 29733, Perú).
-- ============================================================

-- 1. Reducir superficie: mi_rol() no necesita ser invocable por anónimos.
revoke execute on function public.mi_rol() from anon;

-- 2. Registro de consentimiento de Términos y Política de Privacidad
--    (rastro de auditoría: quién, qué versión, cuándo).
create table if not exists consentimientos (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references perfiles(id) on delete cascade,
  documento    text not null default 'terminos_y_privacidad',
  version      text not null,
  aceptado_en  timestamptz not null default now()
);
create index if not exists idx_consentimientos_usuario on consentimientos(usuario_id);

alter table consentimientos enable row level security;

drop policy if exists "consent_lectura" on consentimientos;
create policy "consent_lectura" on consentimientos
  for select using (usuario_id = auth.uid() or mi_rol() = 'administrador');

drop policy if exists "consent_propio_insert" on consentimientos;
create policy "consent_propio_insert" on consentimientos
  for insert with check (usuario_id = auth.uid());

-- 3. handle_new_user registra el consentimiento desde los metadatos del signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into perfiles (id, nombre_completo, telefono, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre_completo', 'Nuevo usuario'),
    nullif(new.raw_user_meta_data->>'telefono', ''),
    'alumno'
  );

  if coalesce(new.raw_user_meta_data->>'terminos_version', '') <> '' then
    insert into consentimientos (usuario_id, documento, version)
    values (new.id, 'terminos_y_privacidad', new.raw_user_meta_data->>'terminos_version');
  end if;

  return new;
end $$;

-- NOTA sobre el linter de seguridad de Supabase:
-- Las advertencias "SECURITY DEFINER function executable" sobre mi_rol(),
-- aprobar_ingreso, rechazar_ingreso, renovar_membresia y actualizar_vencimientos
-- son ESPERADAS y seguras:
--   * mi_rol() debe ser ejecutable por 'authenticated' porque las políticas RLS
--     lo evalúan en cada consulta; solo devuelve el rol del propio solicitante.
--   * Los RPC de admin se llaman desde la app como usuario autenticado y se
--     auto-autorizan por dentro (raise si mi_rol() <> 'administrador').
-- No se pueden revocar sin romper RLS o la gestión del admin.
