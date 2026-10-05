import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CreditCard, Hourglass, Sparkles } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Badge } from '../../../components/ui/Badge';
import { miMembresia } from '../api/dashboard.api';

const usaCreditos = (t?: string) => t === 'paquete_clases' || t === 'personalizado';

function formatearFecha(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function diasHasta(iso: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + 'T00:00:00').getTime() - hoy.getTime()) / 86400000);
}

export function DashboardAlumno() {
  const { session, perfil } = useAuth();
  const { data: membresia, isLoading } = useQuery({
    queryKey: ['mi-membresia', session?.user.id],
    queryFn: () => miMembresia(session!.user.id),
    enabled: !!session,
  });

  const sinClases =
    membresia && usaCreditos(membresia.tipo_membresia) && membresia.clases_disponibles === 0;
  const variante = !membresia
    ? 'gris'
    : membresia.estado === 'pendiente'
      ? 'ambar'
      : membresia.estado === 'vencida' || sinClases
        ? 'rojo'
        : membresia.estado === 'congelada'
          ? 'ambar'
          : 'verde';

  const proximoPago =
    membresia?.estado === 'activa' && membresia.tipo_membresia === 'mensual' && membresia.fecha_fin
      ? membresia.fecha_fin
      : null;

  return (
    <div className="pagina space-y-4">
      <h1 className="text-lg font-bold text-slate-800">Hola, {perfil?.nombre_completo}</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Mi membresía</p>
          {membresia && (
            <Badge variante={variante}>
              {membresia.estado === 'pendiente'
                ? 'en revisión'
                : sinClases
                  ? 'sin clases'
                  : membresia.estado}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <p className="mt-2 text-sm text-slate-400">Cargando…</p>
        ) : !membresia ? (
          <div className="mt-2">
            <p className="text-sm text-slate-400">Aún no tienes un plan.</p>
            <Link
              to="/inscripcion"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95"
            >
              <Sparkles className="h-4 w-4" /> Elegir mi plan
            </Link>
          </div>
        ) : membresia.estado === 'pendiente' ? (
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <Hourglass className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Tu solicitud está en revisión. La administración validará tu pago y activará tu plan
              muy pronto.
            </p>
          </div>
        ) : usaCreditos(membresia.tipo_membresia) ? (
          <div className="mt-2">
            <p className="text-3xl font-bold text-slate-800">
              {membresia.clases_disponibles}
              <span className="text-base font-normal text-slate-400"> clases disponibles</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
              <span>
                Inicio: <b className="text-slate-700">{formatearFecha(membresia.fecha_inicio)}</b>
              </span>
              {membresia.fecha_fin && (
                <span>
                  Vence: <b className="text-slate-700">{formatearFecha(membresia.fecha_fin)}</b>
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-xl font-bold capitalize text-slate-800">
              Plan {membresia.tipo_membresia}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
              <span>
                Inicio: <b className="text-slate-700">{formatearFecha(membresia.fecha_inicio)}</b>
              </span>
              {membresia.fecha_fin && (
                <span>
                  Vence: <b className="text-slate-700">{formatearFecha(membresia.fecha_fin)}</b>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {proximoPago && (
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            diasHasta(proximoPago) <= 5
              ? 'border-amber-200 bg-amber-50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-sm font-semibold text-slate-700">Próximo pago</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{formatearFecha(proximoPago)}</p>
          <p className="text-xs text-slate-400">
            {diasHasta(proximoPago) > 0
              ? `En ${diasHasta(proximoPago)} día(s)`
              : '¡Tu membresía vence hoy! Renueva para no perder tu cupo.'}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          to="/reservas"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <CalendarDays className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Reservar clase personalizada</p>
            <p className="text-xs text-slate-400">Elige entrenador y horario</p>
          </div>
        </Link>

        <Link
          to="/mis-pagos"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <CreditCard className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Mis pagos</p>
            <p className="text-xs text-slate-400">Registra tu pago y revisa su estado</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
