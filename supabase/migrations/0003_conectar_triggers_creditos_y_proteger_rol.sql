-- ============================================================
-- MIGRACIÓN 0003 — YA APLICADA AL PROYECTO "gestion" (2026-07-04)
-- Copia local de lo ejecutado vía MCP. En un proyecto nuevo se
-- ejecuta después de 0001 y 0002 y es autocontenida.
--
-- Qué hace:
--   1. Funciones de créditos con firma (alumno, tipos[]) — la
--      versión desplegada en "gestion" — y variante tolerante que
--      NO bloquea a alumnos sin paquete (plan mensual / pago por
--      sesión).
--   2. CONECTA los triggers de créditos: en "gestion" las funciones
--      existían pero ningún trigger estaba enganchado a su tabla,
--      así que confirmar reservas o marcar asistencia no movía
--      créditos.
--   3. Trigger anti-escalada: la política perfil_propio_update
--      permitía a un usuario cambiarse su propio `rol`.
--   4. Hardening del linter: search_path fijo y revocación de
--      EXECUTE en funciones internas.
-- ============================================================

-- 1. Funciones de créditos -----------------------------------
create or replace function public.descontar_un_credito(p_alumno_id uuid, p_tipos tipo_membresia[])
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  select id into v_id
  from matriculas_membresias
  where alumno_id = p_alumno_id and estado = 'activa'
    and tipo_membresia = any(p_tipos) and clases_disponibles > 0
  order by fecha_fin nulls last limit 1 for update;

  if v_id is null then
    raise exception 'El alumno no tiene créditos disponibles para este tipo de clase';
  end if;

  update matriculas_membresias
  set clases_disponibles = clases_disponibles - 1,
      estado = case when clases_disponibles - 1 = 0 then 'vencida'::estado_membresia else estado end
  where id = v_id;
end $$;

create or replace function public.reponer_un_credito(p_alumno_id uuid, p_tipos tipo_membresia[])
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  select id into v_id
  from matriculas_membresias
  where alumno_id = p_alumno_id
    and tipo_membresia = any(p_tipos)
    and clases_disponibles < clases_totales
  order by fecha_fin nulls last limit 1 for update;

  if v_id is null then return; end if;

  update matriculas_membresias
  set clases_disponibles = clases_disponibles + 1,
      estado = case when estado = 'vencida' then 'activa'::estado_membresia else estado end
  where id = v_id;
end $$;

-- Variante tolerante: los triggers la usan para no bloquear a
-- alumnos de plan mensual (sin paquete de créditos).
create or replace function public.descontar_credito_si_aplica(p_alumno_id uuid, p_tipos tipo_membresia[])
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  select id into v_id
  from matriculas_membresias
  where alumno_id = p_alumno_id and estado = 'activa'
    and tipo_membresia = any(p_tipos) and clases_disponibles > 0
  order by fecha_fin nulls last limit 1 for update;

  if v_id is null then return false; end if;

  update matriculas_membresias
  set clases_disponibles = clases_disponibles - 1,
      estado = case when clases_disponibles - 1 = 0 then 'vencida'::estado_membresia else estado end
  where id = v_id;
  return true;
end $$;

-- 2. Funciones de trigger + conexión a las tablas -------------
create or replace function public.trg_reserva_credito()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.estado = 'confirmada' and old.estado is distinct from 'confirmada' then
    perform public.descontar_credito_si_aplica(
      new.alumno_id, array['paquete_clases','personalizado']::public.tipo_membresia[]);
  elsif new.estado = 'cancelada' and old.estado = 'confirmada' then
    perform public.reponer_un_credito(
      new.alumno_id, array['paquete_clases','personalizado']::public.tipo_membresia[]);
  end if;
  return new;
end $$;

create or replace function public.trg_asistencia_credito()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado = 'asistio' then
      perform public.descontar_credito_si_aplica(
        new.alumno_id, array['paquete_clases','personalizado']::public.tipo_membresia[]);
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.estado = 'asistio' and old.estado is distinct from 'asistio' then
      perform public.descontar_credito_si_aplica(
        new.alumno_id, array['paquete_clases','personalizado']::public.tipo_membresia[]);
    elsif old.estado = 'asistio' and new.estado is distinct from 'asistio' then
      perform public.reponer_un_credito(
        new.alumno_id, array['paquete_clases','personalizado']::public.tipo_membresia[]);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.estado = 'asistio' then
      perform public.reponer_un_credito(
        old.alumno_id, array['paquete_clases','personalizado']::public.tipo_membresia[]);
    end if;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists reserva_creditos on clases_personalizadas_reservas;
create trigger reserva_creditos
  before update of estado on clases_personalizadas_reservas
  for each row
  when (old.estado is distinct from new.estado)
  execute function public.trg_reserva_credito();

drop trigger if exists asistencia_creditos on control_asistencia;
create trigger asistencia_creditos
  before insert or update of estado or delete on control_asistencia
  for each row execute function public.trg_asistencia_credito();

-- 3. Anti-escalada de rol -------------------------------------
create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new; -- contexto de servidor (service_role / Edge Functions)
  end if;
  if new.rol is distinct from old.rol and public.mi_rol() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede cambiar el rol';
  end if;
  return new;
end $$;

drop trigger if exists proteger_perfil on perfiles;
create trigger proteger_perfil
  before update on perfiles
  for each row execute function public.proteger_campos_perfil();

-- 4. Hardening (avisos del linter de Supabase) ----------------
revoke execute on function public.descontar_un_credito(uuid, tipo_membresia[])        from public, anon, authenticated;
revoke execute on function public.reponer_un_credito(uuid, tipo_membresia[])          from public, anon, authenticated;
revoke execute on function public.descontar_credito_si_aplica(uuid, tipo_membresia[]) from public, anon, authenticated;
revoke execute on function public.proteger_campos_perfil()                            from public, anon, authenticated;
revoke execute on function public.trg_reserva_credito()                               from public, anon, authenticated;
revoke execute on function public.trg_asistencia_credito()                            from public, anon, authenticated;
revoke execute on function public.handle_new_user()                                   from public, anon, authenticated;

-- Solo existe en el proyecto "gestion" (antispam de reservas);
-- en instalaciones nuevas se omite sin fallar.
do $$ begin
  if to_regprocedure('public.trg_limite_reservas_pendientes()') is not null then
    alter function public.trg_limite_reservas_pendientes() set search_path = public, pg_temp;
    revoke execute on function public.trg_limite_reservas_pendientes() from public, anon, authenticated;
  end if;
end $$;

-- Nota: mi_rol() queda ejecutable por authenticated a propósito:
-- las políticas RLS la evalúan en cada consulta del usuario y solo
-- devuelve el rol del propio solicitante (null para anon).
