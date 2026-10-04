import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox, Loader2, Check, X, CalendarCheck } from 'lucide-react';
import {
  listarSolicitudes,
  actualizarEstadoReserva,
  MODALIDADES_RESERVA,
  type ReservaConDatos,
} from '../api/reservas.api';
import type { EstadoReserva } from '../../../types/database.types';
import { Badge } from '../../../components/ui/Badge';

interface Props {
  entrenadorId?: string; // si se pasa, filtra por ese entrenador
}

const BADGE: Record<EstadoReserva, { v: 'verde' | 'rojo' | 'ambar' | 'gris'; t: string }> = {
  pendiente: { v: 'ambar', t: 'pendiente' },
  confirmada: { v: 'verde', t: 'confirmada' },
  cancelada: { v: 'rojo', t: 'cancelada' },
  realizada: { v: 'gris', t: 'realizada' },
};

export function SolicitudesReserva({ entrenadorId }: Props) {
  const qc = useQueryClient();
  const clave = ['solicitudes', entrenadorId ?? 'todas'];

  const { data: reservas, isLoading } = useQuery({
    queryKey: clave,
    queryFn: () => listarSolicitudes(entrenadorId),
  });

  const cambiar = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoReserva }) =>
      actualizarEstadoReserva(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: clave }),
    onError: (e: Error) => alert(e.message),
  });

  const pendientes = (reservas ?? []).filter((r) => r.estado === 'pendiente');
  const otras = (reservas ?? []).filter((r) => r.estado !== 'pendiente');

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-bold text-slate-800">
        <Inbox className="h-5 w-5 text-brand-600" /> Solicitudes de reserva
        {pendientes.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {pendientes.length} pendiente(s)
          </span>
        )}
      </h2>

      {(reservas ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No hay solicitudes.</p>
      ) : (
        <ul className="space-y-2">
          {[...pendientes, ...otras].map((r) => (
            <Fila key={r.id} r={r} onCambiar={cambiar.mutate} guardando={cambiar.isPending} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Fila({
  r,
  onCambiar,
  guardando,
}: {
  r: ReservaConDatos;
  onCambiar: (v: { id: string; estado: EstadoReserva }) => void;
  guardando: boolean;
}) {
  const fecha = new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">
            {r.alumno?.nombre_completo ?? 'Alumno'}
          </p>
          <p className="text-xs capitalize text-slate-400">
            {fecha} · {r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}
            {r.sede ? ` · ${r.sede.nombre}` : ''}
          </p>
          <p className="mt-0.5 text-xs font-medium text-brand-600">
            {MODALIDADES_RESERVA.find((m) => m.valor === r.modalidad)?.etiqueta ?? 'Solo (1)'}
          </p>
        </div>
        <Badge variante={BADGE[r.estado].v}>{BADGE[r.estado].t}</Badge>
      </div>

      {r.estado === 'pendiente' && (
        <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
          <button
            disabled={guardando}
            onClick={() => onCambiar({ id: r.id, estado: 'confirmada' })}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500 py-2 text-xs font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> Confirmar
          </button>
          <button
            disabled={guardando}
            onClick={() => onCambiar({ id: r.id, estado: 'cancelada' })}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 py-2 text-xs font-semibold text-slate-600 active:scale-95 disabled:opacity-60"
          >
            <X className="h-4 w-4" /> Rechazar
          </button>
        </div>
      )}

      {r.estado === 'confirmada' && (
        <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
          <button
            disabled={guardando}
            onClick={() => onCambiar({ id: r.id, estado: 'realizada' })}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            <CalendarCheck className="h-4 w-4" /> Marcar realizada
          </button>
          <button
            disabled={guardando}
            onClick={() => onCambiar({ id: r.id, estado: 'cancelada' })}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 py-2 text-xs font-semibold text-slate-600 active:scale-95 disabled:opacity-60"
          >
            <X className="h-4 w-4" /> {r.pago_id ? 'Cancelar (anula cobro)' : 'Cancelar (repone crédito)'}
          </button>
        </div>
      )}
    </li>
  );
}
