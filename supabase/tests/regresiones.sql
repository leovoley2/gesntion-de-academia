-- ============================================================
-- SUITE DE REGRESIÓN DE LA BASE DE DATOS (RLS, triggers y RPC)
--
-- Cubre los bugs 1–6 de la auditoría (2026-10-04), las funciones de
-- escalabilidad y qué ve cada rol (46 casos). Crea sus propios usuarios y datos de prueba, y TODO
-- se deshace con el ROLLBACK final: se puede ejecutar contra producción
-- sin dejar rastro.
--
-- Cómo ejecutarla:
--   psql "$DATABASE_URL" -f supabase/tests/regresiones.sql
--   (o pegarla en el SQL Editor de Supabase / ejecutarla vía MCP)
-- Resultado: una fila por caso con 'OK' o 'FALLA'. Si algo falla, el
-- último SELECT lo lista; si todo pasa, muestra 'TODO OK'.
-- ============================================================
begin;

-- ---------- Utilidades (temporales, mueren con la transacción) ----------
create temp table _r (n serial, caso text, ok boolean, detalle text);
grant all on _r to authenticated;
grant usage on sequence _r_n_seq to authenticated;

-- Ejecuta SQL como un usuario autenticado concreto (o como postgres si null).
create function pg_temp.como(uid uuid) returns void language plpgsql as $$
begin
  if uid is null then
    reset role;
    perform set_config('request.jwt.claims', '', true);
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    set local role authenticated;
  end if;
end $$;

create function pg_temp.afirmar(caso text, cond boolean, detalle text default null)
returns void language plpgsql as $$
begin
  insert into _r (caso, ok, detalle) values (caso, coalesce(cond, false), detalle);
end $$;

-- El SQL debe fallar (RLS o excepción). Registra OK si falla.
create function pg_temp.debe_fallar(caso text, sql text) returns void language plpgsql as $$
begin
  execute sql;
  insert into _r (caso, ok, detalle) values (caso, false, 'se permitió y debía bloquearse');
exception when others then
  insert into _r (caso, ok, detalle) values (caso, true, sqlerrm);
end $$;

-- El SQL debe funcionar. Registra el error si falla.
create function pg_temp.debe_pasar(caso text, sql text) returns void language plpgsql as $$
begin
  execute sql;
  insert into _r (caso, ok) values (caso, true);
exception when others then
  insert into _r (caso, ok, detalle) values (caso, false, sqlerrm);
end $$;


-- ---------- Datos de prueba ----------
-- Usuarios: el trigger handle_new_user crea su perfil como 'alumno'.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-admin@regresion.local',  '{"nombre_completo":"T Admin"}'),
  ('e0000000-0000-4000-8000-00000000000e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-entre@regresion.local',  '{"nombre_completo":"T Entrenador"}'),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-alum1@regresion.local',  '{"nombre_completo":"T Alumno Sin Creditos"}'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-alum2@regresion.local',  '{"nombre_completo":"T Alumno Con Creditos"}');

update perfiles set rol = 'administrador' where id = 'a0000000-0000-4000-8000-00000000000a';
update perfiles set rol = 'entrenador'    where id = 'e0000000-0000-4000-8000-00000000000e';

insert into sedes_canchas (id, nombre, tipo, tarifa_hora)
values ('5e000000-0000-4000-8000-000000000005', 'T Sede', 'gratis', 0);

insert into horarios_clases (id, sede_id, entrenador_id, dia_semana, hora_inicio, hora_fin, nivel)
values ('40000000-0000-4000-8000-000000000004', '5e000000-0000-4000-8000-000000000005',
        'e0000000-0000-4000-8000-00000000000e', 1, '18:00', '20:00', 'intermedio');

insert into tarifas_entrenador (entrenador_id, modalidad, precio_por_atleta) values
  ('e0000000-0000-4000-8000-00000000000e', 'individual', 100),
  ('e0000000-0000-4000-8000-00000000000e', 'duo', 80),
  ('e0000000-0000-4000-8000-00000000000e', 'grupo3', 50);

insert into planes (id, nombre, frecuencia_semanal, clases_mensuales, precio_mensual, activo, orden)
values ('91000000-0000-4000-8000-000000000009', 'T Plan Regresión', 2, 8, 170, true, 99);

