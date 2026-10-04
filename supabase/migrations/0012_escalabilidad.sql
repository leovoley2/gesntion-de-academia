-- ============================================================
-- MIGRACIÓN 0012 — Escalabilidad.
--
--   1. Métricas y reportes calculados en la BD (antes el navegador
--      descargaba todas las filas y sumaba; PostgREST corta en 1000
--      filas, así que los totales salían más bajos sin avisar). Los
--      meses se cuentan en hora de Perú.
--   2. Vencimiento de mensualidades programado a diario con pg_cron
--      (antes solo ocurría si un admin abría el panel).
--   3. Índices para las consultas por alumno, estado y claves foráneas.
-- ============================================================

-- 1. Métricas y reportes -------------------------------------
create or replace function public.metricas_admin()
returns json
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_inicio timestamptz := date_trunc('month', now() at time zone 'America/Lima') at time zone 'America/Lima';
begin
  if public.mi_rol() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede ver las métricas';
  end if;

  return json_build_object(
    'ingresosMes', coalesce((
      select sum(monto) from pagos where estado = 'aprobado' and fecha_pago >= v_inicio), 0),
    'alumnosActivos', (
      select count(distinct alumno_id) from matriculas_membresias where estado = 'activa'),
    'membresiasVencidas', (
      select count(*) from matriculas_membresias where estado = 'vencida'),
    'pagosPendientes', (
      select count(*) from pagos where estado = 'pendiente')
  );
end $$;

create or replace function public.reporte_mensual(p_anio integer, p_mes integer)
returns json
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_ini timestamptz := make_date(p_anio, p_mes, 1)::timestamp at time zone 'America/Lima';
  v_fin timestamptz := (make_date(p_anio, p_mes, 1) + interval '1 month')::timestamp at time zone 'America/Lima';
begin
  if public.mi_rol() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede ver los reportes';
  end if;

  return (
    with mes as (
      select monto, metodo_pago, concepto, estado
      from pagos
      where fecha_pago >= v_ini and fecha_pago < v_fin
    )
    select json_build_object(
      'totalAprobado',   coalesce(sum(monto) filter (where estado = 'aprobado'), 0),
      'numPagos',        count(*) filter (where estado = 'aprobado'),
      'pendientesMonto', coalesce(sum(monto) filter (where estado = 'pendiente'), 0),
      'numPendientes',   count(*) filter (where estado = 'pendiente'),
      'nuevosAlumnos', (
        select count(*) from perfiles
        where rol = 'alumno' and fecha_registro >= v_ini and fecha_registro < v_fin),
      'porMetodo', coalesce((
        select json_agg(json_build_object('metodo', metodo_pago, 'monto', total) order by total desc)
        from (select metodo_pago, sum(monto) as total from mes
              where estado = 'aprobado' group by metodo_pago) x), '[]'::json),
      'porConcepto', coalesce((
        select json_agg(json_build_object('concepto', concepto, 'monto', total) order by total desc)
        from (select concepto, sum(monto) as total from mes
              where estado = 'aprobado' group by concepto) x), '[]'::json)
    )
    from mes
  );
end $$;

revoke execute on function public.metricas_admin()                  from public, anon;
revoke execute on function public.reporte_mensual(integer, integer) from public, anon;
grant execute on function public.metricas_admin()                  to authenticated;
grant execute on function public.reporte_mensual(integer, integer) to authenticated;

-- 2. Vencimientos automáticos --------------------------------
-- Lógica interna sin chequeo de rol (la invoca pg_cron como postgres).
create or replace function public._vencer_mensualidades()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  update matriculas_membresias
  set estado = 'vencida'
  where estado = 'activa'
    and tipo_membresia = 'mensual'
    and fecha_fin is not null
    and fecha_fin < (now() at time zone 'America/Lima')::date;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.actualizar_vencimientos()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if public.mi_rol() is distinct from 'administrador'
     and public.mi_rol() is distinct from 'entrenador' then
    raise exception 'Sin permiso';
  end if;
  return public._vencer_mensualidades();
end $$;

revoke execute on function public._vencer_mensualidades() from public, anon, authenticated;

create extension if not exists pg_cron;

-- 00:05 hora de Perú (UTC-5) = 05:05 UTC.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'vencer-mensualidades') then
    perform cron.unschedule('vencer-mensualidades');
  end if;
end $$;
select cron.schedule('vencer-mensualidades', '5 5 * * *', 'select public._vencer_mensualidades()');

-- 3. Índices -------------------------------------------------
create index if not exists idx_pagos_alumno        on pagos (alumno_id, fecha_pago desc);
create index if not exists idx_pagos_matricula     on pagos (matricula_id);
create index if not exists idx_pagos_estado        on pagos (estado, fecha_pago);
create index if not exists idx_reservas_alumno     on clases_personalizadas_reservas (alumno_id, creada_en desc);
create index if not exists idx_reservas_pago       on clases_personalizadas_reservas (pago_id) where pago_id is not null;
create index if not exists idx_membresias_estado   on matriculas_membresias (estado);
create index if not exists idx_insc_matricula      on inscripciones_clase (matricula_id);
create index if not exists idx_asistencia_alumno   on control_asistencia (alumno_id);
create index if not exists idx_perfiles_rol        on perfiles (rol, nombre_completo);
create index if not exists idx_horarios_entrenador on horarios_clases (entrenador_id, dia_semana);
