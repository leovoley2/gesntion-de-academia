import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Loader2, Plus, Trash2, Users, ChevronDown, Pencil, Check, X } from 'lucide-react';
import {
  listarHorarios,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
  validarHorario,
  type DatosHorario,
  type HorarioConDatos,
} from '../api/horarios.api';
import { listarSedes } from '../../sedes/api/sedes.api';
import { listarEntrenadores } from '../../reservas/api/reservas.api';
import type { NivelClase, SedeCancha } from '../../../types/database.types';
import { InscritosClase } from '../components/InscritosClase';
import { CamposHorario, DIAS } from '../components/CamposHorario';
import { Badge } from '../../../components/ui/Badge';

const COLOR_NIVEL: Record<NivelClase, 'verde' | 'ambar' | 'rojo'> = {
  principiante: 'verde',
  intermedio: 'ambar',
  avanzado: 'rojo',
};

const VACIO: DatosHorario = {
  sede_id: '',
  entrenador_id: '',
  dia_semana: 1,
  hora_inicio: '18:00',
  hora_fin: '19:30',
  nivel: 'principiante',
};

type Entrenador = { id: string; nombre_completo: string };

export function HorariosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<DatosHorario>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  const { data: horarios, isLoading } = useQuery({ queryKey: ['horarios'], queryFn: listarHorarios });
  const { data: sedes } = useQuery({ queryKey: ['sedes'], queryFn: listarSedes });
  const { data: entrenadores } = useQuery({ queryKey: ['entrenadores'], queryFn: listarEntrenadores });

  const crear = useMutation({
    mutationFn: crearHorario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios'] });
      setForm({ ...VACIO });
    },
    onError: (e: Error) => setError(e.message),
  });

  const borrar = useMutation({
    mutationFn: eliminarHorario,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horarios'] }),
    onError: (e: Error) => alert(e.message),
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validarHorario(form);
    setError(problema);
    if (!problema) crear.mutate(form);
  }

  return (
    <div className="pagina pagina-dos-columnas">
      <section className="panel-lateral rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <Plus className="h-5 w-5 text-brand-600" /> Nueva clase grupal
        </h2>
        <form onSubmit={enviar} className="space-y-3">
          <CamposHorario valor={form} onChange={setForm} sedes={sedes} entrenadores={entrenadores} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={crear.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {crear.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear clase
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <CalendarClock className="h-5 w-5 text-brand-600" /> Clases
          {horarios && <span className="text-sm font-normal text-slate-400">({horarios.length})</span>}
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : horarios && horarios.length > 0 ? (
          <ul className="lista-tarjetas">
            {horarios.map((h: HorarioConDatos) =>
              editando === h.id ? (
                <EditarClase
                  key={h.id}
                  clase={h}
                  sedes={sedes}
                  entrenadores={entrenadores}
                  onCerrar={() => setEditando(null)}
                />
              ) : (
                <li key={h.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        {DIAS[h.dia_semana]} · {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {h.sede?.nombre ?? '—'} · {h.entrenador?.nombre_completo ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variante={COLOR_NIVEL[h.nivel]}>{h.nivel}</Badge>
                      <button
                        onClick={() => setEditando(h.id)}
                        className="rounded-lg p-1.5 text-slate-500 active:bg-slate-100"
                        aria-label="Editar clase"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar esta clase? Sus alumnos inscritos dejarán de estar en ella.'))
                            borrar.mutate(h.id);
                        }}
                        className="rounded-lg p-1.5 text-red-500 active:bg-red-50"
                        aria-label="Eliminar clase"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setAbierto(abierto === h.id ? null : h.id)}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600"
                  >
                    <Users className="h-3.5 w-3.5" /> Inscritos
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition ${abierto === h.id ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {abierto === h.id && <InscritosClase horarioClaseId={h.id} />}
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Aún no hay clases. Crea la primera.</p>
        )}
      </section>
    </div>
  );
}

/** Tarjeta de la clase en modo edición: mismos campos que "Nueva clase". */
function EditarClase({
  clase,
  sedes,
  entrenadores,
  onCerrar,
}: {
  clase: HorarioConDatos;
  sedes: SedeCancha[] | undefined;
  entrenadores: Entrenador[] | undefined;
  onCerrar: () => void;
}) {
  const qc = useQueryClient();
  const [datos, setDatos] = useState<DatosHorario>({
    sede_id: clase.sede_id,
    entrenador_id: clase.entrenador_id,
    dia_semana: clase.dia_semana,
    hora_inicio: clase.hora_inicio.slice(0, 5),
    hora_fin: clase.hora_fin.slice(0, 5),
    nivel: clase.nivel,
  });
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () => actualizarHorario(clase.id, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios'] });
      onCerrar();
    },
    onError: (e: Error) => setError(e.message),
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validarHorario(datos);
    setError(problema);
    if (!problema) guardar.mutate();
  }

  return (
    <li className="rounded-2xl border border-brand-200 bg-white p-3 shadow-sm">
      <form onSubmit={enviar} className="space-y-3">
        <p className="text-sm font-semibold text-slate-800">Editar clase</p>
        <CamposHorario valor={datos} onChange={setDatos} sedes={sedes} entrenadores={entrenadores} />
        <p className="text-xs text-slate-400">
          Los alumnos inscritos siguen en la clase con el nuevo día y horario.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={guardar.isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-slate-200 px-4 text-sm text-slate-600 active:scale-95"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </form>
    </li>
  );
}
