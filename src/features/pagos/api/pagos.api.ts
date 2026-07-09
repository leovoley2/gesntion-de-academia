import { supabase } from '../../../lib/supabaseClient';
import type { Pago, MetodoPago, Perfil } from '../../../types/database.types';

export interface PagoConAlumno extends Pago {
  alumno: { nombre_completo: string } | null;
}

export async function listarPagos(): Promise<PagoConAlumno[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select('*, alumno:perfiles!alumno_id(nombre_completo)')
    .order('fecha_pago', { ascending: false })
    .returns<PagoConAlumno[]>();
  if (error) throw error;
  return data ?? [];
}

/** Pagos del propio alumno (los ve por RLS). */
export async function listarMisPagos(alumnoId: string): Promise<Pago[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('fecha_pago', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listarAlumnosPago(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('rol', 'alumno')
    .order('nombre_completo', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface DatosPago {
  alumno_id: string;
  monto: number;
  concepto: string;
  metodo_pago: MetodoPago;
  comprobante?: File | null;
  /** Vincula el pago a una solicitud de inscripción (bandeja de nuevos ingresos). */
  matricula_id?: string | null;
}

/** Sube el comprobante (si hay) a Storage y registra el pago como 'pendiente'. */
export async function registrarPago(d: DatosPago): Promise<void> {
  let comprobante_url: string | null = null;

  if (d.comprobante) {
    // El bucket rechaza >5 MB y tipos no permitidos; avisamos antes de subir.
    if (d.comprobante.size > 5 * 1024 * 1024) {
      throw new Error('El comprobante supera los 5 MB. Sube una imagen más ligera o un PDF.');
    }
    const ext = d.comprobante.name.split('.').pop() ?? 'jpg';
    const ruta = `${d.alumno_id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('comprobantes')
      .upload(ruta, d.comprobante, { upsert: false });
    if (upErr) throw upErr;
    comprobante_url = ruta;
  }

  const { error } = await supabase.from('pagos').insert({
    alumno_id: d.alumno_id,
    monto: d.monto,
    moneda: 'PEN',
    concepto: d.concepto,
    metodo_pago: d.metodo_pago,
    estado: 'pendiente',
    comprobante_url,
    matricula_id: d.matricula_id ?? null,
  });
  if (error) throw error;
}

export async function aprobarPago(id: string): Promise<void> {
  const { error } = await supabase.from('pagos').update({ estado: 'aprobado' }).eq('id', id);
  if (error) throw error;
}

/** URL firmada temporal para ver un comprobante privado. */
export async function urlComprobante(ruta: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('comprobantes')
    .createSignedUrl(ruta, 60 * 5); // 5 minutos
  if (error) return null;
  return data.signedUrl;
}

/** Total de ingresos aprobados del mes en curso. */
export async function ingresosDelMes(): Promise<number> {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
  const { data, error } = await supabase
    .from('pagos')
    .select('monto')
    .eq('estado', 'aprobado')
    .gte('fecha_pago', inicio);
  if (error) throw error;
  return (data ?? []).reduce((sum, p) => sum + Number(p.monto), 0);
}
