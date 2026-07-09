-- El alumno elige si su clase personalizada es individual, dúo o en grupo (2/3/4).
-- Ya aplicada al proyecto "gestion" (2026-07).
alter table clases_personalizadas_reservas
  add column if not exists modalidad modalidad_personalizada not null default 'individual';
