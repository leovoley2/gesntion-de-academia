-- ============================================================
-- MIGRACIÓN 0018 — Unir las dos cuentas de Leobardo Sanabria (datos).
--
-- El dueño usaba dos cuentas: leovoley2@gmail.com (administrador) y
-- leovoley_90@hotmail.com (entrenador). Decisión (2026-10-05): quedarse
-- con la de administrador, marcarla como entrenador (0017), pasarle todo
-- lo de entrenador y eliminar la otra.
--
-- Se localizan por correo (no por id) y no hace nada si alguna no existe,
-- así que es segura de re-ejecutar o de correr en otro entorno.
-- ============================================================
do $$
declare
  v_admin uuid := (select id from auth.users where email = 'leovoley2@gmail.com');
  v_viejo uuid := (select id from auth.users where email = 'leovoley_90@hotmail.com');
begin
  if v_admin is null or v_viejo is null then
    raise notice 'Cuentas no encontradas; nada que unir.';
    return;
  end if;

  update perfiles
  set es_entrenador = true,
      nombre_completo = 'Leobardo Sanabria',
      telefono = coalesce(nullif(telefono, ''), nullif((select telefono from perfiles where id = v_viejo), ''))
  where id = v_admin;

  update horarios_clases                set entrenador_id = v_admin where entrenador_id = v_viejo;
  update tarifas_entrenador             set entrenador_id = v_admin where entrenador_id = v_viejo;
  update disponibilidad_entrenador      set entrenador_id = v_admin where entrenador_id = v_viejo;
  update clases_personalizadas_reservas set entrenador_id = v_admin where entrenador_id = v_viejo;

  -- Borra la cuenta (y en cascada su perfil y consentimientos).
  delete from auth.users where id = v_viejo;
end $$;
