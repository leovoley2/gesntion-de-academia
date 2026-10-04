-- ============================================================
-- MIGRACIÓN 0009 — Cierra huecos de RLS y hace atómica la solicitud
-- de ingreso. Compatible con el frontend anterior (se puede aplicar
-- antes de desplegar la nueva versión de la app).
--
--   1. Reservas: el alumno solo puede crear reservas 'pendiente', para
--      hoy o después, y sobre un bloque de disponibilidad real y
--      habilitado del entrenador. Antes podía insertarlas ya
--      'confirmadas' (sin aprobación ni descuento de crédito) y en
--      cualquier fecha/hora.
--   2. Inscripciones: el alumno solo puede inscribirse a una clase
--      ligada a SU solicitud pendiente. Antes podía inscribirse a
--      cualquier clase grupal sin pagar.
--   3. RPCs solicitar_ingreso_academia / solicitar_paquete_personalizado:
--      matrícula + días + pago en una sola transacción. Antes eran 3
--      llamadas sueltas y un fallo a mitad dejaba una matrícula
--      'pendiente' huérfana que bloqueaba al alumno.
-- ============================================================

-- 1. Reservas ------------------------------------------------
drop policy if exists "reserva_alumno_crea" on clases_personalizadas_reservas;
create policy "reserva_alumno_crea" on clases_personalizadas_reservas
  for insert with check (
    alumno_id = auth.uid()
    and estado = 'pendiente'
    -- fecha local de Perú (current_date va en UTC y adelanta el día desde las 19:00)
    and fecha >= (now() at time zone 'America/Lima')::date
    and exists (
      select 1 from disponibilidad_entrenador d
      where d.entrenador_id = clases_personalizadas_reservas.entrenador_id
        and d.fecha       = clases_personalizadas_reservas.fecha
        and d.hora_inicio = clases_personalizadas_reservas.hora_inicio
        and d.hora_fin    = clases_personalizadas_reservas.hora_fin
        and d.habilitado
        and d.tipo = 'personalizada'
    )
  );

-- 2. Inscripciones -------------------------------------------
drop policy if exists "inscripcion_alumno_crea" on inscripciones_clase;
create policy "inscripcion_alumno_crea" on inscripciones_clase
  for insert with check (
    alumno_id = auth.uid()
    and matricula_id is not null
    and exists (
      select 1 from matriculas_membresias m
      where m.id = inscripciones_clase.matricula_id
        and m.alumno_id = auth.uid()
        and m.estado = 'pendiente'
    )
  );

-- 3. Solicitudes atómicas ------------------------------------
-- Validación común: alumno autenticado, sin otra solicitud en revisión,
-- y comprobante (si hay) dentro de su propia carpeta del bucket.
create or replace function public._validar_solicitante(p_comprobante_url text)
returns uuid
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or public.mi_rol() is distinct from 'alumno' then
    raise exception 'Solo un alumno puede enviar una solicitud de ingreso';
  end if;
  if exists (
    select 1 from matriculas_membresias
    where alumno_id = v_uid and estado = 'pendiente'
  ) then
    raise exception 'Ya tienes una solicitud en revisión';
  end if;
  if p_comprobante_url is not null and split_part(p_comprobante_url, '/', 1) <> v_uid::text then
    raise exception 'Comprobante inválido';
  end if;
  return v_uid;
end $$;

create or replace function public.solicitar_ingreso_academia(
  p_plan_id uuid,
  p_horario_ids uuid[],
  p_metodo metodo_pago,
  p_comprobante_url text default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public._validar_solicitante(p_comprobante_url);
  v_plan planes%rowtype;
  v_matricula_id uuid;
begin
  select * into v_plan from planes where id = p_plan_id and activo;
  if not found then raise exception 'Plan no disponible'; end if;

  if coalesce(cardinality(p_horario_ids), 0) = 0 then
    raise exception 'Elige al menos un día de clase';
  end if;
  if (select count(*) from horarios_clases where id = any(p_horario_ids))
     <> cardinality(array(select distinct unnest(p_horario_ids))) then
    raise exception 'Alguno de los horarios elegidos no existe';
  end if;

  insert into matriculas_membresias
    (alumno_id, tipo_membresia, estado, plan_id, clases_totales, clases_disponibles)
  values
    (v_uid, 'mensual', 'pendiente', v_plan.id, v_plan.clases_mensuales, 0)
  returning id into v_matricula_id;

  insert into inscripciones_clase (horario_clase_id, alumno_id, matricula_id)
  select distinct h, v_uid, v_matricula_id from unnest(p_horario_ids) as h
  on conflict (horario_clase_id, alumno_id) do nothing;

  -- El monto sale del catálogo, no del navegador.
  insert into pagos (alumno_id, monto, moneda, concepto, metodo_pago, estado, comprobante_url, matricula_id)
  values (v_uid, v_plan.precio_mensual, 'PEN', 'Inscripción · Plan ' || v_plan.nombre,
          p_metodo, 'pendiente', p_comprobante_url, v_matricula_id);

  return v_matricula_id;
end $$;

create or replace function public.solicitar_paquete_personalizado(
  p_sesiones integer,
  p_monto numeric,
  p_concepto text,
  p_metodo metodo_pago,
  p_comprobante_url text default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public._validar_solicitante(p_comprobante_url);
  v_matricula_id uuid;
begin
  if p_sesiones is null or p_sesiones not in (4, 8, 12) then
    raise exception 'Paquete de sesiones inválido';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'Monto inválido';
  end if;

  insert into matriculas_membresias
    (alumno_id, tipo_membresia, estado, clases_totales, clases_disponibles)
  values
    (v_uid, 'personalizado', 'pendiente', p_sesiones, p_sesiones)
  returning id into v_matricula_id;

  insert into pagos (alumno_id, monto, moneda, concepto, metodo_pago, estado, comprobante_url, matricula_id)
  values (v_uid, p_monto, 'PEN', left(p_concepto, 200), p_metodo, 'pendiente',
          p_comprobante_url, v_matricula_id);

  return v_matricula_id;
end $$;

revoke execute on function public._validar_solicitante(text) from public, anon, authenticated;
revoke execute on function public.solicitar_ingreso_academia(uuid, uuid[], metodo_pago, text) from public, anon;
revoke execute on function public.solicitar_paquete_personalizado(integer, numeric, text, metodo_pago, text) from public, anon;
grant execute on function public.solicitar_ingreso_academia(uuid, uuid[], metodo_pago, text) to authenticated;
grant execute on function public.solicitar_paquete_personalizado(integer, numeric, text, metodo_pago, text) to authenticated;