-- Bloque libre del entrenador dentro de 3 días (fecha de Perú).
insert into disponibilidad_entrenador (entrenador_id, fecha, hora_inicio, hora_fin, habilitado, tipo)
values ('e0000000-0000-4000-8000-00000000000e', (now() at time zone 'America/Lima')::date + 3,
        '07:00', '08:00', true, 'personalizada');

-- Alumno 2: un paquete de clases grupales (5) y un paquete personalizado (8).
-- Alumno 1: un paquete personalizado ya agotado (0 de 4, vencido). Sin créditos
-- activos; el código antiguo le "devolvía" un crédito al cancelar (bug 6).
insert into matriculas_membresias (alumno_id, tipo_membresia, estado, clases_totales, clases_disponibles) values
  ('20000000-0000-4000-8000-000000000002', 'paquete_clases', 'activa',  5, 5),
  ('20000000-0000-4000-8000-000000000002', 'personalizado',  'activa',  8, 8),
  ('10000000-0000-4000-8000-000000000001', 'personalizado',  'vencida', 4, 0);

-- ============================================================
-- BUG 1 — Reservas: solo 'pendiente' y sobre un bloque real
-- ============================================================
select pg_temp.como('10000000-0000-4000-8000-000000000001');
select pg_temp.debe_fallar('bug1: alumno crea reserva ya confirmada', $q$
  insert into clases_personalizadas_reservas (alumno_id, entrenador_id, sede_id, fecha, hora_inicio, hora_fin, estado)
  values ('10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000e', '5e000000-0000-4000-8000-000000000005',
          (now() at time zone 'America/Lima')::date + 3, '07:00', '08:00', 'confirmada') $q$);
select pg_temp.debe_fallar('bug1: reserva fuera de la disponibilidad', $q$
  insert into clases_personalizadas_reservas (alumno_id, entrenador_id, sede_id, fecha, hora_inicio, hora_fin, estado)
  values ('10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000e', '5e000000-0000-4000-8000-000000000005',
          (now() at time zone 'America/Lima')::date + 3, '10:00', '11:00', 'pendiente') $q$);
select pg_temp.debe_fallar('bug1: reserva a nombre de otro alumno', $q$
  insert into clases_personalizadas_reservas (alumno_id, entrenador_id, sede_id, fecha, hora_inicio, hora_fin, estado)
  values ('20000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000e', '5e000000-0000-4000-8000-000000000005',
          (now() at time zone 'America/Lima')::date + 3, '07:00', '08:00', 'pendiente') $q$);
select pg_temp.debe_pasar('bug1: reserva pendiente sobre bloque libre', $q$
  insert into clases_personalizadas_reservas (alumno_id, entrenador_id, sede_id, fecha, hora_inicio, hora_fin, estado)
  values ('10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000e', '5e000000-0000-4000-8000-000000000005',
          (now() at time zone 'America/Lima')::date + 3, '07:00', '08:00', 'pendiente') $q$);

