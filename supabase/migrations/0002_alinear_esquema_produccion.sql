-- ============================================================
-- MIGRACIÓN 0002 — ALINEAR ESQUEMA CON LA APP (producción)
-- Ejecutar DESPUÉS de 0001_schema_inicial.sql.
--
-- Qué corrige:
--   1. Columnas/tablas que el frontend ya usa y faltaban en la BD:
--      perfiles.tarifa_personalizada, disponibilidad_entrenador.tipo,
--      tabla inscripciones_clase.
--   2. Índices únicos que el código asume (upsert de disponibilidad,
--      error 23505 anti doble-reserva).
--   3. Triggers de créditos (confirmar/cancelar reserva, asistencia).
--   4. Seguridad: bloqueo de auto-escalada de rol, políticas RLS que
--      faltaban (admin edita perfiles, alumno registra su pago,
--      alumnos ven la lista de entrenadores), search_path fijo en
--      funciones SECURITY DEFINER y revocación de RPC de créditos.
--   5. Bucket privado `comprobantes` en Storage con sus políticas.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TIPOS Y COLUMNAS QUE FALTABAN
-- ------------------------------------------------------------
do $$ begin
  create type tipo_disponibilidad as enum ('academia', 'personalizada');
exception when duplicate_object then null; end $$;

alter table perfiles
  add column if not exists tarifa_personalizada numeric(8,2) not null default 0
    check (tarifa_personalizada >= 0);

alter table disponibilidad_entrenador
  add column if not exists tipo tipo_disponibilidad not null default 'personalizada';

-- Inscripciones de alumnos a clases grupales (usada por horarios y asistencia)
create table if not exists inscripciones_clase (
  id                 uuid primary key default gen_random_uuid(),
  horario_clase_id   uuid not null references horarios_clases(id) on delete cascade,
  alumno_id          uuid not null references perfiles(id)        on delete cascade,
  fecha_inscripcion  timestamptz not null default now(),
  unique (horario_clase_id, alumno_id)
);
create index if not exists idx_inscripciones_alumno on inscripciones_clase(alumno_id);

-- ------------------------------------------------------------
-- 2. ÍNDICES ÚNICOS QUE EL CÓDIGO ASUME
-- ------------------------------------------------------------
-- crearBloquesLote hace upsert con onConflict: 'entrenador_id,fecha,hora_inicio'
create unique index if not exists uq_disponibilidad_bloque
  on disponibilidad_entrenador (entrenador_id, fecha, hora_inicio);

-- crearReserva espera 23505 si el bloque ya está tomado (solo cuentan
-- las reservas vivas; una cancelada libera el horario).
create unique index if not exists uq_reserva_bloque
  on clases_personalizadas_reservas (entrenador_id, fecha, hora_inicio)
  where estado in ('pendiente', 'confirmada');

