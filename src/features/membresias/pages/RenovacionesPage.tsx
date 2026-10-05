import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Loader2, RefreshCw, Phone, AlertTriangle, Snowflake, Play } from 'lucide-react';
import {
  listarMensualidades,
  renovarMembresia,
  type MembresiaAlumno,
} from '../api/renovaciones.api';
import { actualizarEstado } from '../api/membresias.api';
import type { EstadoMembresia } from '../../../types/database.types';
import { Badge } from '../../../components/ui/Badge';

function diasHasta(iso: string | null): number | null {
  if (!iso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + 'T00:00:00').getTime() - hoy.getTime()) / 86400000);
}

function formatear(iso: string | null): string {
  if (!iso) return 'sin fecha';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function mensajeWhatsApp(m: MembresiaAlumno): string {
  const nombre = m.alumno?.nombre_completo?.split(' ')[0] ?? '';
  const d = diasHasta(m.fecha_fin);
  const cuando =
    d === null ? '' : d < 0 ? ' venció el ' + formatear(m.fecha_fin) : d === 0 ? ' vence hoy' : ` vence el ${formatear(m.fecha_fin)}`;
  const plan = m.plan?.nombre ? ` del plan ${m.plan.nombre}` : '';
  return encodeURIComponent(
    `¡Hola ${nombre}! Te saluda Arena Voleibol Club 🏐. Tu mensualidad${plan}${cuando}. ` +
      `Cuando quieras renovar, avísanos y te reservamos tu cupo. ¡Gracias!`
  );
}

export function RenovacionesPage() {
  const qc = useQueryClient();
  const { data: membresias, isLoading } = useQuery({
    queryKey: ['mensualidades'],
    queryFn: listarMensualidades,
  });

  const renovar = useMutation({
    mutationFn: (id: string) => renovarMembresia(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mensualidades'] });
      qc.invalidateQueries({ queryKey: ['metricas-admin'] });
    },
    onError: (e: Error) => alert(e.message),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoMembresia }) =>
      actualizarEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mensualidades'] }),
    onError: (e: Error) => alert(e.message),
  });

  // Orden: primero lo urgente (vencidas y por vencer), luego el resto.
  const ordenadas = useMemo(() => {
    return [...(membresias ?? [])].sort((a, b) => {
      const da = diasHasta(a.fecha_fin) ?? 9999;
      const db = diasHasta(b.fecha_fin) ?? 9999;
      return da - db;
    });
  }, [membresias]);

  const porVencer = ordenadas.filter((m) => {
    const d = diasHasta(m.fecha_fin);
    return d !== null && d <= 5;
  }).length;

  return (
    <div className="pagina space-y-4">
      <h1 className="flex items-center gap-2 pt-2 text-lg font-bold text-slate-800">
        <CalendarClock className="h-5 w-5 text-brand-600" /> Renovaciones
        {porVencer > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {porVencer} por vencer
          </span>
        )}
      </h1>
      <p className="-mt-2 text-xs text-slate-400">
        Mensualidades ordenadas por vencimiento. Renueva al confirmar el pago o envía un recordatorio.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : ordenadas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
          No hay mensualidades activas todavía.
        </p>
      ) : (
        <ul className="lista-tarjetas">
          {ordenadas.map((m) => {
            const d = diasHasta(m.fecha_fin);
            const vencida = m.estado === 'vencida' || (d !== null && d < 0);
            const urgente = !vencida && d !== null && d <= 5;
            const tel = m.alumno?.telefono?.replace(/\D/g, '');
            return (
              <li
                key={m.id}
                className={`rounded-2xl border p-3 shadow-sm ${
                  vencida
                    ? 'border-red-200 bg-red-50'
                    : urgente
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold capitalize text-slate-800">
                      {m.alumno?.nombre_completo ?? 'Alumno'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {m.plan?.nombre ? `Plan ${m.plan.nombre}` : 'Mensual'}
                      {m.plan?.precio_mensual
                        ? ` · S/ ${Number(m.plan.precio_mensual).toFixed(0)}/mes`
                        : ''}
                    </p>
                  </div>
                  {vencida ? (
                    <Badge variante="rojo">vencida</Badge>
                  ) : m.estado === 'congelada' ? (
                    <Badge variante="ambar">congelada</Badge>
                  ) : (
                    <Badge variante={urgente ? 'ambar' : 'verde'}>activa</Badge>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  {(vencida || urgente) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  <span>
                    {d === null
                      ? 'Sin fecha de vencimiento'
                      : d < 0
                        ? `Venció el ${formatear(m.fecha_fin)} (hace ${Math.abs(d)} día${Math.abs(d) === 1 ? '' : 's'})`
                        : d === 0
                          ? 'Vence hoy'
                          : `Vence el ${formatear(m.fecha_fin)} · en ${d} día${d === 1 ? '' : 's'}`}
                  </span>
                </div>

                <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
                  <button
                    disabled={renovar.isPending}
                    onClick={() => {
                      if (confirm(`¿Renovar un mes a ${m.alumno?.nombre_completo}?`)) renovar.mutate(m.id);
                    }}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white active:scale-95 disabled:opacity-60"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Renovar 1 mes
                  </button>
                  {tel && (
                    <a
                      href={`https://wa.me/51${tel}?text=${mensajeWhatsApp(m)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500 py-2 text-xs font-semibold text-white active:scale-95"
                    >
                      <Phone className="h-3.5 w-3.5" /> Recordar
                    </a>
                  )}
                </div>

                <div className="mt-1.5 flex justify-end">
                  {m.estado === 'congelada' ? (
                    <button
                      disabled={cambiarEstado.isPending}
                      onClick={() => cambiarEstado.mutate({ id: m.id, estado: 'activa' })}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-green-600 active:bg-green-50 disabled:opacity-60"
                    >
                      <Play className="h-3.5 w-3.5" /> Descongelar
                    </button>
                  ) : (
                    <button
                      disabled={cambiarEstado.isPending}
                      onClick={() => cambiarEstado.mutate({ id: m.id, estado: 'congelada' })}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-600 active:bg-amber-50 disabled:opacity-60"
                    >
                      <Snowflake className="h-3.5 w-3.5" /> Congelar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
