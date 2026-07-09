import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Loader2, CheckCircle2, Send, Users } from 'lucide-react';
import {
  obtenerDisponibilidad,
  crearReserva,
  precioModalidad,
  MODALIDADES_RESERVA,
  type Bloque,
} from '../api/reservas.api';
import type { ModalidadPersonalizada } from '../../../types/database.types';

interface Props {
  alumnoId: string;
  entrenadorId: string;
  entrenadorNombre?: string;
  sedeId: string;
  tarifas?: { modalidad: string; precio_por_atleta: number }[];
  onReservaCreada?: () => void;
}

export function CalendarioReservaPersonalizada({
  alumnoId,
  entrenadorId,
  entrenadorNombre,
  sedeId,
  tarifas = [],
  onReservaCreada,
}: Props) {
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState<Bloque | null>(null);
  const [modalidad, setModalidad] = useState<ModalidadPersonalizada>('individual');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const precio = precioModalidad(tarifas, modalidad);

  function cargar() {
    setCargando(true);
    obtenerDisponibilidad(entrenadorId)
      .then(setBloques)
      .catch(console.error)
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    let activo = true;
    setCargando(true);
    obtenerDisponibilidad(entrenadorId)
      .then((data) => activo && setBloques(data))
      .catch(console.error)
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [entrenadorId]);

  const porFecha = useMemo(() => {
    return bloques.reduce<Record<string, Bloque[]>>((acc, b) => {
      (acc[b.fecha] ??= []).push(b);
      return acc;
    }, {});
  }, [bloques]);

  async function confirmar() {
    if (!seleccion) return;
    setEnviando(true);
    setError(null);
    try {
      await crearReserva({ alumnoId, entrenadorId, sedeId, bloque: seleccion, modalidad });
      setExito(true);
      setSeleccion(null);
      cargar();
      onReservaCreada?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (exito) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" />
        <p className="text-lg font-bold text-slate-800">¡Solicitud enviada!</p>
        <p className="mt-1 text-sm text-slate-500">
          El entrenador la revisará y te confirmará. Puedes solicitar otra cuando quieras.
        </p>
        <button
          onClick={() => setExito(false)}
          className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          Reservar otra clase
        </button>
      </div>
    );
  }

  if (bloques.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">
        {entrenadorNombre ?? 'Este entrenador'} no tiene horarios personalizados disponibles por ahora.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-3 pb-32">
      {/* Selector de modalidad: solo / dúo / grupo */}
      <section className="pt-4">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-800">
          <Users className="h-5 w-5 text-brand-600" /> ¿Vas solo o en grupo?
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Elige la modalidad. El precio es por persona.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MODALIDADES_RESERVA.map((m) => {
            const p = precioModalidad(tarifas, m.valor);
            const activo = modalidad === m.valor;
            return (
              <button
                key={m.valor}
                onClick={() => setModalidad(m.valor)}
                disabled={p === 0}
                className={`rounded-xl border p-3 text-left transition disabled:opacity-40 ${
                  activo
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <p className="text-sm font-semibold">{m.etiqueta}</p>
                <p className="text-xs text-slate-400">{m.detalle}</p>
                {p > 0 && <p className="mt-1 text-sm font-bold text-brand-700">S/ {p.toFixed(0)}</p>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between py-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <CalendarDays className="h-5 w-5 text-brand-600" /> Elige tu horario
        </h2>
        {precio > 0 && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
            S/ {precio.toFixed(0)} / sesión
          </span>
        )}
      </div>

      <p className="mb-3 text-xs text-slate-400">
        Toca un horario para seleccionarlo y luego confirma tu solicitud abajo.
      </p>

      <div className="space-y-5">
        {Object.entries(porFecha).map(([fecha, slots]) => (
          <section key={fecha}>
            <h3 className="mb-2 text-sm font-semibold capitalize text-slate-600">
              {new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {slots.map((bloque) => {
                const elegido = seleccion?.id === bloque.id;
                return (
                  <button
                    key={bloque.id}
                    onClick={() => setSeleccion(elegido ? null : bloque)}
                    className={`flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-medium transition active:scale-95 ${
                      elegido
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400'
                    }`}
                  >
                    <Clock className={`h-4 w-4 ${elegido ? 'text-white' : 'text-brand-500'}`} />
                    {bloque.hora_inicio.slice(0, 5)} – {bloque.hora_fin.slice(0, 5)}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Barra de confirmación fija */}
      {seleccion && (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-md px-3">
          <div className="rounded-2xl border border-brand-200 bg-white p-3 shadow-lg">
            <p className="text-xs text-slate-500">Has elegido</p>
            <p className="text-sm font-semibold text-slate-800">
              {new Date(seleccion.fecha + 'T00:00:00').toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}{' '}
              · {seleccion.hora_inicio.slice(0, 5)}–{seleccion.hora_fin.slice(0, 5)}
              {' · '}
              {MODALIDADES_RESERVA.find((m) => m.valor === modalidad)?.etiqueta}
              {precio > 0 && <span className="text-brand-700"> · S/ {precio.toFixed(0)}</span>}
            </p>
            <button
              onClick={confirmar}
              disabled={enviando}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Solicitar reserva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
