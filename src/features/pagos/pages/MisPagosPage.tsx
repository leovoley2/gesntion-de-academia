import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Loader2, Upload, FileText } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { registrarPago, listarMisPagos, urlComprobante } from '../api/pagos.api';
import type { MetodoPago } from '../../../types/database.types';
import { Badge } from '../../../components/ui/Badge';

const METODOS: MetodoPago[] = ['Yape', 'Plin', 'Transferencia', 'Efectivo'];

// Planes de academia (mensual) con precio oficial de arenavoleibolclub.com
// + opción personalizada/otro monto. Se usa para renovaciones.
const PLANES = [
  { concepto: 'Plan Premium (4 veces/semana)', monto: 250 },
  { concepto: 'Plan Avanzado (3 veces/semana)', monto: 200 },
  { concepto: 'Plan Intermedio (2 veces/semana)', monto: 170 },
  { concepto: 'Plan Básico (1 vez/semana)', monto: 130 },
  { concepto: 'Clase personalizada / otro', monto: 0 },
];

export function MisPagosPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const alumnoId = session?.user.id ?? '';

  const [planIdx, setPlanIdx] = useState(0);
  const [monto, setMonto] = useState(PLANES[0].monto);
  const [metodo, setMetodo] = useState<MetodoPago>('Yape');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const { data: pagos, isLoading } = useQuery({
    queryKey: ['mis-pagos', alumnoId],
    queryFn: () => listarMisPagos(alumnoId),
    enabled: !!alumnoId,
  });

  const registrar = useMutation({
    mutationFn: () =>
      registrarPago({
        alumno_id: alumnoId,
        monto,
        concepto: PLANES[planIdx].concepto,
        metodo_pago: metodo,
        comprobante,
      }),
    onSuccess: () => {
      setMensaje('¡Pago registrado! El administrador lo revisará y lo aprobará.');
      setComprobante(null);
      qc.invalidateQueries({ queryKey: ['mis-pagos', alumnoId] });
    },
    onError: (e: Error) => setMensaje(`Error: ${e.message}`),
  });

  function elegirPlan(i: number) {
    setPlanIdx(i);
    // En "Clase personalizada" (monto 0) se vacía para que el alumno lo escriba,
    // en vez de heredar en silencio el monto del plan anterior.
    setMonto(PLANES[i].monto);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    if (monto <= 0) return setMensaje('Indica el monto del pago.');
    registrar.mutate();
  }

  async function ver(ruta: string) {
    const url = await urlComprobante(ruta);
    if (url) window.open(url, '_blank');
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4 pb-24">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 font-bold text-slate-800">
          <Upload className="h-5 w-5 text-brand-600" /> Registrar mi pago
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Elige tu plan, adjunta tu Yape/Plin/transferencia y el admin lo aprobará.
        </p>

        <form onSubmit={enviar} className="space-y-3">
          <div className="space-y-2">
            {PLANES.map((p, i) => (
              <button
                key={p.concepto}
                type="button"
                onClick={() => elegirPlan(i)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                  planIdx === i
                    ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <span>{p.concepto}</span>
                {p.monto > 0 && <span>S/ {p.monto}</span>}
              </button>
            ))}
          </div>

          {PLANES[planIdx].monto === 0 && (
            <div className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-brand-400">
              <span className="text-sm text-slate-400">S/</span>
              <input
                type="number"
                min={0}
                step="10"
                placeholder="Monto de la clase"
                value={monto || ''}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="w-full bg-transparent px-2 py-3 text-sm outline-none"
              />
            </div>
          )}

          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoPago)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400"
          >
            {METODOS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
            <FileText className="h-4 w-4" />
            {comprobante ? comprobante.name : 'Adjuntar comprobante (imagen o PDF)'}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          {mensaje && (
            <p className={`text-sm ${mensaje.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {mensaje}
            </p>
          )}

          <button
            type="submit"
            disabled={registrar.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {registrar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar pago
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <Wallet className="h-5 w-5 text-brand-600" /> Mis pagos
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : pagos && pagos.length > 0 ? (
          <ul className="space-y-2">
            {pagos.map((p) => (
              <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{p.concepto}</p>
                    <p className="text-xs text-slate-400">{p.metodo_pago}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">S/ {Number(p.monto).toFixed(2)}</p>
                    <Badge variante={p.estado === 'aprobado' ? 'verde' : 'ambar'}>{p.estado}</Badge>
                  </div>
                </div>
                {p.comprobante_url && (
                  <button
                    onClick={() => ver(p.comprobante_url!)}
                    className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2 text-xs font-medium text-brand-600"
                  >
                    <FileText className="h-3.5 w-3.5" /> Ver comprobante
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Aún no has registrado pagos.</p>
        )}
      </section>
    </div>
  );
}
