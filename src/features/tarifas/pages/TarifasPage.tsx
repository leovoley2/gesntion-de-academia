import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Loader2, Check } from 'lucide-react';
import {
  MODALIDADES,
  listarEntrenadoresTarifas,
  guardarTarifa,
  type EntrenadorTarifas,
} from '../api/tarifas.api';
import { useAuth } from '../../../context/AuthContext';
import type { ModalidadPersonalizada } from '../../../types/database.types';

export function TarifasPage() {
  const { perfil, session } = useAuth();
  const esAdmin = perfil?.rol === 'administrador';

  const { data: entrenadores, isLoading } = useQuery({
    queryKey: ['entrenadores-tarifas-edit'],
    queryFn: listarEntrenadoresTarifas,
  });

  // El entrenador solo edita su propia ficha; el admin, todas.
  const visibles = esAdmin
    ? entrenadores
    : entrenadores?.filter((e) => e.id === session?.user.id);

  return (
    <div className="pagina space-y-4">
      <h1 className="flex items-center gap-2 pt-2 text-lg font-bold text-slate-800">
        <DollarSign className="h-5 w-5 text-brand-600" /> Tarifas personalizadas
      </h1>
      <p className="-mt-2 text-xs text-slate-400">
        Precio por atleta de cada modalidad. Es lo que ve el alumno al reservar clases personalizadas.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : !visibles || visibles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          Aún no hay entrenadores. Créalos en Usuarios y aquí podrás fijar sus tarifas.
        </p>
      ) : (
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 2xl:grid-cols-3">
          {visibles.map((e) => (
            <FichaEntrenador key={e.id} entrenador={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function FichaEntrenador({ entrenador }: { entrenador: EntrenadorTarifas }) {
  const qc = useQueryClient();
  const tarifaDe = (m: ModalidadPersonalizada) =>
    entrenador.tarifas.find((t) => t.modalidad === m)?.precio_por_atleta ?? 0;

  const [valores, setValores] = useState<Record<string, number>>(
    Object.fromEntries(MODALIDADES.map((m) => [m.valor, Number(tarifaDe(m.valor))]))
  );
  const [guardado, setGuardado] = useState(false);

  const guardar = useMutation({
    mutationFn: async () => {
      for (const m of MODALIDADES) {
        await guardarTarifa(entrenador.id, m.valor, valores[m.valor]);
      }
    },
    onSuccess: () => {
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
      qc.invalidateQueries({ queryKey: ['entrenadores-tarifas-edit'] });
      qc.invalidateQueries({ queryKey: ['entrenadores-tarifas'] });
    },
    onError: (e: Error) => alert(e.message),
  });

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold capitalize text-slate-800">{entrenador.nombre_completo}</h2>
      <div className="space-y-2">
        {MODALIDADES.map((m) => (
          <label key={m.valor} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600">{m.etiqueta}</span>
            <div className="flex w-28 items-center rounded-lg border border-slate-200 px-2 focus-within:border-brand-400">
              <span className="text-xs text-slate-400">S/</span>
              <input
                type="number"
                min={0}
                step="5"
                value={valores[m.valor] || ''}
                onChange={(e) =>
                  setValores({ ...valores, [m.valor]: Number(e.target.value) })
                }
                className="w-full bg-transparent px-1 py-2 text-right text-sm outline-none"
              />
            </div>
          </label>
        ))}
      </div>

      {guardado && (
        <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          <Check className="h-4 w-4" /> Tus tarifas se guardaron correctamente.
        </p>
      )}

      <button
        onClick={() => guardar.mutate()}
        disabled={guardar.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
      >
        {guardar.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : guardado ? (
          <Check className="h-4 w-4" />
        ) : null}
        {guardado ? 'Guardado' : 'Guardar tarifas'}
      </button>
    </section>
  );
}
