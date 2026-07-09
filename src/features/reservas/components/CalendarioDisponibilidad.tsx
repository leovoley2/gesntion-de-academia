import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Loader2, Check, Lock, Trash2, CalendarDays, DollarSign } from 'lucide-react';
import {
  listarDisponibilidad,
  crearBloquesLote,
  toggleBloque,
  eliminarBloque,
  type ParamsLote,
} from '../api/disponibilidad.api';
import type { TipoDisponibilidad } from '../../../types/database.types';
import { isoLocal, isoLocalMas } from '../../../utils/fechas';
import { Badge } from '../../../components/ui/Badge';

interface Props {
  entrenadorId: string;
}

const DIAS = [
  { n: 1, label: 'L' },
  { n: 2, label: 'M' },
  { n: 3, label: 'X' },
  { n: 4, label: 'J' },
  { n: 5, label: 'V' },
  { n: 6, label: 'S' },
  { n: 0, label: 'D' },
];

export function CalendarioDisponibilidad({ entrenadorId }: Props) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<TipoDisponibilidad>('personalizada');
  const [dias, setDias] = useState<number[]>([1, 3, 5]);
  const [desde, setDesde] = useState(isoLocal());
  const [hasta, setHasta] = useState(isoLocalMas(14));
  const [horaInicio, setHoraInicio] = useState('18:00');
  const [horaFin, setHoraFin] = useState('21:00');
  const [duracion, setDuracion] = useState(90);
  const [aviso, setAviso] = useState<string | null>(null);

  const { data: bloques, isLoading } = useQuery({
    queryKey: ['disponibilidad', entrenadorId],
    queryFn: () => listarDisponibilidad(entrenadorId),
    enabled: !!entrenadorId,
  });

  const generar = useMutation({
    mutationFn: (p: ParamsLote) => crearBloquesLote(p),
    onSuccess: (n) => {
      setAviso(`✓ Se generaron ${n} horario(s) correctamente.`);
      qc.invalidateQueries({ queryKey: ['disponibilidad', entrenadorId] });
    },
    onError: (e: Error) => setAviso(`Error: ${e.message}`),
  });

  const toggle = useMutation({
    mutationFn: ({ id, habilitado }: { id: string; habilitado: boolean }) =>
      toggleBloque(id, habilitado),
    onSuccess: (_d, v) => {
      setAviso(v.habilitado ? '✓ Horario habilitado.' : '✓ Horario bloqueado.');
      qc.invalidateQueries({ queryKey: ['disponibilidad', entrenadorId] });
    },
    onError: (e: Error) => setAviso(`Error: ${e.message}`),
  });

  const borrar = useMutation({
    mutationFn: eliminarBloque,
    onSuccess: () => {
      setAviso('✓ Horario eliminado.');
      qc.invalidateQueries({ queryKey: ['disponibilidad', entrenadorId] });
    },
    onError: (e: Error) => setAviso(`Error: ${e.message}`),
  });

  const porFecha = useMemo(() => {
    return (bloques ?? []).reduce<Record<string, NonNullable<typeof bloques>>>((acc, b) => {
      (acc[b.fecha] ??= []).push(b);
      return acc;
    }, {});
  }, [bloques]);

  function alternarDia(n: number) {
    setDias((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n]));
  }

  function generarLote(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (dias.length === 0) {
      setAviso('Selecciona al menos un día.');
      return;
    }
    generar.mutate({
      entrenadorId,
      tipo,
      diasSemana: dias,
      desde,
      hasta,
      horaInicio,
      horaFin,
      duracionMin: duracion,
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4 pb-24">
      {/* Enlace a la gestión de tarifas (fuente única: tarifas_entrenador) */}
      <Link
        to="/tarifas"
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
      >
        <DollarSign className="h-5 w-5 shrink-0 text-brand-600" />
        <div>
          <p className="font-bold text-slate-800">Mis tarifas</p>
          <p className="text-xs text-slate-400">
            Fija el precio por modalidad (individual, dúo, grupo)
          </p>
        </div>
      </Link>

      {/* Generador en lote */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <CalendarPlus className="h-5 w-5 text-brand-600" /> Habilitar horarios
        </h2>

        <form onSubmit={generarLote} className="space-y-3">
          {/* Tipo: academia o personalizada */}
          <div>
            <p className="mb-1.5 text-xs text-slate-500">Modalidad</p>
            <div className="grid grid-cols-2 gap-2">
              {(['academia', 'personalizada'] as TipoDisponibilidad[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`rounded-xl py-2.5 text-sm font-medium capitalize transition ${
                    tipo === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t === 'academia' ? 'Academia (mensual)' : 'Personalizada'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-slate-500">Días de la semana</p>
            <div className="flex gap-1.5">
              {DIAS.map((d) => {
                const activo = dias.includes(d.n);
                return (
                  <button
                    key={d.n}
                    type="button"
                    onClick={() => alternarDia(d.n)}
                    className={`h-9 w-9 rounded-full text-sm font-semibold transition ${
                      activo ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">
              Desde
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              Hasta
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">
              Hora inicio
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              Hora fin
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="w-24 text-xs text-slate-500">
              Min/clase
              <input
                type="number"
                min={30}
                step={15}
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          {aviso && (
            <p className={`text-sm ${aviso.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {aviso}
            </p>
          )}

          <button
            type="submit"
            disabled={generar.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {generar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Generar bloques
          </button>
        </form>
      </section>

      {/* Lista de bloques por día */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <CalendarDays className="h-5 w-5 text-brand-600" /> Mis horarios
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : Object.keys(porFecha).length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Aún no tienes horarios. Genera algunos arriba.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(porFecha).map(([fecha, items]) => (
              <div key={fecha}>
                <h3 className="mb-2 text-sm font-semibold capitalize text-slate-600">
                  {new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <div className="space-y-2">
                  {items.map((b) => (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between rounded-xl border p-2.5 ${
                        b.habilitado
                          ? 'border-green-200 bg-green-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            b.habilitado ? 'text-green-800' : 'text-slate-400 line-through'
                          }`}
                        >
                          {b.hora_inicio.slice(0, 5)} – {b.hora_fin.slice(0, 5)}
                        </span>
                        <Badge variante={b.tipo === 'academia' ? 'ambar' : 'gris'}>
                          {b.tipo === 'academia' ? 'academia' : 'personal.'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggle.mutate({ id: b.id, habilitado: !b.habilitado })}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${
                            b.habilitado
                              ? 'text-slate-500 active:bg-slate-100'
                              : 'text-green-600 active:bg-green-100'
                          }`}
                        >
                          {b.habilitado ? (
                            <>
                              <Lock className="h-3.5 w-3.5" /> Bloquear
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" /> Habilitar
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => borrar.mutate(b.id)}
                          className="rounded-lg p-1.5 text-red-500 active:bg-red-50"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
