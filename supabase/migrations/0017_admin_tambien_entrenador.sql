-- ============================================================
-- MIGRACIÓN 0017 — Un administrador puede ser también entrenador.
--
-- Caso real: el dueño administra la academia y además da clases. En vez
-- de usar dos cuentas, su cuenta de admin lleva la marca es_entrenador y
-- la app le deja cambiar de "modo" (admin / entrenador).
--
-- Como admin ya tiene acceso a todo por RLS; solo hay que hacer que lo
-- que exige "ser entrenador" acepte también la marca:
--   · los alumnos lo ven en la lista de entrenadores;
--   · precio_paquete (y por tanto la compra de paquetes) lo acepta.
-- La marca solo la puede cambiar un administrador.
-- ============================================================

alter table public.perfiles
  add column if not exists es_entrenador boolean not null default false;

-- Los alumnos ven a los entrenadores (y a los admins que también lo son).
alter policy perfiles_entrenadores_visibles on public.perfiles
  using ((rol = 'entrenador'::rol_usuario) or es_entrenador);

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
  join perfiles p on p.id = t.entrenador_id and (p.rol = 'entrenador' or p.es_entrenador)
  where t.entrenador_id = p_entrenador_id and t.modalidad = p_modalidad;
  if v_tarifa is null or v_tarifa <= 0 then
    raise exception 'El entrenador no tiene tarifa para esa modalidad';
  end if;

  return round(v_tarifa * p_sesiones * (1 - v_desc));
end $$;

-- Solo un administrador cambia el rol o la marca de entrenador.
create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new; -- service_role / SQL directo (Edge Functions, panel)
  end if;
  if new.rol is distinct from old.rol and public.mi_rol() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede cambiar el rol';
  end if;
  if new.es_entrenador is distinct from old.es_entrenador and public.mi_rol() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede marcar a alguien como entrenador';
  end if;
  return new;
end $$;

revoke execute on function public.proteger_campos_perfil() from public, anon, authenticated;
revoke execute on function public.precio_paquete(uuid, modalidad_personalizada, integer) from public, anon;
grant  execute on function public.precio_paquete(uuid, modalidad_personalizada, integer) to authenticated;
