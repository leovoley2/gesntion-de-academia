-- ============================================================
-- ACADEMIA DE VÓLEY PLAYA — ESQUEMA INICIAL
-- Ejecutar en el SQL Editor de Supabase (o vía supabase db push).
-- ============================================================

-- 1. TIPOS ENUM ---------------------------------------------
create type rol_usuario       as enum ('administrador', 'entrenador', 'alumno');
create type tipo_sede         as enum ('paga', 'gratis');
create type nivel_clase       as enum ('principiante', 'intermedio', 'avanzado');
create type tipo_membresia     as enum ('mensual', 'paquete_clases', 'personalizado');
create type estado_membresia   as enum ('activa', 'vencida', 'congelada');
create type estado_asistencia  as enum ('asistio', 'falta', 'tardanza', 'justificado');
create type metodo_pago        as enum ('Yape', 'Plin', 'Transferencia', 'Efectivo');
create type estado_pago        as enum ('pendiente', 'aprobado');
create type estado_reserva     as enum ('pendiente', 'confirmada', 'cancelada', 'realizada');

-- 2. PERFILES (extiende auth.users) -------------------------
create table perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  telefono        text,
  rol             rol_usuario not null default 'alumno',
  fecha_registro  timestamptz not null default now()
);

-- 3. SEDES / CANCHAS ----------------------------------------
create table sedes_canchas (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  tipo         tipo_sede not null default 'paga',
  tarifa_hora  numeric(8,2) not null default 0 check (tarifa_hora >= 0)
);

-- 4. HORARIOS DE CLASES GRUPALES ----------------------------
create table horarios_clases (
  id            uuid primary key default gen_random_uuid(),
  sede_id       uuid not null references sedes_canchas(id) on delete restrict,
  entrenador_id uuid not null references perfiles(id)      on delete restrict,
  dia_semana    smallint not null check (dia_semana between 0 and 6), -- 0=domingo
  hora_inicio   time not null,
  hora_fin      time not null,
  nivel         nivel_clase not null default 'principiante',
  check (hora_fin > hora_inicio)
);

-- 5. MATRÍCULAS / MEMBRESÍAS --------------------------------
create table matriculas_membresias (
  id                uuid primary key default gen_random_uuid(),
  alumno_id         uuid not null references perfiles(id) on delete cascade,
  tipo_membresia    tipo_membresia not null,
  estado            estado_membresia not null default 'activa',
  clases_totales    integer not null default 0  check (clases_totales >= 0),
  clases_disponibles integer not null default 0 check (clases_disponibles >= 0),
  fecha_inicio      date not null default current_date,
  fecha_fin         date,
  check (clases_disponibles <= clases_totales)
);
create index idx_membresias_alumno on matriculas_membresias(alumno_id);

-- 6. CONTROL DE ASISTENCIA ----------------------------------
create table control_asistencia (
  id                uuid primary key default gen_random_uuid(),
  horario_clase_id  uuid not null references horarios_clases(id) on delete cascade,
  alumno_id         uuid not null references perfiles(id)        on delete cascade,
  fecha             date not null default current_date,
  estado            estado_asistencia not null,
  unique (horario_clase_id, alumno_id, fecha)
);
create index idx_asistencia_fecha on control_asistencia(fecha);

-- 7. PAGOS --------------------------------------------------
create table pagos (
  id               uuid primary key default gen_random_uuid(),
  alumno_id        uuid not null references perfiles(id) on delete restrict,
  monto            numeric(8,2) not null check (monto > 0),
  moneda           text not null default 'PEN',
  concepto         text not null,
  metodo_pago      metodo_pago not null,
  estado           estado_pago not null default 'pendiente',
  comprobante_url  text,
  fecha_pago       timestamptz not null default now()
);
create index idx_pagos_fecha on pagos(fecha_pago);

-- 8. DISPONIBILIDAD DEL ENTRENADOR --------------------------
create table disponibilidad_entrenador (
  id             uuid primary key default gen_random_uuid(),
  entrenador_id  uuid not null references perfiles(id) on delete cascade,
  fecha          date not null,
  hora_inicio    time not null,
  hora_fin       time not null,
  habilitado     boolean not null default true,
  motivo_bloqueo text,
  check (hora_fin > hora_inicio)
);
create index idx_disp_entrenador_fecha on disponibilidad_entrenador(entrenador_id, fecha);

