import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Loader2, Plus, Trash2, UserCog } from 'lucide-react';
import {
  listarAlumnos,
  inscripcionesDeAlumno,
  agregarDia,
  quitarDia,
} from '../api/alumnos.api';
import { listarHorarios } from '../../horarios/api/horarios.api';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function GestionDiasPage() {
  const qc = useQueryClient();
  const [alumnoId, setAlumnoId] = useState('');

  const { data: alumnos } = useQuery({ queryKey: ['alumnos-dias'], queryFn: listarAlumnos });
  const { data: horarios } = useQuery({ queryKey: ['horarios'], queryFn: listarHorarios });
  const { data: inscripciones, isLoading } = useQuery({
    queryKey: ['inscripciones-alumno', alumnoId],
    queryFn: () => inscripcionesDeAlumno(alumnoId),
    enabled: !!alumnoId,
  });

  const inscritoIds = new Set((inscripciones ?? []).map((i) => i.horario_clase_id));
  const disponibles = (horarios ?? []).filter((h) => !inscritoIds.has(h.id));

  const refrescar = () =>
    qc.invalidateQueries({ queryKey: ['inscripciones-alumno', alumnoId] });

  const agregar = useMutation({
    mutationFn: (horarioId: string) => agregarDia(horarioId, alumnoId),
    onSuccess: refrescar,
    onError: (e: Error) => alert(e.message),
  });

  const quitar = useMutation({
    mutationFn: (inscripcionId: string) => quitarDia(inscripcionId),
    onSuccess: refrescar,
    onError: (e: Error) => alert(e.message),
  });

  return (
    <div className="pagina space-y-4">
      <h1 className="flex items-center gap-2 pt-2 text-lg font-bold text-slate-800">
        <UserCog className="h-5 w-5 text-brand-600" /> Días de entrenamiento
      </h1>
      <p className="-mt-2 text-xs text-slate-400">
        Modifica en qué clases grupales está inscrito un alumno.
      </p>

      <select
        value={alumnoId}
        onChange={(e) => setAlumnoId(e.target.value)}
        className="w-full rounded-xl md:max-w-md border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400"
      >
        <option value="">— Elige un alumno —</option>
        {alumnos?.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre_completo}
          </option>
        ))}
      </select>

      {!alumnoId ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Selecciona un alumno para ver y editar sus días.
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0">
          <section>
            <h2 className="mb-2 text-sm font-bold text-slate-700">Días inscritos</h2>
            {inscripciones && inscripciones.length > 0 ? (
              <ul className="space-y-2">
                {inscripciones.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3"
                  >
                    <div className="text-sm">
                      <p className="font-semibold text-green-800">
                        {i.horario ? DIAS[i.horario.dia_semana] : 'Clase'}
                        {i.horario && ` · ${i.horario.hora_inicio.slice(0, 5)}–${i.horario.hora_fin.slice(0, 5)}`}
                      </p>
                      <p className="text-xs text-green-700">
                        {i.horario?.sede?.nombre ?? ''}
                        {i.horario?.nivel ? ` · ${i.horario.nivel}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => quitar.mutate(i.id)}
                      disabled={quitar.isPending}
                      className="rounded-lg p-2 text-red-500 active:bg-red-100 disabled:opacity-50"
                      aria-label="Quitar día"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-sm text-slate-400">
                Este alumno no tiene días asignados.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Plus className="h-4 w-4 text-brand-600" /> Agregar un día
            </h2>
            {disponibles.length > 0 ? (
              <ul className="space-y-2">
                {disponibles.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="text-sm">
                      <p className="font-semibold text-slate-800">
                        {DIAS[h.dia_semana]} · {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {h.sede?.nombre ?? ''} · {h.nivel}
                      </p>
                    </div>
                    <button
                      onClick={() => agregar.mutate(h.id)}
                      disabled={agregar.isPending}
                      className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white active:scale-95 disabled:opacity-60"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 py-4 text-center text-sm text-slate-400">
                <CalendarDays className="mx-auto h-4 w-4" />
                No hay más clases disponibles para agregar.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
