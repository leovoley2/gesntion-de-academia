import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Loader2, Plus, Trash2, Users, ChevronDown } from 'lucide-react';
import {
  listarHorarios,
  crearHorario,
  eliminarHorario,
  type DatosHorario,
  type HorarioConDatos,
} from '../api/horarios.api';
import { listarSedes } from '../../sedes/api/sedes.api';
import { listarEntrenadores } from '../../reservas/api/reservas.api';
import type { NivelClase } from '../../../types/database.types';
import { InscritosClase } from '../components/InscritosClase';
import { Badge } from '../../../components/ui/Badge';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const NIVELES: NivelClase[] = ['principiante', 'intermedio', 'avanzado'];
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

export function HorariosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<DatosHorario>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

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
    setError(null);
    if (!form.sede_id || !form.entrenador_id) {
      setError('Selecciona sede y entrenador.');
      return;
    }
    crear.mutate(form);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4 pb-24">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <Plus className="h-5 w-5 text-brand-600" /> Nueva clase grupal
        </h2>
        <form onSubmit={enviar} className="space-y-3">
          <select
            value={form.sede_id}
            onChange={(e) => setForm({ ...form, sede_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">— Sede —</option>
            {sedes?.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>

          <select
            value={form.entrenador_id}
            onChange={(e) => setForm({ ...form, entrenador_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">— Entrenador —</option>
            {entrenadores?.map((en) => (
              <option key={en.id} value={en.id}>{en.nombre_completo}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              value={form.dia_semana}
              onChange={(e) => setForm({ ...form, dia_semana: Number(e.target.value) })}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-400"
            >
              {DIAS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
            <select
              value={form.nivel}
              onChange={(e) => setForm({ ...form, nivel: e.target.value as NivelClase })}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm capitalize outline-none focus:border-brand-400"
            >
              {NIVELES.map((n) => (
                <option key={n} value={n} className="capitalize">{n}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">
              Inicio
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              Fin
              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

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
          <ul className="space-y-2">
            {horarios.map((h: HorarioConDatos) => (
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
                      onClick={() => {
                        if (confirm('¿Eliminar esta clase?')) borrar.mutate(h.id);
                      }}
                      className="rounded-lg p-1.5 text-red-500 active:bg-red-50"
                      aria-label="Eliminar"
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
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Aún no hay clases. Crea la primera.</p>
        )}
      </section>
    </div>
  );
}
