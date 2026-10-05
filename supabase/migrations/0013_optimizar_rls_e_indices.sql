-- ============================================================
-- MIGRACIÓN 0013 — Optimizaciones del linter de Supabase.
-- No cambia QUIÉN puede hacer qué: mismas condiciones en todas las
-- reglas (verificado con supabase/tests/regresiones.sql).
--
--   1. auth_rls_initplan: auth.uid(), auth.role() y mi_rol() se
--      envuelven en (select …) para que Postgres los evalúe UNA vez por
--      consulta y no una vez por fila. Generado a partir de las reglas
--      vivas de producción (incluye las que se crearon fuera de las
--      migraciones, p. ej. perfiles_entrenador_ve_alumnos e insc_*).
--   2. Índices para 3 claves foráneas sin índice.
--   3. mi_rol() deja de ser ejecutable por anónimos (0007 lo revocó a
--      'anon', pero seguía el permiso por defecto a PUBLIC). Ninguna
--      pantalla pública consulta tablas; un anónimo que lo intente vía API
--      recibe "permission denied" en lugar de una lista vacía.
-- ============================================================

-- 1. Reglas RLS ----------------------------------------------
alter policy reserva_alumno_crea on public.clases_personalizadas_reservas
  with check (((alumno_id = (select auth.uid())) AND (estado = 'pendiente'::estado_reserva) AND (fecha >= ((now() AT TIME ZONE 'America/Lima'::text))::date) AND (EXISTS ( SELECT 1
   FROM disponibilidad_entrenador d
  WHERE ((d.entrenador_id = clases_personalizadas_reservas.entrenador_id) AND (d.fecha = clases_personalizadas_reservas.fecha) AND (d.hora_inicio = clases_personalizadas_reservas.hora_inicio) AND (d.hora_fin = clases_personalizadas_reservas.hora_fin) AND d.habilitado AND (d.tipo = 'personalizada'::tipo_disponibilidad))))));

alter policy reserva_gestion on public.clases_personalizadas_reservas
  using (((entrenador_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario)));

alter policy reserva_lectura on public.clases_personalizadas_reservas
  using (((alumno_id = (select auth.uid())) OR (entrenador_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario)));

alter policy consent_lectura on public.consentimientos
  using (((usuario_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario)));

alter policy consent_propio_insert on public.consentimientos
  with check ((usuario_id = (select auth.uid())));

alter policy asistencia_escritura on public.control_asistencia
  using (((select mi_rol()) = ANY (ARRAY['entrenador'::rol_usuario, 'administrador'::rol_usuario])))
  with check (((select mi_rol()) = ANY (ARRAY['entrenador'::rol_usuario, 'administrador'::rol_usuario])));

alter policy asistencia_lectura on public.control_asistencia
  using (((alumno_id = (select auth.uid())) OR ((select mi_rol()) = ANY (ARRAY['entrenador'::rol_usuario, 'administrador'::rol_usuario]))));

alter policy disp_entrenador_gestiona on public.disponibilidad_entrenador
  using (((entrenador_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario)))
  with check (((entrenador_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario)));

alter policy disp_lectura on public.disponibilidad_entrenador
  using (((select auth.role()) = 'authenticated'::text));

alter policy horarios_admin on public.horarios_clases
  using (((select mi_rol()) = 'administrador'::rol_usuario))
  with check (((select mi_rol()) = 'administrador'::rol_usuario));

alter policy horarios_lectura on public.horarios_clases
  using (((select auth.role()) = 'authenticated'::text));

alter policy insc_gestion on public.inscripciones_clase
  using ((((select mi_rol()) = 'administrador'::rol_usuario) OR (EXISTS ( SELECT 1
   FROM horarios_clases h
  WHERE ((h.id = inscripciones_clase.horario_clase_id) AND (h.entrenador_id = (select auth.uid())))))))
  with check ((((select mi_rol()) = 'administrador'::rol_usuario) OR (EXISTS ( SELECT 1
   FROM horarios_clases h
  WHERE ((h.id = inscripciones_clase.horario_clase_id) AND (h.entrenador_id = (select auth.uid())))))));

