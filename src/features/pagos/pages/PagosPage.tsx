import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Loader2, Plus, Check, FileText, TrendingUp, RefreshCw } from 'lucide-react';
import {
  listarPagos,
  listarAlumnosPago,
  registrarPago,
  aprobarPago,
  urlComprobante,
  ingresosDelMes,
  type DatosPago,
} from '../api/pagos.api';
import type { MetodoPago } from '../../../types/database.types';
import { Badge } from '../../../components/ui/Badge';

const METODOS: MetodoPago[] = ['Yape', 'Plin', 'Transferencia', 'Efectivo'];

const VACIO: DatosPago = {
  alumno_id: '',
  monto: 0,
  concepto: '',
  metodo_pago: 'Yape',
  comprobante: null,
};

export function PagosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<DatosPago>(VACIO);
  const [error, setError] = useState<string | null>(null);

  // Panel siempre fresco: trae lo último al abrir y al volver a la pestaña,
  // para no perderse pagos que el alumno registre con el panel ya abierto.
  const { data: pagos, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['pagos'],
    queryFn: listarPagos,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const { data: alumnos } = useQuery({ queryKey: ['alumnos'], queryFn: listarAlumnosPago });
  const { data: ingresos } = useQuery({
    queryKey: ['ingresos-mes'],
    queryFn: ingresosDelMes,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  function actualizar() {
    qc.invalidateQueries({ queryKey: ['pagos'] });
    qc.invalidateQueries({ queryKey: ['ingresos-mes'] });
    refetch();
  }

  const registrar = useMutation({
    mutationFn: registrarPago,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['ingresos-mes'] });
      setForm({ ...VACIO });
    },
    onError: (e: Error) => setError(e.message),
  });

  const aprobar = useMutation({
    mutationFn: aprobarPago,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['ingresos-mes'] });
    },
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.alumno_id) return setError('Selecciona un alumno.');
    if (form.monto <= 0) return setError('El monto debe ser mayor a 0.');
    registrar.mutate(form);
  }

  async function verComprobante(ruta: string) {
    const url = await urlComprobante(ruta);
    if (url) window.open(url, '_blank');
    else alert('No se pudo abrir el comprobante.');
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4 pb-24">
      {/* Reporte de ingresos */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <TrendingUp className="h-4 w-4 text-green-600" /> Ingresos aprobados este mes
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-800">
          S/ {(ingresos ?? 0).toFixed(2)}
        </p>
      </div>

      {/* Registrar pago */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <Plus className="h-5 w-5 text-brand-600" /> Registrar pago
        </h2>
        <form onSubmit={enviar} className="space-y-3">
          <select
            value={form.alumno_id}
            onChange={(e) => setForm({ ...form, alumno_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">— Alumno —</option>
            {alumnos?.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre_completo}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <div className="flex flex-1 items-center rounded-xl border border-slate-200 px-3 focus-within:border-brand-400">
              <span className="text-sm text-slate-400">S/</span>
              <input
                type="number"
                min={0}
                step="0.5"
                placeholder="Monto"
                value={form.monto || ''}
                onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })}
                className="w-full bg-transparent px-2 py-3 text-sm outline-none"
              />
            </div>
            <select
              value={form.metodo_pago}
              onChange={(e) => setForm({ ...form, metodo_pago: e.target.value as MetodoPago })}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-400"
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <input
            placeholder="Concepto (ej. Mensualidad junio)"
            value={form.concepto}
            onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
            <FileText className="h-4 w-4" />
            {form.comprobante ? form.comprobante.name : 'Adjuntar comprobante (opcional)'}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setForm({ ...form, comprobante: e.target.files?.[0] ?? null })}
              className="hidden"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={registrar.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {registrar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar pago
          </button>
        </form>
      </section>

      {/* Lista de pagos */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-800">
            <Wallet className="h-5 w-5 text-brand-600" /> Pagos
            {pagos && <span className="text-sm font-normal text-slate-400">({pagos.length})</span>}
          </h2>
          <button
            onClick={actualizar}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 active:bg-brand-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : pagos && pagos.length > 0 ? (
          <ul className="space-y-2">
            {pagos.map((p) => (
              <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {p.alumno?.nombre_completo ?? 'Alumno'}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {p.concepto} · {p.metodo_pago}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">S/ {Number(p.monto).toFixed(2)}</p>
                    <Badge variante={p.estado === 'aprobado' ? 'verde' : 'ambar'}>{p.estado}</Badge>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                  {p.comprobante_url && (
                    <button
                      onClick={() => verComprobante(p.comprobante_url!)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 active:bg-brand-50"
                    >
                      <FileText className="h-3.5 w-3.5" /> Ver comprobante
                    </button>
                  )}
                  {p.estado === 'pendiente' && (
                    <button
                      onClick={() => aprobar.mutate(p.id)}
                      disabled={aprobar.isPending}
                      className="ml-auto flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white active:scale-95 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" /> Aprobar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Aún no hay pagos registrados.</p>
        )}
      </section>
    </div>
  );
}
