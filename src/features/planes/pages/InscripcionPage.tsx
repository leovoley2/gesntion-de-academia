import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  MODALIDADES,
  PAQUETES,
  crearSolicitudAcademia,
  crearSolicitudPersonalizada,
  listarEntrenadoresConTarifas,
  listarPlanes,
  miSolicitudOMembresia,
  precioPaquete,
  type EntrenadorConTarifas,
} from '../api/planes.api';
import { listarHorarios, type HorarioConDatos } from '../../horarios/api/horarios.api';
import type { MetodoPago, ModalidadPersonalizada, Plan } from '../../../types/database.types';

const METODOS: MetodoPago[] = ['Yape', 'Plin', 'Transferencia', 'Efectivo'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type Paso = 'tipo' | 'plan' | 'dias' | 'personalizada' | 'pago' | 'listo';

export function InscripcionPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const alumnoId = session?.user.id ?? '';

  const [paso, setPaso] = useState<Paso>('tipo');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [horarioIds, setHorarioIds] = useState<string[]>([]);
  const [entrenador, setEntrenador] = useState<EntrenadorConTarifas | null>(null);
  const [modalidad, setModalidad] = useState<ModalidadPersonalizada>('individual');
  const [sesiones, setSesiones] = useState<number>(4);
  const [metodo, setMetodo] = useState<MetodoPago>('Yape');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: existente, isLoading: cargandoExistente } = useQuery({
    queryKey: ['mi-solicitud', alumnoId],
    queryFn: () => miSolicitudOMembresia(alumnoId),
    enabled: !!alumnoId,
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (plan) {
        await crearSolicitudAcademia({ alumnoId, plan, horarioIds, metodo, comprobante });
      } else if (entrenador) {
        await crearSolicitudPersonalizada({
          alumnoId,
          entrenador,
          modalidad,
          sesiones,
          precioTotal: precioPaquete(entrenador, modalidad, sesiones),
          metodo,
          comprobante,
        });
      }
    },
    onSuccess: () => {
      setPaso('listo');
      qc.invalidateQueries({ queryKey: ['mi-solicitud', alumnoId] });
      qc.invalidateQueries({ queryKey: ['mi-membresia', alumnoId] });
    },
    onError: (e: Error) => setError(`No se pudo enviar: ${e.message}`),
  });

  const monto = plan
    ? Number(plan.precio_mensual)
    : entrenador
      ? precioPaquete(entrenador, modalidad, sesiones)
      : 0;

  if (cargandoExistente) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Ya tiene una solicitud en revisión o un plan activo.
  if (existente && paso !== 'listo') {
    const pendiente = existente.estado === 'pendiente';
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <CheckCircle2 className={`mx-auto mb-3 h-12 w-12 ${pendiente ? 'text-amber-500' : 'text-green-500'}`} />
        <p className="text-lg font-bold text-slate-800">
          {pendiente ? 'Tu solicitud está en revisión' : 'Ya tienes un plan activo'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {pendiente
            ? 'La administración validará tu pago y te confirmará muy pronto.'
            : 'Puedes ver tu membresía y próximos pagos en tu inicio.'}
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          Ir a mi inicio
        </Link>
      </div>
    );
  }

  if (paso === 'listo') {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" />
        <p className="text-lg font-bold text-slate-800">¡Solicitud enviada!</p>
        <p className="mt-1 text-sm text-slate-500">
          La administración validará tu pago y activará tu plan. Te avisaremos por WhatsApp.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          Ir a mi inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4 pb-24">
      <header className="flex items-center gap-2 pt-2">
        {paso !== 'tipo' && (
          <button
            onClick={() => {
              setError(null);
              setPaso(paso === 'pago' ? (plan ? 'dias' : 'personalizada') : 'tipo');
            }}
            className="rounded-lg p-1.5 text-slate-500 active:bg-slate-100"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg font-bold text-slate-800">Elige tu plan</h1>
      </header>

      {paso === 'tipo' && (
        <div className="space-y-3">
          <button
            onClick={() => setPaso('plan')}
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[0.98]"
          >
            <CircleDot className="h-8 w-8 shrink-0 text-brand-600" />
            <div>
              <p className="font-bold text-slate-800">Academia Arena Voleibol Club</p>
              <p className="text-xs text-slate-400">
                Clases grupales · desde S/ 130 al mes · primer entrenamiento gratis
              </p>
            </div>
          </button>
          <button
            onClick={() => setPaso('personalizada')}
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[0.98]"
          >
            <Sparkles className="h-8 w-8 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold text-slate-800">Clases personalizadas</p>
              <p className="text-xs text-slate-400">
                Entrenamiento a tu medida · individual, dúo o grupo · paquetes con descuento
              </p>
            </div>
          </button>
        </div>
      )}

      {paso === 'plan' && (
        <PasoPlan
          onElegir={(p) => {
            setPlan(p);
            setEntrenador(null);
            setHorarioIds([]);
            setPaso('dias');
          }}
        />
      )}

      {paso === 'dias' && plan && (
        <PasoDias
          plan={plan}
          seleccion={horarioIds}
          onCambiar={setHorarioIds}
          onContinuar={() => setPaso('pago')}
        />
      )}

      {paso === 'personalizada' && (
        <PasoPersonalizada
          entrenador={entrenador}
          modalidad={modalidad}
          sesiones={sesiones}
          onEntrenador={setEntrenador}
          onModalidad={setModalidad}
          onSesiones={setSesiones}
          onContinuar={() => {
            setPlan(null);
            setPaso('pago');
          }}
        />
      )}

      {paso === 'pago' && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-slate-800">Confirma y paga</h2>
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
            {plan ? (
              <>
                <p className="font-semibold">Plan {plan.nombre}</p>
                <p className="text-xs">{horarioIds.length} clase(s) por semana</p>
              </>
            ) : (
              entrenador && (
                <>
                  <p className="font-semibold">
                    {sesiones} sesiones {MODALIDADES.find((m) => m.valor === modalidad)?.etiqueta}
                  </p>
                  <p className="text-xs">Con {entrenador.nombre_completo}</p>
                </>
              )
            )}
            <p className="mt-1 text-xl font-bold">S/ {monto.toFixed(0)}</p>
          </div>

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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={() => {
              setError(null);
              enviar.mutate();
            }}
            disabled={enviar.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar solicitud
          </button>
          <p className="text-center text-xs text-slate-400">
            Tu plan se activa cuando la administración valida el pago.
          </p>
        </section>
      )}
    </div>
  );
}

function PasoPlan({ onElegir }: { onElegir: (p: Plan) => void }) {
  const { data: planes, isLoading } = useQuery({ queryKey: ['planes'], queryFn: listarPlanes });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {planes?.map((p) => (
        <button
          key={p.id}
          onClick={() => onElegir(p)}
          className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-800">{p.nombre}</p>
            <p className="text-lg font-bold text-brand-700">
              S/ {Number(p.precio_mensual).toFixed(0)}
              <span className="text-xs font-normal text-slate-400"> /mes</span>
            </p>
          </div>
          <p className="mt-1 text-xs text-slate-400">{p.descripcion}</p>
        </button>
      ))}
    </div>
  );
}

