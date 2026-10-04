import { Loader2, Clock, MapPin } from 'lucide-react';
import { listarMisReservas } from '../api/reservas.api';
import type { EstadoReserva } from '../../../types/database.types';
import { Badge } from '../../../components/ui/Badge';
import { CargarMas } from '../../../components/ui/CargarMas';
import { usePaginado } from '../../../lib/paginacion';

const BADGE: Record<EstadoReserva, { v: 'verde' | 'rojo' | 'ambar' | 'gris'; t: string }> = {
  pendiente: { v: 'ambar', t: 'Pendiente' },
  confirmada: { v: 'verde', t: 'Confirmada' },
  cancelada: { v: 'rojo', t: 'Cancelada' },
  realizada: { v: 'gris', t: 'Realizada' },
};

export function MisReservas({ alumnoId }: { alumnoId: string }) {
  const {
    items: reservas,
    total,
    isLoading,
    hayMas,
    cargandoMas,
    cargarMas,
  } = usePaginado(['mis-reservas', alumnoId], (pagina) => listarMisReservas(alumnoId, pagina), {
    enabled: !!alumnoId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!reservas || reservas.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
        Aún no tienes solicitudes. Reserva una clase abajo.
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {reservas.map((r) => (
          <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold capitalize text-slate-800">
                {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-PE', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
              <Badge variante={BADGE[r.estado].v}>{BADGE[r.estado].t}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}
              </span>
              {r.entrenador && <span>· {r.entrenador.nombre_completo}</span>}
              {r.sede && (
                <span className="flex items-center gap-1">
                  · <MapPin className="h-3 w-3" /> {r.sede.nombre}
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
      <CargarMas
        hayMas={hayMas}
        cargando={cargandoMas}
        onClick={cargarMas}
        mostrados={reservas.length}
        total={total}
      />
    </div>
  );
}
