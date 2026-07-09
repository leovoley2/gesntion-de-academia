-- Nuevo estado para solicitudes de ingreso pendientes de aprobación.
-- Va en migración separada: Postgres exige commitear el valor nuevo del
-- enum antes de poder usarlo en políticas o funciones.
alter type estado_membresia add value if not exists 'pendiente';
