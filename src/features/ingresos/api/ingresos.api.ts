import { supabase } from '../../../lib/supabaseClient';
import type {
  MatriculaMembresia,
  MetodoPago,
  Plan,
} from '../../../types/database.types';

export interface SolicitudIngreso extends MatriculaMembresia {
  alumno: { nombre_completo: string; telefono: string | null } | null;
  plan: Plan | null;
  pagos: {
    id: string;
    monto: number;
    metodo_pago: MetodoPago;
    estado: string;
    concepto: string;
    comprobante_url: string | null;
  }[];
  inscripciones: {
    id: string;
    horario: {
      dia_semana: number;
      hora_inicio: string;
      hora_fin: string;
      sede: { nombre: string } | null;
    } | null;
  }[];
}

/** Solicitudes de ingreso pendientes con todo el contexto para decidir. */
export async function listarSolicitudesIngreso(): Promise<SolicitudIngreso[]> {
  const { data, error } = await supabase
    .from('matriculas_membresias')
    .select(
      `*,
       alumno:perfiles!alumno_id(nombre_completo, telefono),
       plan:planes(*),
       pagos(id, monto, metodo_pago, estado, concepto, comprobante_url),
       inscripciones:inscripciones_clase(id, horario:horarios_clases(dia_semana, hora_inicio, hora_fin, sede:sedes_canchas!sede_id(nombre)))`
    )
    .eq('estado', 'pendiente')
    .order('fecha_inicio', { ascending: true })
    .returns<SolicitudIngreso[]>();
  if (error) throw error;
  return data ?? [];
}

/** Aprueba la solicitud: activa la membresía, fija el próximo pago y aprueba el pago. */
export async function aprobarIngreso(matriculaId: string, pagoId?: string): Promise<void> {
  const { error } = await supabase.rpc('aprobar_ingreso', {
    p_matricula_id: matriculaId,
    p_pago_id: pagoId ?? null,
  });
  if (error) throw error;
}

/** Rechaza y elimina la solicitud (el pago queda pendiente para gestión manual). */
export async function rechazarIngreso(matriculaId: string): Promise<void> {
  const { error } = await supabase.rpc('rechazar_ingreso', { p_matricula_id: matriculaId });
  if (error) throw error;
}