alter policy insc_lectura on public.inscripciones_clase
  using (((alumno_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario) OR (EXISTS ( SELECT 1
   FROM horarios_clases h
  WHERE ((h.id = inscripciones_clase.horario_clase_id) AND (h.entrenador_id = (select auth.uid())))))));

alter policy inscripcion_alumno_borra on public.inscripciones_clase
  using (((alumno_id = (select auth.uid())) AND (matricula_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM matriculas_membresias m
  WHERE ((m.id = inscripciones_clase.matricula_id) AND (m.estado = 'pendiente'::estado_membresia))))));

alter policy inscripcion_alumno_crea on public.inscripciones_clase
  with check (((alumno_id = (select auth.uid())) AND (matricula_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM matriculas_membresias m
  WHERE ((m.id = inscripciones_clase.matricula_id) AND (m.alumno_id = (select auth.uid())) AND (m.estado = 'pendiente'::estado_membresia))))));

alter policy membresia_admin on public.matriculas_membresias
  using (((select mi_rol()) = 'administrador'::rol_usuario))
  with check (((select mi_rol()) = 'administrador'::rol_usuario));

alter policy membresia_alumno_lee on public.matriculas_membresias
  using (((alumno_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario)));

alter policy pagos_admin on public.pagos
  using (((select mi_rol()) = 'administrador'::rol_usuario))
  with check (((select mi_rol()) = 'administrador'::rol_usuario));

alter policy pagos_alumno_crea on public.pagos
  with check (((alumno_id = (select auth.uid())) AND (estado = 'pendiente'::estado_pago)));

alter policy pagos_alumno_lee on public.pagos
  using (((alumno_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario)));

alter policy perfil_admin_delete on public.perfiles
  using (((select mi_rol()) = 'administrador'::rol_usuario));

alter policy perfil_admin_update on public.perfiles
  using (((select mi_rol()) = 'administrador'::rol_usuario))
  with check (((select mi_rol()) = 'administrador'::rol_usuario));

alter policy perfil_propio_lectura on public.perfiles
  using ((((select auth.uid()) = id) OR ((select mi_rol()) = 'administrador'::rol_usuario)));

alter policy perfil_propio_update on public.perfiles
  using (((select auth.uid()) = id));

alter policy perfiles_entrenador_ve_alumnos on public.perfiles
  using ((((select mi_rol()) = 'entrenador'::rol_usuario) AND (rol = 'alumno'::rol_usuario)));

alter policy planes_admin on public.planes
  using (((select mi_rol()) = 'administrador'::rol_usuario))
  with check (((select mi_rol()) = 'administrador'::rol_usuario));

alter policy planes_lectura on public.planes
  using (((select auth.role()) = 'authenticated'::text));

alter policy sedes_admin on public.sedes_canchas
  using (((select mi_rol()) = 'administrador'::rol_usuario))
  with check (((select mi_rol()) = 'administrador'::rol_usuario));

alter policy sedes_lectura on public.sedes_canchas
  using (((select auth.role()) = 'authenticated'::text));

alter policy tarifas_gestion on public.tarifas_entrenador
  using (((entrenador_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario)))
  with check (((entrenador_id = (select auth.uid())) OR ((select mi_rol()) = 'administrador'::rol_usuario)));

alter policy tarifas_lectura on public.tarifas_entrenador
  using (((select auth.role()) = 'authenticated'::text));

-- 2. Índices de claves foráneas ------------------------------
create index if not exists idx_reservas_sede     on clases_personalizadas_reservas (sede_id);
create index if not exists idx_horarios_sede     on horarios_clases (sede_id);
create index if not exists idx_membresias_plan   on matriculas_membresias (plan_id);

-- 3. mi_rol() solo para usuarios con sesión -----------------
revoke execute on function public.mi_rol() from public, anon;
grant  execute on function public.mi_rol() to authenticated;
