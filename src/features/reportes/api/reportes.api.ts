import { supabase } from '../../../lib/supabaseClient';
import type { MetodoPago } from '../../../types/database.types';
import { isoLocal } from '../../../utils/fechas';

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

interface PagoFila {
  monto: number;
  metodo_pago: MetodoPago;
  concepto: string;
  estado: string;
}

/** Reporte del mes indicado (por defecto, el mes en curso). */
export async function reporteMensual(base = new Date()): Promise<ReporteMensual> {
  const inicio = isoLocal(new Date(base.getFullYear(), base.getMonth(), 1));
  const inicioSiguiente = isoLocal(new Date(base.getFullYear(), base.getMonth() + 1, 1));

  const [pagosRes, alumnosRes] = await Promise.all([
    supabase
      .from('pagos')
      .select('monto, metodo_pago, concepto, estado')
      .gte('fecha_pago', inicio)
      .lt('fecha_pago', inicioSiguiente)
      .returns<PagoFila[]>(),
    supabase
      .from('perfiles')
      .select('id', { count: 'exact', head: true })
      .eq('rol', 'alumno')
      .gte('fecha_registro', inicio)
      .lt('fecha_registro', inicioSiguiente),
  ]);

  if (pagosRes.error) throw pagosRes.error;
  if (alumnosRes.error) throw alumnosRes.error;

  const pagos = pagosRes.data ?? [];
  const aprobados = pagos.filter((p) => p.estado === 'aprobado');
  const pendientes = pagos.filter((p) => p.estado === 'pendiente');

  const metodoMap = new Map<MetodoPago, number>();
  const conceptoMap = new Map<string, number>();
  for (const p of aprobados) {
    metodoMap.set(p.metodo_pago, (metodoMap.get(p.metodo_pago) ?? 0) + Number(p.monto));
    conceptoMap.set(p.concepto, (conceptoMap.get(p.concepto) ?? 0) + Number(p.monto));
  }

  return {
    mesEtiqueta: base.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
    totalAprobado: aprobados.reduce((s, p) => s + Number(p.monto), 0),
    numPagos: aprobados.length,
    pendientesMonto: pendientes.reduce((s, p) => s + Number(p.monto), 0),
    numPendientes: pendientes.length,
    nuevosAlumnos: alumnosRes.count ?? 0,
    porMetodo: [...metodoMap.entries()]
      .map(([metodo, monto]) => ({ metodo, monto }))
      .sort((a, b) => b.monto - a.monto),
    porConcepto: [...conceptoMap.entries()]
      .map(([concepto, monto]) => ({ concepto, monto }))
      .sort((a, b) => b.monto - a.monto),
  };
}
