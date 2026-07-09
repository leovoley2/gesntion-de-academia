import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import {
  listarInscritos,
  inscribirAlumno,
  desinscribir,
  listarAlumnosSimple,
} from '../api/horarios.api';

export function InscritosClase({ horarioClaseId }: { horarioClaseId: string }) {
  const qc = useQueryClient();
  const [sel, setSel] = useState('');
  const clave = ['inscritos', horarioClaseId];

  const { data: inscritos, isLoading } = useQuery({
    queryKey: clave,
    queryFn: () => listarInscritos(horarioClaseId),
  });
  const { data: alumnos } = useQuery({ queryKey: ['alumnos'], queryFn: listarAlumnosSimple });

  const inscribir = useMutation({
    mutationFn: (alumnoId: string) => inscribirAlumno(horarioClaseId, alumnoId),
    onSuccess: () => {
      setSel('');
      qc.invalidateQueries({ queryKey: clave });
    },
    onError: (e: Error) => alert(e.message),
  });

  const quitar = useMutation({
    mutationFn: desinscribir,
    onSuccess: () => qc.invalidateQueries({ queryKey: clave }),
  });

  const yaInscritos = new Set((inscritos ?? []).map((i) => i.alumno_id));
  const disponibles = (alumnos ?? []).filter((a) => !yaInscritos.has(a.id));

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <div className="flex gap-2">
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
        >
          <option value="">— Inscribir alumno —</option>
          {disponibles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre_completo}
            </option>
          ))}
        </select>
        <button
          onClick={() => sel && inscribir.mutate(sel)}
          disabled={!sel || inscribir.isPending}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white active:scale-95 disabled:opacity-50"
        >
          {inscribir.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        </button>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto h-4 w-4 animate-spin text-slate-400" />
      ) : (inscritos ?? []).length === 0 ? (
        <p className="py-2 text-center text-xs text-slate-400">Sin alumnos inscritos.</p>
      ) : (
        <ul className="space-y-1">
          {inscritos!.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
            >
              {i.alumno?.nombre_completo ?? 'Alumno'}
              <button
                onClick={() => quitar.mutate(i.id)}
                className="rounded p-1 text-red-400 active:bg-red-50"
                aria-label="Quitar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