-- 9. RESERVAS DE CLASES PERSONALIZADAS ----------------------
create table clases_personalizadas_reservas (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null references perfiles(id)       on delete cascade,
  entrenador_id  uuid not null references perfiles(id)       on delete restrict,
  sede_id        uuid not null references sedes_canchas(id)  on delete restrict,
  fecha          date not null,
  hora_inicio    time not null,
  hora_fin       time not null,
  estado         estado_reserva not null default 'pendiente',
  creada_en      timestamptz not null default now(),
  check (hora_fin > hora_inicio)
);
create index idx_reservas_entrenador on clases_personalizadas_reservas(entrenador_id, fecha);

-- ============================================================
-- LÓGICA DE NEGOCIO: descuento atómico de créditos
-- ============================================================
create or replace function descontar_credito_clase(p_alumno_id uuid)
returns void
language plpgsql
security definer
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
    raise exception 'El alumno no tiene créditos disponibles';
  end if;

  update matriculas_membresias
  set clases_disponibles = clases_disponibles - 1,
      estado = case when clases_disponibles - 1 = 0 then 'vencida' else estado end
  where id = v_membresia_id;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) BÁSICO
-- ============================================================
create or replace function mi_rol()
returns rol_usuario
language sql stable security definer
as $$ select rol from perfiles where id = auth.uid() $$;

alter table perfiles                       enable row level security;
alter table sedes_canchas                  enable row level security;
alter table horarios_clases                enable row level security;
alter table matriculas_membresias          enable row level security;
alter table control_asistencia             enable row level security;
alter table pagos                          enable row level security;
alter table disponibilidad_entrenador      enable row level security;
alter table clases_personalizadas_reservas enable row level security;

create policy "perfil_propio_lectura" on perfiles
  for select using (auth.uid() = id or mi_rol() = 'administrador');
create policy "perfil_propio_update" on perfiles
  for update using (auth.uid() = id);

create policy "sedes_lectura" on sedes_canchas
  for select using (auth.role() = 'authenticated');
create policy "sedes_admin" on sedes_canchas
  for all using (mi_rol() = 'administrador') with check (mi_rol() = 'administrador');

create policy "horarios_lectura" on horarios_clases
  for select using (auth.role() = 'authenticated');
create policy "horarios_admin" on horarios_clases
  for all using (mi_rol() = 'administrador') with check (mi_rol() = 'administrador');

create policy "membresia_alumno_lee" on matriculas_membresias
  for select using (alumno_id = auth.uid() or mi_rol() = 'administrador');
create policy "membresia_admin" on matriculas_membresias
  for all using (mi_rol() = 'administrador') with check (mi_rol() = 'administrador');

create policy "asistencia_lectura" on control_asistencia
  for select using (alumno_id = auth.uid() or mi_rol() in ('entrenador','administrador'));
create policy "asistencia_escritura" on control_asistencia
  for all using (mi_rol() in ('entrenador','administrador'))
  with check (mi_rol() in ('entrenador','administrador'));

create policy "pagos_alumno_lee" on pagos
  for select using (alumno_id = auth.uid() or mi_rol() = 'administrador');
create policy "pagos_admin" on pagos
  for all using (mi_rol() = 'administrador') with check (mi_rol() = 'administrador');

create policy "disp_lectura" on disponibilidad_entrenador
  for select using (auth.role() = 'authenticated');
create policy "disp_entrenador_gestiona" on disponibilidad_entrenador
  for all using (entrenador_id = auth.uid() or mi_rol() = 'administrador')
  with check (entrenador_id = auth.uid() or mi_rol() = 'administrador');

create policy "reserva_lectura" on clases_personalizadas_reservas
  for select using (
    alumno_id = auth.uid() or entrenador_id = auth.uid() or mi_rol() = 'administrador'
  );
create policy "reserva_alumno_crea" on clases_personalizadas_reservas
  for insert with check (alumno_id = auth.uid());
create policy "reserva_gestion" on clases_personalizadas_reservas
  for update using (entrenador_id = auth.uid() or mi_rol() = 'administrador');

-- ============================================================
-- TRIGGER: crear perfil automáticamente al registrarse
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into perfiles (id, nombre_completo, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre_completo', 'Nuevo usuario'), 'alumno');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
