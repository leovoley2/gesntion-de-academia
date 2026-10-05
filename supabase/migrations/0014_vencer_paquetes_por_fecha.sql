-- ============================================================
-- MIGRACIÓN 0014 — Los paquetes también vencen en su fecha de fin.
--
--   1. El vencimiento diario (pg_cron, 00:05 Perú) ahora vence TODA
--      membresía activa con fecha_fin pasada: mensualidades, paquetes
--      de clases y paquetes personalizados, aunque les queden clases.
--      El último día (fecha_fin = hoy) todavía vale. Sin fecha_fin no
--      vence. La función conserva su nombre porque la llama el cron.
--   2. Devolver un crédito (cancelar una reserva confirmada o corregir
--      una asistencia) ya no reactiva un paquete vencido por fecha: solo
--      lo reactiva si venció por quedarse sin créditos y sigue en plazo.
-- ============================================================

create or replace function public._vencer_mensualidades()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  update matriculas_membresias
  set estado = 'vencida'
  where estado = 'activa'
    and fecha_fin is not null
    and fecha_fin < (now() at time zone 'America/Lima')::date;
  get diagnostics v_n = row_count;
  return v_n;
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
    and estado in ('activa', 'vencida')
    and clases_disponibles < clases_totales
  order by fecha_fin nulls last
  limit 1
  for update;

  if v_id is null then return; end if;

  update matriculas_membresias
  set clases_disponibles = clases_disponibles + 1,
      estado = case
        when estado = 'vencida'
         and (fecha_fin is null or fecha_fin >= (now() at time zone 'America/Lima')::date)
          then 'activa'::estado_membresia
        else estado
      end
  where id = v_id;
end $$;

revoke execute on function public._vencer_mensualidades()                    from public, anon, authenticated;
revoke execute on function public.reponer_un_credito(uuid, tipo_membresia[]) from public, anon, authenticated;
