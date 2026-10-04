-- ============================================================
-- MIGRACIÓN 0010 — Créditos separados por tipo de clase y precio
-- del paquete personalizado calculado en el servidor.
--
--   1. Antes, marcar asistencia a una clase GRUPAL descontaba de
--      cualquier membresía con créditos, incluido un paquete de
--      sesiones PERSONALIZADAS (y al revés con las reservas). Ahora:
--        · asistencia a clase grupal  → solo 'paquete_clases'
--        · reserva personalizada      → solo 'personalizado'
--      Además reponer un crédito solo toca membresías activas o
--      vencidas (no pendientes ni congeladas).
--   2. solicitar_paquete_personalizado ya no recibe el monto: lo
--      calcula con tarifas_entrenador + descuento del paquete. Se
--      retira la política que dejaba al alumno insertar matrículas
--      a mano (con créditos a su gusto); ahora solo entra por RPC.
-- ============================================================

-- 1. Créditos por tipo ---------------------------------------
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
    and estado in ('activa', 'vencida')
    and clases_disponibles < clases_totales
  order by fecha_fin nulls last
  limit 1
  for update;

  if v_id is null then return; end if;

  update matriculas_membresias
  set clases_disponibles = clases_disponibles + 1,
      estado = case when estado = 'vencida' then 'activa'::estado_membresia else estado end
  where id = v_id;
end $$;

create or replace function public.trg_reserva_credito()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.estado = 'confirmada' and old.estado is distinct from 'confirmada' then
    perform public.descontar_credito_si_aplica(
      new.alumno_id, array['personalizado']::public.tipo_membresia[]);
  elsif new.estado = 'cancelada' and old.estado = 'confirmada' then
    perform public.reponer_un_credito(
      new.alumno_id, array['personalizado']::public.tipo_membresia[]);
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
        new.alumno_id, array['paquete_clases']::public.tipo_membresia[]);
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.estado = 'asistio' and old.estado is distinct from 'asistio' then
      perform public.descontar_credito_si_aplica(
        new.alumno_id, array['paquete_clases']::public.tipo_membresia[]);
    elsif old.estado = 'asistio' and new.estado is distinct from 'asistio' then
      perform public.reponer_un_credito(
        new.alumno_id, array['paquete_clases']::public.tipo_membresia[]);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.estado = 'asistio' then
      perform public.reponer_un_credito(
        old.alumno_id, array['paquete_clases']::public.tipo_membresia[]);
    end if;
    return old;
  end if;
  return null;
end $$;

-- 2. Precio del paquete en el servidor -----------------------
-- Descuentos por paquete (mismos que PAQUETES en planes.api.ts).
create or replace function public.precio_paquete(
  p_entrenador_id uuid,
  p_modalidad modalidad_personalizada,
  p_sesiones integer
)
returns numeric
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_tarifa numeric; v_desc numeric;
begin
  v_desc := case p_sesiones when 4 then 0.05 when 8 then 0.10 when 12 then 0.15 end;
  if v_desc is null then raise exception 'Paquete de sesiones inválido'; end if;

  select t.precio_por_atleta into v_tarifa
  from tarifas_entrenador t
  join perfiles p on p.id = t.entrenador_id and p.rol = 'entrenador'
  where t.entrenador_id = p_entrenador_id and t.modalidad = p_modalidad;
  if v_tarifa is null or v_tarifa <= 0 then
    raise exception 'El entrenador no tiene tarifa para esa modalidad';
  end if;

  return round(v_tarifa * p_sesiones * (1 - v_desc));
end $$;

drop function if exists public.solicitar_paquete_personalizado(integer, numeric, text, metodo_pago, text);

create or replace function public.solicitar_paquete_personalizado(
  p_entrenador_id uuid,
  p_modalidad modalidad_personalizada,
  p_sesiones integer,
  p_metodo metodo_pago,
  p_comprobante_url text default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := public._validar_solicitante(p_comprobante_url);
  v_monto numeric := public.precio_paquete(p_entrenador_id, p_modalidad, p_sesiones);
  v_entrenador text;
  v_etiqueta text;
  v_matricula_id uuid;
begin
  select nombre_completo into v_entrenador from perfiles where id = p_entrenador_id;
  v_etiqueta := case p_modalidad
    when 'individual' then 'Individual' when 'duo' then 'Dúo'
    when 'grupo3' then 'Grupo de 3' when 'grupo4' then 'Grupo de 4' end;

  insert into matriculas_membresias
    (alumno_id, tipo_membresia, estado, clases_totales, clases_disponibles)
  values
    (v_uid, 'personalizado', 'pendiente', p_sesiones, p_sesiones)
  returning id into v_matricula_id;

  insert into pagos (alumno_id, monto, moneda, concepto, metodo_pago, estado, comprobante_url, matricula_id)
  values (v_uid, v_monto, 'PEN',
          format('Paquete %s sesiones %s · %s', p_sesiones, v_etiqueta, v_entrenador),
          p_metodo, 'pendiente', p_comprobante_url, v_matricula_id);

  return v_matricula_id;
end $$;

-- Las matrículas del alumno solo nacen vía RPC (créditos fijados por el servidor).
drop policy if exists "membresia_alumno_solicita" on matriculas_membresias;

revoke execute on function public.precio_paquete(uuid, modalidad_personalizada, integer) from public, anon;
grant execute on function public.precio_paquete(uuid, modalidad_personalizada, integer) to authenticated;
revoke execute on function public.solicitar_paquete_personalizado(uuid, modalidad_personalizada, integer, metodo_pago, text) from public, anon;
grant execute on function public.solicitar_paquete_personalizado(uuid, modalidad_personalizada, integer, metodo_pago, text) to authenticated;
revoke execute on function public.reponer_un_credito(uuid, tipo_membresia[]) from public, anon, authenticated;
revoke execute on function public.trg_reserva_credito()    from public, anon, authenticated;
revoke execute on function public.trg_asistencia_credito() from public, anon, authenticated;
