-- ============================================================
-- MIGRACIÓN 0006 — YA APLICADA AL PROYECTO "gestion" (2026-07-05)
-- FASE 2: renovación de mensualidades + vencimiento automático.
-- ============================================================

-- Renueva un mes la membresía (solo admin). Si el pago viene vinculado, lo aprueba.
create or replace function public.renovar_membresia(p_matricula_id uuid, p_pago_id uuid default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_m matriculas_membresias%rowtype;
begin
  if public.mi_rol() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede renovar membresías';
  end if;

  select * into v_m from matriculas_membresias where id = p_matricula_id for update;
  if not found then raise exception 'Membresía no encontrada'; end if;
  if v_m.tipo_membresia <> 'mensual' then
    raise exception 'Solo se renuevan membresías mensuales (los paquetes se compran de nuevo)';
  end if;
  if v_m.estado = 'pendiente' then
    raise exception 'Esta solicitud aún no fue aprobada; usa "Nuevos ingresos"';
  end if;

  update matriculas_membresias
  set estado = 'activa',
      -- si renueva antes de vencer, suma desde el vencimiento; si ya venció, desde hoy
      fecha_fin = (greatest(coalesce(fecha_fin, current_date), current_date) + interval '1 month')::date
  where id = p_matricula_id;

  if p_pago_id is not null then
    update pagos set estado = 'aprobado' where id = p_pago_id;
  end if;
end $$;

-- Marca vencidas las mensualidades caducadas. La llama el panel admin al
-- cargar métricas. Devuelve cuántas venció.
create or replace function public.actualizar_vencimientos()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  if public.mi_rol() not in ('administrador', 'entrenador') then
    raise exception 'Sin permiso';
  end if;

  update matriculas_membresias
  set estado = 'vencida'
  where estado = 'activa'
    and tipo_membresia = 'mensual'
    and fecha_fin is not null
    and fecha_fin < current_date;

  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke execute on function public.renovar_membresia(uuid, uuid) from public, anon;
revoke execute on function public.actualizar_vencimientos()     from public, anon;
