import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, FileText, Loader2, Phone, UserPlus, X } from 'lucide-react';
import {
  aprobarIngreso,
  listarSolicitudesIngreso,
  rechazarIngreso,
  type SolicitudIngreso,
} from '../api/ingresos.api';
import { urlComprobante } from '../../pagos/api/pagos.api';
import { Badge } from '../../../components/ui/Badge';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function NuevosIngresosPage() {
  const qc = useQueryClient();

  const { data: solicitudes, isLoading } = useQuery({
    queryKey: ['nuevos-ingresos'],
    queryFn: listarSolicitudesIngreso,
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['nuevos-ingresos'] });
    qc.invalidateQueries({ queryKey: ['pagos'] });
  };

  const aprobar = useMutation({
    mutationFn: ({ id, pagoId }: { id: string; pagoId?: string }) => aprobarIngreso(id, pagoId),
    onSuccess: refrescar,
    onError: (e: Error) => alert(e.message),
  });

  const rechazar = useMutation({
    mutationFn: (id: string) => rechazarIngreso(id),
    onSuccess: refrescar,
    onError: (e: Error) => alert(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4 pb-24">
      <h1 className="flex items-center gap-2 pt-2 text-lg font-bold text-slate-800">
        <UserPlus className="h-5 w-5 text-brand-600" /> Nuevos ingresos
        {solicitudes && solicitudes.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {solicitudes.length} por revisar
          </span>
        )}
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : !solicitudes || solicitudes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
          No hay solicitudes pendientes. Cuando alguien se inscriba aparecerá aquí.
        </p>
      ) : (
        <ul className="space-y-3">
          {solicitudes.map((s) => (
            <TarjetaSolicitud
              key={s.id}
              s={s}
              procesando={aprobar.isPending || rechazar.isPending}
              onAprobar={(pagoId) => aprobar.mutate({ id: s.id, pagoId })}
              onRechazar={() => {
                if (confirm('¿Rechazar esta solicitud? Se eliminará y el pago quedará para gestión manual.')) {
                  rechazar.mutate(s.id);
                }
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TarjetaSolicitud({
  s,
  procesando,
  onAprobar,
  onRechazar,
}: {
  s: SolicitudIngreso;
  procesando: boolean;
  onAprobar: (pagoId?: string) => void;
  onRechazar: () => void;
}) {
  const pago = s.pagos[0];

  async function verComprobante(ruta: string) {
    const url = await urlComprobante(ruta);
    if (url) window.open(url, '_blank');
  }

  return (
    <li className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold capitalize text-slate-800">
            {s.alumno?.nombre_completo ?? 'Alumno'}
          </p>
          {s.alumno?.telefono && (
            <a
              href={`https://wa.me/51${s.alumno.telefono.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-brand-600"
            >
              <Phone className="h-3 w-3" /> {s.alumno.telefono}
            </a>
          )}
        </div>
        <Badge variante="ambar">pendiente</Badge>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 text-sm">
        <p className="font-semibold text-slate-700">
          {s.plan
            ? `Plan ${s.plan.nombre} · S/ ${Number(s.plan.precio_mensual).toFixed(0)}/mes`
            : `Paquete personalizado · ${s.clases_totales} sesiones`}
        </p>
        {s.inscripciones.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Días:{' '}
            {s.inscripciones
              .filter((i) => i.horario)
              .map(
                (i) =>
                  `${DIAS[i.horario!.dia_semana]} ${i.horario!.hora_inicio.slice(0, 5)}${
                    i.horario!.sede ? ` (${i.horario!.sede.nombre})` : ''
                  }`
              )
              .join(' · ')}
          </p>
        )}
        {!s.plan && pago && <p className="mt-1 text-xs text-slate-500">{pago.concepto}</p>}
      </div>

      {pago ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-600">
            Pago: <b>S/ {Number(pago.monto).toFixed(2)}</b> · {pago.metodo_pago}
          </p>
          {pago.comprobante_url ? (
            <button
              onClick={() => verComprobante(pago.comprobante_url!)}
              className="flex items-center gap-1 text-xs font-medium text-brand-600"
            >
              <FileText className="h-3.5 w-3.5" /> Ver comprobante
            </button>
          ) : (
            <span className="text-xs text-slate-400">sin comprobante</span>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-600">⚠ La solicitud no registró pago.</p>
      )}

      <div className="flex gap-2 border-t border-slate-100 pt-3">
        <button
          disabled={procesando}
          onClick={() => onAprobar(pago?.id)}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500 py-2.5 text-xs font-semibold text-white active:scale-95 disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> Aprobar ingreso
        </button>
        <button
          disabled={procesando}
          onClick={onRechazar}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 py-2.5 text-xs font-semibold text-slate-600 active:scale-95 disabled:opacity-60"
        >
          <X className="h-4 w-4" /> Rechazar
        </button>
      </div>
    </li>
  );
}
