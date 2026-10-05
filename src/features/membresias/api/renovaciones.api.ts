import { supabase } from '../../../lib/supabaseClient';
import type { MatriculaMembresia, Plan } from '../../../types/database.types';

export interface MembresiaAlumno extends MatriculaMembresia {
  alumno: { nombre_completo: string; telefono: string | null } | null;
  plan: Pick<Plan, 'nombre' | 'precio_mensual'> | null;
}

/** Membresías mensuales activas o vencidas, ordenadas por vencimiento próximo. */
export async function listarMensualidades(): Promise<MembresiaAlumno[]> {
  const { data, error } = await supabase
    .from('matriculas_membresias')
    .select(
      '*, alumno:perfiles!alumno_id(nombre_completo, telefono), plan:planes(nombre, precio_mensual)'
    )
    .eq('tipo_membresia', 'mensual')
    .in('estado', ['activa', 'vencida', 'congelada'])
    .order('fecha_fin', { ascending: true, nullsFirst: false })
    .returns<MembresiaAlumno[]>();
  if (error) throw error;
  return data ?? [];
}

/** Renueva un mes (RPC transaccional del servidor; solo admin). */
export async function renovarMembresia(matriculaId: string, pagoId?: string): Promise<void> {
  const { error } = await supabase.rpc('renovar_membresia', {
    p_matricula_id: matriculaId,
    p_pago_id: pagoId ?? null,
  });
  if (error) throw error;
}

/** Marca vencidas las membresías con fecha de fin pasada (mensualidades y paquetes); devuelve cuántas. */
export async function actualizarVencimientos(): Promise<number> {
  const { data, error } = await supabase.rpc('actualizar_vencimientos');
  if (error) throw error;
  return data ?? 0;
}
