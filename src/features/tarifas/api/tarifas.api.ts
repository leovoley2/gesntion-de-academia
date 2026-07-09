import { supabase } from '../../../lib/supabaseClient';
import type { ModalidadPersonalizada, Perfil, TarifaEntrenador } from '../../../types/database.types';

export const MODALIDADES: { valor: ModalidadPersonalizada; etiqueta: string }[] = [
  { valor: 'individual', etiqueta: 'Individual (1 atleta)' },
  { valor: 'duo', etiqueta: 'Dúo (por atleta)' },
  { valor: 'grupo3', etiqueta: 'Grupo de 3 (por atleta)' },
  { valor: 'grupo4', etiqueta: 'Grupo de 4 (por atleta)' },
];

export interface EntrenadorTarifas extends Perfil {
  tarifas: TarifaEntrenador[];
}

/** Entrenadores con sus 4 tarifas (para que el admin las edite). */
export async function listarEntrenadoresTarifas(): Promise<EntrenadorTarifas[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*, tarifas:tarifas_entrenador(*)')
    .eq('rol', 'entrenador')
    .order('nombre_completo', { ascending: true })
    .returns<EntrenadorTarifas[]>();
  if (error) throw error;
  return data ?? [];
}

/**
 * Guarda (upsert) el precio de una modalidad de un entrenador. La RLS permite
 * hacerlo al propio entrenador o a un administrador.
 */
export async function guardarTarifa(
  entrenadorId: string,
  modalidad: ModalidadPersonalizada,
  precio: number
): Promise<void> {
  const { error } = await supabase
    .from('tarifas_entrenador')
    .upsert(
      { entrenador_id: entrenadorId, modalidad, precio_por_atleta: precio },
      { onConflict: 'entrenador_id,modalidad' }
    );
  if (error) throw error;
}
