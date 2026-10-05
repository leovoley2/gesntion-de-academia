import { useState } from 'react';
import { Check, X, FileWarning, Loader2 } from 'lucide-react';
import { marcarAsistencia, type AlumnoClase } from '../api/asistencia.api';
import type { EstadoAsistencia } from '../../../types/database.types';

interface Props {
  horarioClaseId: string;
  fecha: string; // 'YYYY-MM-DD'
  alumnos: AlumnoClase[];
}

const OPCIONES: {
  valor: Extract<EstadoAsistencia, 'asistio' | 'falta' | 'justificado'>;
  label: string;
  Icon: typeof Check;
  clase: string;
}[] = [
  { valor: 'asistio', label: 'Asistió', Icon: Check, clase: 'bg-green-500 text-white' },
  { valor: 'falta', label: 'Faltó', Icon: X, clase: 'bg-red-500 text-white' },
  { valor: 'justificado', label: 'Justificado', Icon: FileWarning, clase: 'bg-amber-500 text-white' },
];

export function ListaAsistencia({ horarioClaseId, fecha, alumnos }: Props) {
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  async function marcar(alumno: AlumnoClase, estado: EstadoAsistencia) {
    setGuardando(alumno.alumno_id);
    try {
      await marcarAsistencia({ horarioClaseId, fecha, alumno, estado });
      setEstados((prev) => ({ ...prev, [alumno.alumno_id]: estado }));
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar la asistencia. Intenta de nuevo.');
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-3 pb-24 md:max-w-none md:px-6 md:pb-10 lg:max-w-7xl lg:px-8">
      <h2 className="py-4 text-lg font-bold text-slate-800">Asistencia · {fecha}</h2>

      <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 2xl:grid-cols-3">
        {alumnos.map((alumno) => {
          const actual = estados[alumno.alumno_id] ?? alumno.estado;
          const esteGuardando = guardando === alumno.alumno_id;

          return (
            <li
              key={alumno.alumno_id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{alumno.nombre_completo}</p>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {alumno.tipo_membresia.replace('_', ' ')}
                  </span>
                </div>
                {esteGuardando && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {OPCIONES.map(({ valor, label, Icon, clase }) => {
                  const activo = actual === valor;
                  return (
                    <button
                      key={valor}
                      disabled={esteGuardando}
                      onClick={() => marcar(alumno, valor)}
                      className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition ${
                        activo ? clase : 'bg-slate-100 text-slate-600 active:scale-95'
                      } disabled:opacity-50`}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
