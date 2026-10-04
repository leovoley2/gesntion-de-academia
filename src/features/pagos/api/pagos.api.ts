import { supabase } from '../../../lib/supabaseClient';
import type { Pago, MetodoPago, Perfil } from '../../../types/database.types';
import { rango, type Pagina } from '../../../lib/paginacion';

export interface PagoConAlumno extends Pago {
  alumno: { nombre_completo: string } | null;
}

export async function listarPagos(pagina = 0): Promise<Pagina<PagoConAlumno>> {
  const { data, error, count } = await supabase
    .from('pagos')
    .select('*, alumno:perfiles!alumno_id(nombre_completo)', { count: 'exact' })
    .order('fecha_pago', { ascending: false })
    .order('id')
    .range(...rango(pagina))
    .returns<PagoConAlumno[]>();
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}

/** Pagos del propio alumno (los ve por RLS). */
export async function listarMisPagos(alumnoId: string, pagina = 0): Promise<Pagina<Pago>> {
  const { data, error, count } = await supabase
    .from('pagos')
    .select('*', { count: 'exact' })
    .eq('alumno_id', alumnoId)
    .order('fecha_pago', { ascending: false })
    .order('id')
    .range(...rango(pagina));
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
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

/** Sube el comprobante a la carpeta del alumno en Storage; devuelve su ruta (o null si no hay). */
export async function subirComprobante(alumnoId: string, archivo: File | null | undefined): Promise<string | null> {
  if (!archivo) return null;
  // El bucket rechaza >5 MB y tipos no permitidos; avisamos antes de subir.
  if (archivo.size > 5 * 1024 * 1024) {
    throw new Error('El comprobante supera los 5 MB. Sube una imagen más ligera o un PDF.');
  }
  const ext = archivo.name.split('.').pop() ?? 'jpg';
  const ruta = `${alumnoId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('comprobantes')
    .upload(ruta, archivo, { upsert: false });
  if (error) throw error;
  return ruta;
}

/** Sube el comprobante (si hay) a Storage y registra el pago como 'pendiente'. */
export async function registrarPago(d: DatosPago): Promise<void> {
  const comprobante_url = await subirComprobante(d.alumno_id, d.comprobante);

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

/** Total de ingresos aprobados del mes en curso (sumado en la BD, hora de Perú). */
export async function ingresosDelMes(): Promise<number> {
  const { data, error } = await supabase.rpc('metricas_admin');
  if (error) throw error;
  return Number(data.ingresosMes);
}
