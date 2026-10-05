import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  listarSedes,
  crearSede,
  actualizarSede,
  eliminarSede,
  type DatosSede,
} from '../api/sedes.api';
import type { SedeCancha, TipoSede } from '../../../types/database.types';
import { Badge } from '../../../components/ui/Badge';

const VACIO: DatosSede = { nombre: '', tipo: 'paga', tarifa_hora: 0 };

export function SedesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<DatosSede>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: sedes, isLoading } = useQuery({ queryKey: ['sedes'], queryFn: listarSedes });

  const guardar = useMutation({
    mutationFn: () =>
      editandoId ? actualizarSede(editandoId, form) : crearSede(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes'] });
      cancelar();
    },
    onError: (e: Error) => setError(e.message),
  });

  const borrar = useMutation({
    mutationFn: eliminarSede,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sedes'] }),
    onError: (e: Error) =>
      setError(
        e.message.includes('foreign key') || e.message.includes('violates')
          ? 'No se puede eliminar: la sede tiene horarios o reservas asociados.'
          : e.message
      ),
  });

  function editar(s: SedeCancha) {
    setEditandoId(s.id);
    setForm({ nombre: s.nombre, tipo: s.tipo, tarifa_hora: s.tarifa_hora });
    setError(null);
  }

  function cancelar() {
    setEditandoId(null);
    setForm(VACIO);
    setError(null);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    guardar.mutate();
  }

  return (
    <div className="pagina pagina-dos-columnas">
      <section className="panel-lateral rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          {editandoId ? <Pencil className="h-5 w-5 text-brand-600" /> : <Plus className="h-5 w-5 text-brand-600" />}
          {editandoId ? 'Editar sede' : 'Nueva sede'}
        </h2>

        <form onSubmit={enviar} className="space-y-3">
          <input
            placeholder="Nombre (ej. Surco, Chorrillos)"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />

          <div className="flex gap-2">
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoSede })}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm capitalize outline-none focus:border-brand-400"
            >
              <option value="paga">Paga</option>
              <option value="gratis">Gratis</option>
            </select>

            <div className="flex flex-1 items-center rounded-xl border border-slate-200 px-3 focus-within:border-brand-400">
              <span className="text-sm text-slate-400">S/</span>
              <input
                type="number"
                min={0}
                step="0.5"
                placeholder="Tarifa/hora"
                value={form.tarifa_hora}
                disabled={form.tipo === 'gratis'}
                onChange={(e) => setForm({ ...form, tarifa_hora: Number(e.target.value) })}
                className="w-full bg-transparent px-2 py-3 text-sm outline-none disabled:opacity-40"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardar.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
            >
              {guardar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editandoId ? 'Guardar cambios' : 'Crear sede'}
            </button>
            {editandoId && (
              <button
                type="button"
                onClick={cancelar}
                className="rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <MapPin className="h-5 w-5 text-brand-600" /> Sedes
          {sedes && <span className="text-sm font-normal text-slate-400">({sedes.length})</span>}
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : sedes && sedes.length > 0 ? (
          <ul className="lista-tarjetas">
            {sedes.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{s.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {s.tipo === 'paga' ? `S/ ${s.tarifa_hora.toFixed(2)} / hora` : 'Sin costo'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variante={s.tipo === 'paga' ? 'ambar' : 'verde'}>{s.tipo}</Badge>
                  <button
                    onClick={() => editar(s)}
                    className="rounded-lg p-2 text-slate-500 active:bg-slate-100"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la sede "${s.nombre}"?`)) borrar.mutate(s.id);
                    }}
                    className="rounded-lg p-2 text-red-500 active:bg-red-50"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            Aún no hay sedes. Crea la primera arriba.
          </p>
        )}
      </section>
    </div>
  );
}
