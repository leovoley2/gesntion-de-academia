-- ============================================================
-- MIGRACIÓN 0016 — El alumno ya no crea pagos "a mano".
--
-- Se retiró el formulario "Registrar mi pago" de Mis pagos (creaba pagos
-- sin inscribir al alumno en ninguna clase). Los pagos del alumno nacen
-- solo en el servidor: solicitar_ingreso_academia,
-- solicitar_paquete_personalizado y el cobro de sesión suelta al confirmar
-- una reserva. Las renovaciones las registra el admin (pagos_admin).
-- ============================================================

drop policy if exists "pagos_alumno_crea" on public.pagos;
