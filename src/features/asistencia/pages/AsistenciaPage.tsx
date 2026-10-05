import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ClipboardCheck, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { listarAgendaEntrenador, type HorarioConDatos } from '../../horarios/api/horarios.api';
import { getAlumnosDeClase } from '../api/asistencia.api';
import { ListaAsistencia } from '../components/ListaAsistencia';
import { Badge } from '../../../components/ui/Badge';
import { isoLocal } from '../../../utils/fechas';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function AsistenciaPage() {
  const { session, rolVista } = useAuth();
  const hoy = new Date();
  const fecha = isoLocal(hoy); // fecha local, consistente con getDay()
  const diaSemana = hoy.getDay();

  // El admin no toma asistencia; mostramos las clases de cualquier entrenador
  // si fuera admin requeriría un selector. Aquí asumimos rol entrenador.
  const entrenadorId = session?.user.id ?? '';

  const [clase, setClase] = useState<HorarioConDatos | null>(null);

  const { data: agenda, isLoading } = useQuery({
    queryKey: ['agenda', entrenadorId, diaSemana],
    queryFn: () => listarAgendaEntrenador(entrenadorId, diaSemana),
    enabled: !!entrenadorId && rolVista === 'entrenador',
  });

  if (clase) {
    return <DetalleAsistencia clase={clase} fecha={fecha} onVolver={() => setClase(null)} />;
  }

  return (
    <div className="pagina space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Asistencia de hoy</h1>
        <p className="text-sm capitalize text-slate-500">
          {DIAS[diaSemana]}, {hoy.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
        </p>
      </div>

      {rolVista !== 'entrenador' ? (
        <p className="py-8 text-center text-sm text-slate-500">
          La toma de asistencia está disponible para los entrenadores.
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : agenda && agenda.length > 0 ? (
        <ul className="lista-tarjetas-ancha">
          {agenda.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setClase(c)}
                className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[0.98]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {c.hora_inicio.slice(0, 5)}–{c.hora_fin.slice(0, 5)}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="h-3 w-3" /> {c.sede?.nombre ?? '—'}
                  </p>
                </div>
                <Badge variante="gris">{c.nivel}</Badge>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-slate-500">
          No tienes clases programadas para hoy.
        </p>
      )}
    </div>
  );
}

function DetalleAsistencia({
  clase,
  fecha,
  onVolver,
}: {
  clase: HorarioConDatos;
  fecha: string;
  onVolver: () => void;
}) {
  const { data: alumnos, isLoading } = useQuery({
    queryKey: ['alumnos-clase', clase.id, fecha],
    queryFn: () => getAlumnosDeClase(clase.id, fecha),
  });

  return (
    <div>
      <div className="mx-auto flex max-w-md items-center gap-2 px-3 pt-4 md:max-w-none md:px-6 md:pt-6 lg:max-w-7xl lg:px-8">
        <button
          onClick={onVolver}
          className="flex items-center gap-1 text-sm font-medium text-brand-600"
        >
          <ChevronLeft className="h-4 w-4" /> Agenda
        </button>
        <span className="text-sm text-slate-400">
          · {clase.hora_inicio.slice(0, 5)} {clase.sede?.nombre ?? ''}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : alumnos && alumnos.length > 0 ? (
        <ListaAsistencia horarioClaseId={clase.id} fecha={fecha} alumnos={alumnos} />
      ) : (
        <p className="mx-auto max-w-md px-4 py-12 text-center text-sm text-slate-500 md:max-w-none lg:max-w-7xl">
          <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          No hay alumnos inscritos en esta clase. Inscríbelos desde el módulo de Horarios.
        </p>
      )}
    </div>
  );
}