function PasoDias({
  plan,
  seleccion,
  onCambiar,
  onContinuar,
}: {
  plan: Plan;
  seleccion: string[];
  onCambiar: (ids: string[]) => void;
  onContinuar: () => void;
}) {
  const { data: horarios, isLoading } = useQuery({
    queryKey: ['horarios'],
    queryFn: listarHorarios,
  });

  const porDia = useMemo(() => {
    return (horarios ?? []).reduce<Record<number, HorarioConDatos[]>>((acc, h) => {
      (acc[h.dia_semana] ??= []).push(h);
      return acc;
    }, {});
  }, [horarios]);

  function alternar(id: string) {
    if (seleccion.includes(id)) {
      onCambiar(seleccion.filter((s) => s !== id));
    } else if (seleccion.length < plan.frecuencia_semanal) {
      onCambiar([...seleccion, id]);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (Object.keys(porDia).length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
        Aún no hay horarios de clases publicados. Escríbenos por WhatsApp y te avisamos apenas estén
        disponibles para inscribirte.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
        <CalendarDays className="h-5 w-5 shrink-0" />
        <p>
          Plan <b>{plan.nombre}</b>: elige tus <b>{plan.frecuencia_semanal}</b> día(s) de
          entrenamiento · {seleccion.length}/{plan.frecuencia_semanal} elegido(s)
        </p>
      </div>

      {Object.entries(porDia).map(([dia, items]) => (
        <div key={dia}>
          <h3 className="mb-1.5 text-sm font-semibold text-slate-600">{DIAS[Number(dia)]}</h3>
          <div className="space-y-2">
            {items.map((h) => {
              const activo = seleccion.includes(h.id);
              const lleno = !activo && seleccion.length >= plan.frecuencia_semanal;
              return (
                <button
                  key={h.id}
                  onClick={() => alternar(h.id)}
                  disabled={lleno}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                    activo
                      ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                      : 'border-slate-200 bg-white text-slate-700 disabled:opacity-40'
                  }`}
                >
                  <span>
                    {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
                    {h.sede ? ` · ${h.sede.nombre}` : ''}
                  </span>
                  <span className="text-xs capitalize text-slate-400">{h.nivel}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={onContinuar}
        disabled={seleccion.length !== plan.frecuencia_semanal}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
      >
        Continuar al pago
      </button>
    </section>
  );
}

function PasoPersonalizada({
  entrenador,
  modalidad,
  sesiones,
  onEntrenador,
  onModalidad,
  onSesiones,
  onContinuar,
}: {
  entrenador: EntrenadorConTarifas | null;
  modalidad: ModalidadPersonalizada;
  sesiones: number;
  onEntrenador: (e: EntrenadorConTarifas) => void;
  onModalidad: (m: ModalidadPersonalizada) => void;
  onSesiones: (n: number) => void;
  onContinuar: () => void;
}) {
  const { data: entrenadores, isLoading } = useQuery({
    queryKey: ['entrenadores-tarifas'],
    queryFn: listarEntrenadoresConTarifas,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!entrenadores || entrenadores.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
        Aún no hay entrenadores disponibles para clases personalizadas. Escríbenos por WhatsApp y
        coordinamos contigo.
      </div>
    );
  }

  const total = entrenador ? precioPaquete(entrenador, modalidad, sesiones) : 0;

  return (
    <section className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase text-slate-400">Entrenador</p>
        <div className="space-y-2">
          {entrenadores?.map((e) => {
            const individual = e.tarifas.find((t) => t.modalidad === 'individual');
            const activo = entrenador?.id === e.id;
            return (
              <button
                key={e.id}
                onClick={() => onEntrenador(e)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                  activo
                    ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <span className="capitalize">{e.nombre_completo}</span>
                {individual && (
                  <span className="text-xs text-slate-400">
                    desde S/ {Number(individual.precio_por_atleta).toFixed(0)}/sesión
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {entrenador && (
        <>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-400">Modalidad</p>
            <div className="grid grid-cols-2 gap-2">
              {MODALIDADES.map((m) => {
                const tarifa = entrenador.tarifas.find((t) => t.modalidad === m.valor);
                const activo = modalidad === m.valor;
                return (
                  <button
                    key={m.valor}
                    onClick={() => onModalidad(m.valor)}
                    disabled={!tarifa}
                    className={`rounded-xl border p-3 text-left text-sm transition disabled:opacity-40 ${
                      activo
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <p className="flex items-center gap-1 font-semibold">
                      <Users className="h-3.5 w-3.5" /> {m.etiqueta}
                    </p>
                    {tarifa && (
                      <p className="text-xs text-slate-400">
                        S/ {Number(tarifa.precio_por_atleta).toFixed(0)} por atleta
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-400">Paquete</p>
            <div className="grid grid-cols-3 gap-2">
              {PAQUETES.map((p) => {
                const activo = sesiones === p.sesiones;
                return (
                  <button
                    key={p.sesiones}
                    onClick={() => onSesiones(p.sesiones)}
                    className={`rounded-xl border p-3 text-center text-sm transition ${
                      activo
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <p className="font-bold">{p.sesiones}</p>
                    <p className="text-xs text-slate-400">sesiones</p>
                    <p className="text-xs font-semibold text-green-600">
                      -{Math.round(p.descuento * 100)}%
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-brand-50 p-3">
            <p className="text-sm text-brand-800">Total por atleta</p>
            <p className="text-xl font-bold text-brand-800">S/ {total.toFixed(0)}</p>
          </div>

          <button
            onClick={onContinuar}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95"
          >
            Continuar al pago
          </button>
        </>
      )}
    </section>
  );
}
