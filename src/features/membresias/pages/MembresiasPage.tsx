import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, Plus, Trash2, Snowflake, Play } from 'lucide-react';
import {
  listarMembresias,
  listarAlumnos,
  crearMembresia,
  actualizarEstado,
  eliminarMembresia,
  type DatosMembresia,
  type MembresiaConAlumno,
} from '../api/membresias.api';
import type { TipoMembresia, EstadoMembresia } from '../../../types/database.types';
import { Badge } from '../../../components/ui/Badge';
import { isoLocal } from '../../../utils/fechas';

const hoy = () => isoLocal();
const enUnMes = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return isoLocal(d);
};

const VACIO: DatosMembresia = {
  alumno_id: '',
  tipo_membresia: 'mensual',
  clases_totales: 0,
  fecha_inicio: hoy(),
  fecha_fin: enUnMes(),
};

const usaCreditos = (t: TipoMembresia) => t === 'paquete_clases' || t === 'personalizado';

/** Color de alerta: rojo si vencida o sin créditos; ámbar si congelada; verde si activa. */
function variante(m: MembresiaConAlumno): 'verde' | 'rojo' | 'ambar' {
  if (m.estado === 'vencida') return 'rojo';
  if (m.estado === 'congelada') return 'ambar';
  if (usaCreditos(m.tipo_membresia) && m.clases_disponibles === 0) return 'rojo';
  return 'verde';
}

export function MembresiasPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<DatosMembresia>(VACIO);
  const [error, setError] = useState<string | null>(null);

  const { data: membresias, isLoading } = useQuery({
    queryKey: ['membresias'],
    queryFn: listarMembresias,
  });
  const { data: alumnos } = useQuery({ queryKey: ['alumnos'], queryFn: listarAlumnos });

  const crear = useMutation({
    mutationFn: crearMembresia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['membresias'] });
      setForm({ ...VACIO });
    },
    onError: (e: Error) => setError(e.message),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoMembresia }) =>
      actualizarEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['membresias'] }),
  });

  const borrar = useMutation({
    mutationFn: eliminarMembresia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['membresias'] }),
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.alumno_id) {
      setError('Selecciona un alumno.');
      return;
    }
    crear.mutate({
      ...form,
      clases_totales: usaCreditos(form.tipo_membresia) ? form.clases_totales : 0,
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4 pb-24">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <Plus className="h-5 w-5 text-brand-600" /> Asignar membresía
        </h2>

        <form onSubmit={enviar} className="space-y-3">
          <select
            value={form.alumno_id}
            onChange={(e) => setForm({ ...form, alumno_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">— Selecciona un alumno —</option>
            {alumnos?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre_completo}
              </option>
            ))}
          </select>

          <select
            value={form.tipo_membresia}
            onChange={(e) =>
              setForm({ ...form, tipo_membresia: e.target.value as TipoMembresia })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="mensual">Mensual (acceso libre)</option>
            <option value="paquete_clases">Paquete de clases</option>
            <option value="personalizado">Personalizado</option>
          </select>

          {usaCreditos(form.tipo_membresia) && (
            <input
              type="number"
              min={1}
              placeholder="N.º de clases del paquete"
              value={form.clases_totales || ''}
              onChange={(e) => setForm({ ...form, clases_totales: Number(e.target.value) })}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
            />
          )}

          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">
              Inicio
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              Fin (opcional)
              <input
                type="date"
                value={form.fecha_fin ?? ''}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value || null })}
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
            Asignar membresía
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <CreditCard className="h-5 w-5 text-brand-600" /> Membresías
          {membresias && (
            <span className="text-sm font-normal text-slate-400">({membresias.length})</span>
          )}
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : membresias && membresias.length > 0 ? (
          <ul className="space-y-2">
            {membresias.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {m.alumno?.nombre_completo ?? 'Alumno'}
                    </p>
                    <p className="text-xs capitalize text-slate-400">
                      {m.tipo_membresia.replace('_', ' ')}
                      {usaCreditos(m.tipo_membresia) &&
                        ` · ${m.clases_disponibles}/${m.clases_totales} clases`}
                    </p>
                  </div>
                  <Badge variante={variante(m)}>
                    {variante(m) === 'rojo' && m.estado === 'activa' ? 'sin clases' : m.estado}
                  </Badge>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-xs text-slate-400">
                    {m.fecha_inicio}
                    {m.fecha_fin ? ` → ${m.fecha_fin}` : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    {m.estado === 'congelada' ? (
                      <button
                        onClick={() => cambiarEstado.mutate({ id: m.id, estado: 'activa' })}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-green-600 active:bg-green-50"
                      >
                        <Play className="h-3.5 w-3.5" /> Activar
                      </button>
                    ) : (
                      <button
                        onClick={() => cambiarEstado.mutate({ id: m.id, estado: 'congelada' })}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-amber-600 active:bg-amber-50"
                      >
                        <Snowflake className="h-3.5 w-3.5" /> Congelar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar esta membresía?')) borrar.mutate(m.id);
                      }}
                      className="rounded-lg p-1.5 text-red-500 active:bg-red-50"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            Aún no hay membresías asignadas.
          </p>
        )}
      </section>
    </div>
  );
}
