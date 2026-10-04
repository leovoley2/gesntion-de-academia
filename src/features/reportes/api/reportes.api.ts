import { supabase } from '../../../lib/supabaseClient';
import type { MetodoPago } from '../../../types/database.types';

export interface ReporteMensual {
  mesEtiqueta: string;
  totalAprobado: number;
  numPagos: number;
  pendientesMonto: number;
  numPendientes: number;
  nuevosAlumnos: number;
  porMetodo: { metodo: MetodoPago; monto: number }[];
  porConcepto: { concepto: string; monto: number }[];
}

/** Reporte del mes indicado (por defecto, el mes en curso), agregado en la BD. */
export async function reporteMensual(base = new Date()): Promise<ReporteMensual> {
  const { data: r, error } = await supabase.rpc('reporte_mensual', {
    p_anio: base.getFullYear(),
    p_mes: base.getMonth() + 1,
  });
  if (error) throw error;

  return {
    mesEtiqueta: base.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
    totalAprobado: Number(r.totalAprobado),
    numPagos: r.numPagos,
    pendientesMonto: Number(r.pendientesMonto),
    numPendientes: r.numPendientes,
    nuevosAlumnos: r.nuevosAlumnos,
    porMetodo: r.porMetodo.map((m) => ({ metodo: m.metodo, monto: Number(m.monto) })),
    porConcepto: r.porConcepto.map((c) => ({ concepto: c.concepto, monto: Number(c.monto) })),
  };
}
