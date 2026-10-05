-- ============================================================
-- MIGRACIÓN 0015 — El entrenador ve el plan de SUS alumnos.
--
-- La lista de asistencia muestra el tipo de plan de cada alumno, pero
-- la RLS de matriculas_membresias solo dejaba leer al propio alumno y
-- al admin: el entrenador recibía una lista vacía y la app mostraba a
-- todos como "mensual", incluso a quien no tenía ningún plan activo.
--
-- Solo lectura, y solo de alumnos inscritos en clases del propio
-- entrenador. No puede modificar membresías ni ver las de otros alumnos.
-- ============================================================

drop policy if exists "membresia_entrenador_lee" on public.matriculas_membresias;
create policy "membresia_entrenador_lee" on public.matriculas_membresias
  for select to authenticated
  using (
    (select public.mi_rol()) = 'entrenador'
    and exists (
      select 1
      from public.inscripciones_clase i
      join public.horarios_clases h on h.id = i.horario_clase_id
      where i.alumno_id = matriculas_membresias.alumno_id
        and h.entrenador_id = (select auth.uid())
    )
  );