-- ------------------------------------------------------------
-- 3. FUNCIONES DE CRÉDITOS + TRIGGERS
-- ------------------------------------------------------------
-- Recrear con search_path fijo (recomendación de seguridad para
-- SECURITY DEFINER) y variante tolerante para los triggers:
-- si el alumno no tiene paquete de créditos (p. ej. plan mensual o
-- clase pagada por sesión) NO se bloquea la operación.
create or replace function public.descontar_credito_si_aplica(p_alumno_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membresia_id uuid;
begin
  select id into v_membresia_id
  from matriculas_membresias
  where alumno_id = p_alumno_id
    and estado = 'activa'
    and tipo_membresia in ('paquete_clases', 'personalizado')
    and clases_disponibles > 0
  order by fecha_fin nulls last
  limit 1
  for update;

  if v_membresia_id is null then
    return false;
  end if;

  update matriculas_membresias
  set clases_disponibles = clases_disponibles - 1,
      estado = case when clases_disponibles - 1 = 0 then 'vencida'::estado_membresia else estado end
  where id = v_membresia_id;
  return true;
end;
$$;

create or replace function public.reponer_credito_clase(p_alumno_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membresia_id uuid;
begin
  select id into v_membresia_id
  from matriculas_membresias
  where alumno_id = p_alumno_id
    and tipo_membresia in ('paquete_clases', 'personalizado')
    and clases_disponibles < clases_totales
    and estado in ('activa', 'vencida')
  order by fecha_fin desc nulls last
  limit 1
  for update;

  if v_membresia_id is null then
    return false;
  end if;

  update matriculas_membresias
  set clases_disponibles = clases_disponibles + 1,
      estado = case
        when estado = 'vencida' and (fecha_fin is null or fecha_fin >= current_date)
          then 'activa'::estado_membresia
        else estado
      end
  where id = v_membresia_id;
  return true;
end;
$$;

-- La versión estricta de 0001 queda con search_path fijo por si se usa vía RPC.
create or replace function public.descontar_credito_clase(p_alumno_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.descontar_credito_si_aplica(p_alumno_id) then
    raise exception 'El alumno no tiene créditos disponibles';
  end if;
end;
$$;

-- Estas funciones son lógica interna: ningún cliente debe poder invocarlas
-- vía PostgREST (podrían descontar/reponer créditos de terceros).
revoke execute on function public.descontar_credito_clase(uuid)    from public, anon, authenticated;
revoke execute on function public.descontar_credito_si_aplica(uuid) from public, anon, authenticated;
revoke execute on function public.reponer_credito_clase(uuid)       from public, anon, authenticated;

-- Trigger: confirmar una reserva descuenta crédito; cancelar una confirmada lo repone.
create or replace function public.trg_reserva_creditos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'confirmada' and old.estado = 'pendiente' then
    perform public.descontar_credito_si_aplica(new.alumno_id);
  elsif new.estado = 'cancelada' and old.estado = 'confirmada' then
    perform public.reponer_credito_clase(new.alumno_id);
  end if;
  return new;
end;
$$;

drop trigger if exists reserva_creditos on clases_personalizadas_reservas;
create trigger reserva_creditos
  before update of estado on clases_personalizadas_reservas
  for each row
  when (old.estado is distinct from new.estado)
  execute function public.trg_reserva_creditos();

-- Trigger: marcar 'asistio' descuenta crédito; corregir la marca lo repone.
create or replace function public.trg_asistencia_creditos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado = 'asistio' then
      perform public.descontar_credito_si_aplica(new.alumno_id);
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.estado = 'asistio' and old.estado <> 'asistio' then
      perform public.descontar_credito_si_aplica(new.alumno_id);
    elsif old.estado = 'asistio' and new.estado <> 'asistio' then
      perform public.reponer_credito_clase(new.alumno_id);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.estado = 'asistio' then
      perform public.reponer_credito_clase(old.alumno_id);
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists asistencia_creditos on control_asistencia;
create trigger asistencia_creditos
  before insert or update of estado or delete on control_asistencia
  for each row execute function public.trg_asistencia_creditos();

-- ------------------------------------------------------------
-- 4. SEGURIDAD / RLS
-- ------------------------------------------------------------
-- search_path fijo también en las funciones de 0001.
create or replace function public.mi_rol()
returns rol_usuario
language sql stable security definer
set search_path = public
as $$ select rol from perfiles where id = auth.uid() $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into perfiles (id, nombre_completo, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre_completo', 'Nuevo usuario'), 'alumno');
  return new;
end;
$$;

-- 4a. ANTI-ESCALADA: la política de 0001 permitía a cualquier usuario
-- editar su propia fila COMPLETA, incluido `rol` (un alumno podía
-- hacerse administrador con una llamada a la API). Un trigger protege
-- los campos sensibles; las operaciones de servidor (Edge Functions
-- con service_role, sin auth.uid()) no se ven afectadas.
create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- contexto de servidor (service_role / SQL directo)
  end if;
  if new.rol is distinct from old.rol and public.mi_rol() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede cambiar el rol';
  end if;
  if new.tarifa_personalizada is distinct from old.tarifa_personalizada
     and auth.uid() <> old.id
     and public.mi_rol() is distinct from 'administrador' then
    raise exception 'No puedes cambiar la tarifa de otro usuario';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_perfil on perfiles;
create trigger proteger_perfil
  before update on perfiles
  for each row execute function public.proteger_campos_perfil();

-- 4b. Lectura de perfiles: 0001 solo dejaba ver el perfil propio, con lo
-- que el alumno no podía listar entrenadores (reservas rotas) ni el
-- entrenador ver nombres de alumnos (solicitudes/asistencia rotas).
drop policy if exists "perfil_propio_lectura" on perfiles;
create policy "perfiles_lectura" on perfiles
  for select using (
    auth.uid() = id
    or rol = 'entrenador'                              -- todos ven a los entrenadores
    or mi_rol() in ('entrenador', 'administrador')     -- el staff ve a todos
  );

-- 4c. El admin necesita editar cualquier perfil (gestión de usuarios).
drop policy if exists "perfil_admin_update" on perfiles;
create policy "perfil_admin_update" on perfiles
  for update using (mi_rol() = 'administrador')
  with check (mi_rol() = 'administrador');

-- 4d. El alumno registra su propio pago (siempre nace 'pendiente';
-- aprobar sigue siendo exclusivo del admin).
drop policy if exists "pagos_alumno_crea" on pagos;
create policy "pagos_alumno_crea" on pagos
  for insert with check (alumno_id = auth.uid() and estado = 'pendiente');

-- 4e. RLS de la tabla nueva.
alter table inscripciones_clase enable row level security;

drop policy if exists "inscripcion_lectura" on inscripciones_clase;
create policy "inscripcion_lectura" on inscripciones_clase
  for select using (
    alumno_id = auth.uid() or mi_rol() in ('entrenador', 'administrador')
  );

drop policy if exists "inscripcion_gestion" on inscripciones_clase;
create policy "inscripcion_gestion" on inscripciones_clase
  for all using (mi_rol() in ('entrenador', 'administrador'))
  with check (mi_rol() in ('entrenador', 'administrador'));

-- ------------------------------------------------------------
-- 5. STORAGE: bucket privado para comprobantes de pago
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/*', 'application/pdf'])
on conflict (id) do nothing;

-- Cada alumno sube a su carpeta (<uid>/archivo) y solo lee lo suyo;
-- el admin puede ver todos los comprobantes.
drop policy if exists "comprobante_sube_propio" on storage.objects;
create policy "comprobante_sube_propio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "comprobante_lectura" on storage.objects;
create policy "comprobante_lectura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.mi_rol() = 'administrador')
  );
