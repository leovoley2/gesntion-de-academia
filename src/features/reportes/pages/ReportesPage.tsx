import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Loader2, ChevronLeft, ChevronRight, TrendingUp, Users, Clock } from 'lucide-react';
import { reporteMensual } from '../api/reportes.api';

export function ReportesPage() {
  // Desplazamiento de meses: 0 = mes actual, -1 = mes anterior, etc.
  const [offset, setOffset] = useState(0);
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);

  const { data: r, isLoading } = useQuery({
    queryKey: ['reporte-mensual', offset],
    queryFn: () => reporteMensual(base),
  });

  const maxMetodo = Math.max(1, ...(r?.porMetodo.map((m) => m.monto) ?? [1]));

  return (
    <div className="pagina space-y-4">
      <h1 className="flex items-center gap-2 pt-2 text-lg font-bold text-slate-800">
        <BarChart3 className="h-5 w-5 text-brand-600" /> Reporte mensual
      </h1>

      {/* Selector de mes */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:max-w-md">
        <button
          onClick={() => setOffset(offset - 1)}
          className="rounded-lg p-2 text-slate-500 active:bg-slate-100"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold capitalize text-slate-800">
          {r?.mesEtiqueta ?? '—'}
        </span>
        <button
          onClick={() => setOffset(Math.min(0, offset + 1))}
          disabled={offset >= 0}
          className="rounded-lg p-2 text-slate-500 active:bg-slate-100 disabled:opacity-30"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {isLoading || !r ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tarjeta
              Icon={TrendingUp}
              titulo="Ingresos aprobados"
              valor={`S/ ${r.totalAprobado.toFixed(2)}`}
              sub={`${r.numPagos} pago(s)`}
              color="text-green-600"
            />
            <Tarjeta
              Icon={Clock}
              titulo="Por cobrar"
              valor={`S/ ${r.pendientesMonto.toFixed(2)}`}
              sub={`${r.numPendientes} pendiente(s)`}
              color="text-amber-600"
            />
            <Tarjeta
              Icon={Users}
              titulo="Nuevos alumnos"
              valor={String(r.nuevosAlumnos)}
              sub="registrados este mes"
              color="text-brand-600"
            />
            <Tarjeta
              Icon={BarChart3}
              titulo="Ticket promedio"
              valor={`S/ ${(r.numPagos ? r.totalAprobado / r.numPagos : 0).toFixed(0)}`}
              sub="por pago aprobado"
              color="text-slate-600"
            />
          </div>

          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
          {/* Ingresos por método de pago */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-700">Por método de pago</h2>
            {r.porMetodo.length === 0 ? (
              <p className="text-sm text-slate-400">Sin ingresos aprobados este mes.</p>
            ) : (
              <div className="space-y-2">
                {r.porMetodo.map((m) => (
                  <div key={m.metodo}>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{m.metodo}</span>
                      <span className="font-semibold">S/ {m.monto.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(m.monto / maxMetodo) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Ingresos por concepto */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-700">Por concepto</h2>
            {r.porConcepto.length === 0 ? (
              <p className="text-sm text-slate-400">Sin ingresos aprobados este mes.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {r.porConcepto.map((c) => (
                  <li key={c.concepto} className="flex justify-between py-2 text-sm">
                    <span className="min-w-0 truncate pr-2 text-slate-600">{c.concepto}</span>
                    <span className="shrink-0 font-semibold text-slate-800">
                      S/ {c.monto.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </div>
        </>
      )}
    </div>
  );
}

function Tarjeta({
  Icon,
  titulo,
  valor,
  sub,
  color,
}: {
  Icon: typeof Users;
  titulo: string;
  valor: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className={`h-5 w-5 ${color}`} />
      <p className="mt-2 text-xs text-slate-400">{titulo}</p>
      <p className="text-lg font-bold text-slate-800">{valor}</p>
      <p className="text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}
