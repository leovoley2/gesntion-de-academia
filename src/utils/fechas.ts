/**
 * Fecha local en formato 'YYYY-MM-DD'.
 *
 * Usar esto en vez de `new Date().toISOString().slice(0,10)`: toISOString()
 * devuelve UTC, lo que en Perú (UTC-5) provoca que de noche la fecha "salte"
 * al día siguiente y deje de coincidir con `getDay()` (que es local).
 */
export function isoLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Suma días a una fecha y la devuelve en 'YYYY-MM-DD' local. */
export function isoLocalMas(dias: number, base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
}
