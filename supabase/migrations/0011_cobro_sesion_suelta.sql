-- ============================================================
-- MIGRACIÓN 0011 — Una reserva confirmada sin créditos ya no sale gratis.
--
-- Al confirmar una reserva personalizada:
--   · si el alumno tiene créditos 'personalizado' → se descuenta uno (igual que antes);
--   · si no → se genera un pago 'pendiente' por la sesión suelta (tarifa
--     del entrenador para la modalidad) y queda enlazado en `pago_id`.
-- Al cancelar una reserva confirmada:
--   · si se cobró como sesión suelta → se borra ese pago si sigue pendiente
--     (si ya estaba aprobado se conserva: el reembolso es manual);
--   · si consumió crédito → se repone (igual que antes).
-- ============================================================

alter table clases_personalizadas_reservas
  add column if not exists pago_id uuid references pagos(id) on delete set null;

create or replace function public.trg_reserva_credito()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_precio numeric; v_entrenador text; v_pago_id uuid;
begin
  if new.estado = 'confirmada' and old.estado is distinct from 'confirmada' then
    if not public.descontar_credito_si_aplica(
         new.alumno_id, array['personalizado']::public.tipo_membresia[]) then
      select t.precio_por_atleta into v_precio
      from tarifas_entrenador t
      where t.entrenador_id = new.entrenador_id and t.modalidad = new.modalidad;
      if v_precio is null or v_precio <= 0 then
        raise exception 'El alumno no tiene créditos y el entrenador no tiene tarifa para la modalidad %; fija la tarifa en Tarifas antes de confirmar', new.modalidad;
      end if;

      select nombre_completo into v_entrenador from perfiles where id = new.entrenador_id;

      insert into pagos (alumno_id, monto, moneda, concepto, metodo_pago, estado)
      values (new.alumno_id, v_precio, 'PEN',
              format('Sesión personalizada %s · %s %s · %s',
                     case new.modalidad
                       when 'individual' then 'Individual' when 'duo' then 'Dúo'
                       when 'grupo3' then 'Grupo de 3' when 'grupo4' then 'Grupo de 4' end,
                     to_char(new.fecha, 'DD/MM/YYYY'),
                     to_char(new.hora_inicio, 'HH24:MI'), v_entrenador),
              'Efectivo', 'pendiente')
      returning id into v_pago_id;
      new.pago_id := v_pago_id;
    end if;
  elsif new.estado = 'cancelada' and old.estado = 'confirmada' then
    -- Con pago_id el cobro se anula en el trigger AFTER; si no, se repone el crédito.
    if old.pago_id is null then
      perform public.reponer_un_credito(
        new.alumno_id, array['personalizado']::public.tipo_membresia[]);
    end if;
  end if;
  return new;
end $$;

-- AFTER: borrar el pago dentro del BEFORE chocaría con el ON DELETE SET NULL
-- sobre la misma fila que se está actualizando.
create or replace function public.trg_reserva_anular_cobro()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  delete from pagos where id = old.pago_id and estado = 'pendiente';
  return null;
end $$;

drop trigger if exists reserva_anular_cobro on clases_personalizadas_reservas;
create trigger reserva_anular_cobro
  after update of estado on clases_personalizadas_reservas
  for each row
  when (old.estado = 'confirmada' and new.estado = 'cancelada' and old.pago_id is not null)
  execute function public.trg_reserva_anular_cobro();

revoke execute on function public.trg_reserva_credito()      from public, anon, authenticated;
revoke execute on function public.trg_reserva_anular_cobro() from public, anon, authenticated;
