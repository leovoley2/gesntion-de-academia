import { supabase } from '../../../lib/supabaseClient';
import type { DisponibilidadEntrenador, TipoDisponibilidad } from '../../../types/database.types';
import { isoLocal } from '../../../utils/fechas';

/** Bloques de disponibilidad (futuros) del entrenador indicado. */
export async function listarDisponibilidad(
  entrenadorId: string
): Promise<DisponibilidadEntrenador[]> {
  const hoy = isoLocal();
  const { data, error } = await supabase
    .from('disponibilidad_entrenador')
    .select('*')
    .eq('entrenador_id', entrenadorId)
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface ParamsLote {
  entrenadorId: string;
  tipo: TipoDisponibilidad;
  diasSemana: number[]; // 0=domingo … 6=sábado
  desde: string; // 'YYYY-MM-DD'
  hasta: string; // 'YYYY-MM-DD'
  horaInicio: string; // 'HH:MM'
  horaFin: string; // 'HH:MM'
  duracionMin: number; // duración de cada bloque, en minutos
}

interface BloqueNuevo {
  entrenador_id: string;
  tipo: TipoDisponibilidad;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  habilitado: boolean;
}

/** Genera (sin tocar la BD) los bloques que resultan de unos parámetros en lote. */
export function generarBloques(p: ParamsLote): BloqueNuevo[] {
  const bloques: BloqueNuevo[] = [];
  const inicioMin = aMinutos(p.horaInicio);
  const finMin = aMinutos(p.horaFin);
  if (finMin <= inicioMin || p.duracionMin <= 0) return bloques;

  const desde = new Date(p.desde + 'T00:00:00');
  const hasta = new Date(p.hasta + 'T00:00:00');

  for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
    if (!p.diasSemana.includes(d.getDay())) continue;
    const fecha = isoLocal(d);
    for (let t = inicioMin; t + p.duracionMin <= finMin; t += p.duracionMin) {
      bloques.push({
        entrenador_id: p.entrenadorId,
        tipo: p.tipo,
        fecha,
        hora_inicio: aHora(t),
        hora_fin: aHora(t + p.duracionMin),
        habilitado: true,
      });
    }
  }
  return bloques;
}

/** Inserta bloques en lote; ignora los que ya existan (índice único). */
export async function crearBloquesLote(p: ParamsLote): Promise<number> {
  const bloques = generarBloques(p);
  if (bloques.length === 0) return 0;
  const { error } = await supabase
    .from('disponibilidad_entrenador')
    .upsert(bloques, { onConflict: 'entrenador_id,fecha,hora_inicio', ignoreDuplicates: true });
  if (error) throw error;
  return bloques.length;
}

/** Habilita o bloquea un bloque puntual. */
export async function toggleBloque(id: string, habilitado: boolean): Promise<void> {
  const { error } = await supabase
    .from('disponibilidad_entrenador')
    .update({ habilitado })
    .eq('id', id);
  if (error) throw error;
}

export async function eliminarBloque(id: string): Promise<void> {
  const { error } = await supabase.from('disponibilidad_entrenador').delete().eq('id', id);
  if (error) throw error;
}

// --- helpers de tiempo ---
function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function aHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
