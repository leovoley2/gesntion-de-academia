-- ============================================================
-- MIGRACIÓN 0005 — YA APLICADA AL PROYECTO "gestion" (2026-07-04)
-- FASE 1: catálogo de planes + flujo de inscripción autoservicio.
-- Requiere 0004 (valor 'pendiente' en estado_membresia).
-- ============================================================

-- 1. Planes de la academia (precios de arenavoleibolclub.com)
create table if not exists planes (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null unique,
  descripcion        text,
  frecuencia_semanal smallint not null check (frecuencia_semanal between 1 and 7),
  clases_mensuales   smallint not null,
  precio_mensual     numeric(8,2) not null check (precio_mensual >= 0),
  activo             boolean not null default true,
  orden              smallint not null default 0
);

insert into planes (nombre, descripcion, frecuencia_semanal, clases_mensuales, precio_mensual, orden) values
  ('Básico',     '1 vez por semana · 4 clases al mes · 2 h por clase', 1, 4,  130, 1),
  ('Intermedio', '2 veces por semana · 8 clases al mes · 2 h por clase', 2, 8,  170, 2),
  ('Avanzado',   '3 veces por semana · 12 clases al mes · 2 h por clase', 3, 12, 200, 3),
  ('Premium',    '4 veces por semana · asesoría física y de fuerza · videos de corrección técnica', 4, 16, 250, 4)
on conflict (nombre) do update
  set precio_mensual = excluded.precio_mensual,
      frecuencia_semanal = excluded.frecuencia_semanal,
      clases_mensuales = excluded.clases_mensuales,
      descripcion = excluded.descripcion,
      orden = excluded.orden;

-- 2. Tarifas de clases personalizadas por entrenador y modalidad.
--    Leobardo lleva los precios de lsbeachlab.com; el resto arranca
--    más barato y el admin (o cada entrenador) lo ajusta.
do $$ begin
  create type modalidad_personalizada as enum ('individual', 'duo', 'grupo3', 'grupo4');
exception when duplicate_object then null; end $$;

create table if not exists tarifas_entrenador (
  id                uuid primary key default gen_random_uuid(),
  entrenador_id     uuid not null references perfiles(id) on delete cascade,
  modalidad         modalidad_personalizada not null,
  precio_por_atleta numeric(8,2) not null check (precio_por_atleta >= 0),
  unique (entrenador_id, modalidad)
);

insert into tarifas_entrenador (entrenador_id, modalidad, precio_por_atleta)
select p.id, v.modalidad, v.precio
from perfiles p
cross join (values
  ('individual'::modalidad_personalizada, 85::numeric),
  ('duo'::modalidad_personalizada,        70::numeric),
  ('grupo3'::modalidad_personalizada,     60::numeric),
  ('grupo4'::modalidad_personalizada,     50::numeric)
) as v(modalidad, precio)
where p.rol = 'entrenador'
on conflict (entrenador_id, modalidad) do nothing;

update tarifas_entrenador t
set precio_por_atleta = v.precio
from perfiles p,
     (values
       ('individual'::modalidad_personalizada, 100::numeric),
       ('duo'::modalidad_personalizada,         80::numeric),
       ('grupo3'::modalidad_personalizada,      70::numeric),
       ('grupo4'::modalidad_personalizada,      60::numeric)
     ) as v(modalidad, precio)
where t.entrenador_id = p.id
  and t.modalidad = v.modalidad
  and p.rol = 'entrenador'
  and p.nombre_completo ilike '%leobardo%';

-- 3. Vincular solicitud: matrícula ↔ plan, inscripciones ↔ matrícula, pago ↔ matrícula
alter table matriculas_membresias
  add column if not exists plan_id uuid references planes(id) on delete set null;

alter table inscripciones_clase
  add column if not exists matricula_id uuid references matriculas_membresias(id) on delete cascade;

alter table pagos
  add column if not exists matricula_id uuid references matriculas_membresias(id) on delete set null;

-- 4. RLS del catálogo y del flujo de solicitud
alter table planes enable row level security;
alter table tarifas_entrenador enable row level security;

drop policy if exists "planes_lectura" on planes;
create policy "planes_lectura" on planes
  for select using (auth.role() = 'authenticated');
drop policy if exists "planes_admin" on planes;
create policy "planes_admin" on planes
  for all using (mi_rol() = 'administrador') with check (mi_rol() = 'administrador');

drop policy if exists "tarifas_lectura" on tarifas_entrenador;
create policy "tarifas_lectura" on tarifas_entrenador
  for select using (auth.role() = 'authenticated');
drop policy if exists "tarifas_gestion" on tarifas_entrenador;
create policy "tarifas_gestion" on tarifas_entrenador
  for all using (entrenador_id = auth.uid() or mi_rol() = 'administrador')
  with check (entrenador_id = auth.uid() or mi_rol() = 'administrador');

drop policy if exists "membresia_alumno_solicita" on matriculas_membresias;
create policy "membresia_alumno_solicita" on matriculas_membresias
  for insert with check (alumno_id = auth.uid() and estado = 'pendiente');

drop policy if exists "inscripcion_alumno_crea" on inscripciones_clase;
create policy "inscripcion_alumno_crea" on inscripciones_clase
  for insert with check (alumno_id = auth.uid());

drop policy if exists "inscripcion_alumno_borra" on inscripciones_clase;
create policy "inscripcion_alumno_borra" on inscripciones_clase
  for delete using (
    alumno_id = auth.uid()
    and matricula_id is not null
    and exists (
      select 1 from matriculas_membresias m
      where m.id = matricula_id and m.estado = 'pendiente'
    )
  );

-- 5. El trigger de alta también guarda el teléfono del registro
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
  return new;
end $$;

-- 6. Aprobar / rechazar solicitudes de forma transaccional (solo admin)
create or replace function public.aprobar_ingreso(p_matricula_id uuid, p_pago_id uuid default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_estado estado_membresia; v_tipo tipo_membresia;
begin
  if public.mi_rol() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede aprobar ingresos';
  end if;

  select estado, tipo_membresia into v_estado, v_tipo
  from matriculas_membresias where id = p_matricula_id for update;

  if not found then raise exception 'Solicitud no encontrada'; end if;
  if v_estado <> 'pendiente' then raise exception 'La solicitud ya fue procesada'; end if;

  update matriculas_membresias
  set estado = 'activa',
      fecha_inicio = current_date,
      fecha_fin = case
        when v_tipo = 'mensual' then (current_date + interval '1 month')::date
        else fecha_fin
      end
  where id = p_matricula_id;

  if p_pago_id is not null then
    update pagos set estado = 'aprobado' where id = p_pago_id;
  end if;
end $$;

create or replace function public.rechazar_ingreso(p_matricula_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_estado estado_membresia;
begin
  if public.mi_rol() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede rechazar ingresos';
  end if;

  select estado into v_estado from matriculas_membresias where id = p_matricula_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if v_estado <> 'pendiente' then raise exception 'La solicitud ya fue procesada'; end if;

  -- borra la solicitud completa (inscripciones caen en cascada;
  -- el pago queda 'pendiente' para gestionarlo/reembolsarlo a mano)
  delete from matriculas_membresias where id = p_matricula_id;
end $$;

revoke execute on function public.aprobar_ingreso(uuid, uuid) from public, anon;
revoke execute on function public.rechazar_ingreso(uuid)      from public, anon;