-- ============================================================
-- BUG 2 — Inscripción a clase grupal solo con solicitud propia
-- ============================================================
select pg_temp.debe_fallar('bug2: alumno se inscribe a una clase sin solicitud', $q$
  insert into inscripciones_clase (horario_clase_id, alumno_id)
  values ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001') $q$);
select pg_temp.debe_fallar('bug5: alumno inserta una matrícula a mano', $q$
  insert into matriculas_membresias (alumno_id, tipo_membresia, estado, clases_totales, clases_disponibles)
  values ('10000000-0000-4000-8000-000000000001', 'personalizado', 'pendiente', 12, 99) $q$);

-- ============================================================
-- BUG 3 — Solicitud de ingreso atómica (RPC)
-- ============================================================
select pg_temp.debe_fallar('bug3: comprobante en la carpeta de otro alumno', $q$
  select public.solicitar_ingreso_academia('91000000-0000-4000-8000-000000000009',
    array['40000000-0000-4000-8000-000000000004']::uuid[], 'Yape', '20000000-0000-4000-8000-000000000002/x.jpg') $q$);
select pg_temp.debe_fallar('bug3: horario inexistente', $q$
  select public.solicitar_ingreso_academia('91000000-0000-4000-8000-000000000009',
    array['00000000-0000-0000-0000-000000000000']::uuid[], 'Yape', null) $q$);
select pg_temp.afirmar('bug3: un fallo no deja matrícula a medias',
  not exists (select 1 from matriculas_membresias
              where alumno_id = '10000000-0000-4000-8000-000000000001' and estado = 'pendiente'));
select pg_temp.debe_pasar('bug3: solicitud válida', $q$
  select public.solicitar_ingreso_academia('91000000-0000-4000-8000-000000000009',
    array['40000000-0000-4000-8000-000000000004']::uuid[], 'Yape', '10000000-0000-4000-8000-000000000001/x.jpg') $q$);
select pg_temp.afirmar('bug3: crea matrícula pendiente + inscripción + pago con el precio del plan',
  (select count(*) = 1 from matriculas_membresias m
     join inscripciones_clase i on i.matricula_id = m.id
     join pagos p on p.matricula_id = m.id
   where m.alumno_id = '10000000-0000-4000-8000-000000000001'
     and m.estado = 'pendiente' and p.monto = 170 and p.estado = 'pendiente'),
  (select string_agg(monto::text, ',') from pagos where alumno_id = '10000000-0000-4000-8000-000000000001'));
select pg_temp.debe_fallar('bug3: segundo envío con una solicitud en revisión', $q$
  select public.solicitar_ingreso_academia('91000000-0000-4000-8000-000000000009',
    array['40000000-0000-4000-8000-000000000004']::uuid[], 'Yape', null) $q$);

-- ============================================================
-- BUG 5 — Precio del paquete personalizado lo fija el servidor
-- ============================================================
select pg_temp.como('20000000-0000-4000-8000-000000000002');
select pg_temp.afirmar('bug5: precio 100 × 4 con 5 % = 380',
  public.precio_paquete('e0000000-0000-4000-8000-00000000000e', 'individual', 4) = 380);
select pg_temp.afirmar('bug5: precio 50 × 12 con 15 % = 510',
  public.precio_paquete('e0000000-0000-4000-8000-00000000000e', 'grupo3', 12) = 510);
select pg_temp.debe_fallar('bug5: paquete de 7 sesiones', $q$
  select public.solicitar_paquete_personalizado('e0000000-0000-4000-8000-00000000000e', 'individual', 7, 'Yape', null) $q$);
select pg_temp.debe_fallar('bug5: "entrenador" que no lo es', $q$
  select public.solicitar_paquete_personalizado('20000000-0000-4000-8000-000000000002', 'individual', 4, 'Yape', null) $q$);
select pg_temp.debe_pasar('bug5: solicitud de paquete válida', $q$
  select public.solicitar_paquete_personalizado('e0000000-0000-4000-8000-00000000000e', 'duo', 8, 'Plin', null) $q$);
select pg_temp.afirmar('bug5: el pago usa el precio del servidor (80 × 8 con 10 % = 576)',
  exists (select 1 from pagos where alumno_id = '20000000-0000-4000-8000-000000000002' and monto = 576));

-- ============================================================
-- BUG 4 — Cada clase gasta solo sus propios créditos
-- (los triggers corren igual como postgres)
-- ============================================================
select pg_temp.como(null);
insert into control_asistencia (horario_clase_id, alumno_id, fecha, estado)
values ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', current_date, 'asistio');
select pg_temp.afirmar('bug4: asistir a clase grupal descuenta del paquete de clases',
  (select clases_disponibles from matriculas_membresias
   where alumno_id = '20000000-0000-4000-8000-000000000002' and tipo_membresia = 'paquete_clases') = 4);
select pg_temp.afirmar('bug4: asistir a clase grupal NO toca el paquete personalizado',
  (select clases_disponibles from matriculas_membresias
   where alumno_id = '20000000-0000-4000-8000-000000000002' and tipo_membresia = 'personalizado' and estado = 'activa') = 8);
update control_asistencia set estado = 'falta'
where alumno_id = '20000000-0000-4000-8000-000000000002' and fecha = current_date;
select pg_temp.afirmar('bug4: corregir la asistencia devuelve el crédito grupal',
  (select clases_disponibles from matriculas_membresias
   where alumno_id = '20000000-0000-4000-8000-000000000002' and tipo_membresia = 'paquete_clases') = 5);

insert into clases_personalizadas_reservas (id, alumno_id, entrenador_id, sede_id, fecha, hora_inicio, hora_fin, estado, modalidad)
values ('b2000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000e',
        '5e000000-0000-4000-8000-000000000005', current_date + 4, '06:00', '07:00', 'pendiente', 'individual');
update clases_personalizadas_reservas set estado = 'confirmada' where id = 'b2000000-0000-4000-8000-000000000002';
select pg_temp.afirmar('bug4: confirmar reserva descuenta del paquete personalizado, sin cobro',
  (select clases_disponibles from matriculas_membresias
   where alumno_id = '20000000-0000-4000-8000-000000000002' and tipo_membresia = 'personalizado' and estado = 'activa') = 7
  and (select pago_id is null from clases_personalizadas_reservas where id = 'b2000000-0000-4000-8000-000000000002'));
select pg_temp.afirmar('bug4: confirmar reserva NO toca el paquete de clases grupales',
  (select clases_disponibles from matriculas_membresias
   where alumno_id = '20000000-0000-4000-8000-000000000002' and tipo_membresia = 'paquete_clases') = 5);
update clases_personalizadas_reservas set estado = 'cancelada' where id = 'b2000000-0000-4000-8000-000000000002';
select pg_temp.afirmar('bug4: cancelar la reserva devuelve el crédito personalizado',
  (select clases_disponibles from matriculas_membresias
   where alumno_id = '20000000-0000-4000-8000-000000000002' and tipo_membresia = 'personalizado' and estado = 'activa') = 8);

-- ============================================================
-- BUG 6 — Confirmar sin créditos genera el cobro de la sesión
-- ============================================================
insert into clases_personalizadas_reservas (id, alumno_id, entrenador_id, sede_id, fecha, hora_inicio, hora_fin, estado, modalidad)
values ('b1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000e',
        '5e000000-0000-4000-8000-000000000005', current_date + 5, '06:00', '07:00', 'pendiente', 'duo');
update clases_personalizadas_reservas set estado = 'confirmada' where id = 'b1000000-0000-4000-8000-000000000001';
select pg_temp.afirmar('bug6: sin créditos, confirmar crea un pago pendiente con la tarifa (Dúo 80)',
  (select p.monto = 80 and p.estado = 'pendiente'
   from clases_personalizadas_reservas r join pagos p on p.id = r.pago_id
   where r.id = 'b1000000-0000-4000-8000-000000000001'));
update clases_personalizadas_reservas set estado = 'cancelada' where id = 'b1000000-0000-4000-8000-000000000001';
select pg_temp.afirmar('bug6: cancelar anula el cobro pendiente',
  not exists (select 1 from pagos where alumno_id = '10000000-0000-4000-8000-000000000001' and concepto like 'Sesión personalizada%'));
select pg_temp.afirmar('bug6: cancelar NO regala un crédito (el paquete agotado sigue en 0)',
  (select clases_disponibles = 0 and estado = 'vencida' from matriculas_membresias
   where alumno_id = '10000000-0000-4000-8000-000000000001' and tipo_membresia = 'personalizado'));

-- ============================================================
-- ESCALABILIDAD — métricas y reportes en la BD
-- ============================================================
-- Pagos de prueba en un mes vacío (enero 2031), en hora de Perú.
insert into pagos (alumno_id, monto, concepto, metodo_pago, estado, fecha_pago) values
  ('10000000-0000-4000-8000-000000000001', 100, 'T mensualidad', 'Yape',     'aprobado',  '2031-01-10 12:00-05'),
  ('10000000-0000-4000-8000-000000000001',  50, 'T mensualidad', 'Efectivo', 'aprobado',  '2031-01-31 23:30-05'),
  ('20000000-0000-4000-8000-000000000002',  70, 'T sesión',      'Yape',     'pendiente', '2031-01-15 09:00-05'),
  ('20000000-0000-4000-8000-000000000002', 999, 'T febrero',     'Yape',     'aprobado',  '2031-02-01 00:30-05');

select pg_temp.como('a0000000-0000-4000-8000-00000000000a');
select pg_temp.afirmar('escala: reporte suma aprobados del mes (100 + 50, hora de Perú)',
  (public.reporte_mensual(2031, 1) ->> 'totalAprobado')::numeric = 150,
  public.reporte_mensual(2031, 1)::text);
select pg_temp.afirmar('escala: reporte cuenta pendientes del mes',
  (public.reporte_mensual(2031, 1) ->> 'pendientesMonto')::numeric = 70
  and (public.reporte_mensual(2031, 1) ->> 'numPendientes')::int = 1);
select pg_temp.afirmar('escala: reporte desglosa por método',
  (public.reporte_mensual(2031, 1) -> 'porMetodo')::jsonb
    @> '[{"metodo":"Yape","monto":100},{"metodo":"Efectivo","monto":50}]'::jsonb);
select pg_temp.afirmar('escala: métricas del admin responden',
  public.metricas_admin()::jsonb ? 'ingresosMes');

select pg_temp.como('10000000-0000-4000-8000-000000000001');
select pg_temp.debe_fallar('escala: un alumno no ve las métricas', $q$ select public.metricas_admin() $q$);
select pg_temp.debe_fallar('escala: un alumno no ve los reportes', $q$ select public.reporte_mensual(2031, 1) $q$);
select pg_temp.debe_fallar('escala: un alumno no puede vencer mensualidades', $q$ select public._vencer_mensualidades() $q$);

select pg_temp.como(null);
select pg_temp.afirmar('escala: vencimiento diario programado en pg_cron',
  exists (select 1 from cron.job where jobname = 'vencer-mensualidades' and active));

-- ============================================================
-- PERFILES — un usuario no puede subirse de rol
-- ============================================================
select pg_temp.como('10000000-0000-4000-8000-000000000001');
select pg_temp.debe_fallar('seguridad: un alumno no puede hacerse administrador', $q$
  update perfiles set rol = 'administrador' where id = '10000000-0000-4000-8000-000000000001' $q$);

-- ============================================================
-- VISIBILIDAD POR ROL (migración 0013: mismas reglas, solo optimizadas)
-- ============================================================
select pg_temp.afirmar('rls: alumno ve sus pagos y no los ajenos',
  (select count(*) from pagos) = (select count(*) from pagos where alumno_id = '10000000-0000-4000-8000-000000000001')
  and (select count(*) from pagos) > 0);
select pg_temp.afirmar('rls: alumno ve a los entrenadores pero no a otros alumnos',
  exists (select 1 from perfiles where id = 'e0000000-0000-4000-8000-00000000000e')
  and not exists (select 1 from perfiles where id = '20000000-0000-4000-8000-000000000002'));
select pg_temp.como('e0000000-0000-4000-8000-00000000000e');
select pg_temp.afirmar('rls: entrenador ve a los alumnos',
  exists (select 1 from perfiles where id = '20000000-0000-4000-8000-000000000002'));
select pg_temp.afirmar('rls: entrenador ve los inscritos de su clase',
  exists (select 1 from inscripciones_clase where horario_clase_id = '40000000-0000-4000-8000-000000000004'));
select pg_temp.afirmar('rls: entrenador no ve pagos', not exists (select 1 from pagos));
select pg_temp.como('a0000000-0000-4000-8000-00000000000a');
select pg_temp.afirmar('rls: admin ve todos los pagos de prueba',
  (select count(*) from pagos where concepto like 'T %') = 4);
select pg_temp.debe_pasar('rls: admin puede editar perfiles', $q$
  update perfiles set telefono = '999' where id = '20000000-0000-4000-8000-000000000002' $q$);
select pg_temp.afirmar('rls: la edición del admin se guardó',
  (select telefono = '999' from perfiles where id = '20000000-0000-4000-8000-000000000002'));
select pg_temp.como(null);
select pg_temp.afirmar('seguridad: un anónimo no puede ejecutar mi_rol()',
  not has_function_privilege('anon', 'public.mi_rol()', 'execute'));
select pg_temp.afirmar('seguridad: un usuario con sesión sí puede ejecutar mi_rol()',
  has_function_privilege('authenticated', 'public.mi_rol()', 'execute'));

-- ---------- Resultado ----------
select pg_temp.como(null);
-- Una sola consulta (fila 0 = resumen) para que se vea entera en cualquier cliente.
select 0 as n,
       case when bool_and(ok) then 'TODO OK' else 'FALLA' end as resultado,
       count(*) filter (where ok) || ' de ' || count(*) || ' casos pasan' as caso,
       null as detalle
from _r
union all
select n, case when ok then 'OK' else 'FALLA' end, caso, detalle from _r
order by n;

rollback;
