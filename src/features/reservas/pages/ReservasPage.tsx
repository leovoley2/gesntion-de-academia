import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { CalendarioDisponibilidad } from '../components/CalendarioDisponibilidad';
import { CalendarioReservaPersonalizada } from '../components/CalendarioReservaPersonalizada';
import { SolicitudesReserva } from '../components/SolicitudesReserva';
import { MisReservas } from '../components/MisReservas';
import { listarEntrenadores, tarifaIndividual } from '../api/reservas.api';
import { listarSedes } from '../../sedes/api/sedes.api';

export function ReservasPage() {
  const { session, perfil } = useAuth();

  // El entrenador gestiona solicitudes + su disponibilidad.
  if (perfil?.rol === 'entrenador') {
    return (
      <>
        <div className="mx-auto w-full max-w-md px-4 pt-4">
          <SolicitudesReserva entrenadorId={session!.user.id} />
        </div>
        <CalendarioDisponibilidad entrenadorId={session!.user.id} />
      </>
    );
  }

  // El alumno reserva: elige entrenador y sede, luego ve los horarios libres.
  return <ReservaAlumno alumnoId={session?.user.id ?? ''} />;
}

function ReservaAlumno({ alumnoId }: { alumnoId: string }) {
  const qc = useQueryClient();
  const [entrenadorId, setEntrenadorId] = useState('');
  const [sedeId, setSedeId] = useState('');

  const { data: entrenadores } = useQuery({
    queryKey: ['entrenadores'],
    queryFn: listarEntrenadores,
  });
  const { data: sedes } = useQuery({ queryKey: ['sedes'], queryFn: listarSedes });

  const entrenadorSel = entrenadores?.find((e) => e.id === entrenadorId);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4">
      <h1 className="pt-2 text-lg font-bold text-slate-800">Reservar clase personalizada</h1>

      {/* Historial de solicitudes del alumno */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
          <History className="h-4 w-4 text-brand-600" /> Mis solicitudes
        </h2>
        <MisReservas alumnoId={alumnoId} />
      </section>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-xs text-slate-500">
          Entrenador
          <select
            value={entrenadorId}
            onChange={(e) => setEntrenadorId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">— Elige un entrenador —</option>
            {entrenadores?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre_completo}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-slate-500">
          Sede
          <select
            value={sedeId}
            onChange={(e) => setSedeId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400"
          >
            <option value="">— Elige una sede —</option>
            {sedes?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {entrenadorId && sedeId ? (
        <CalendarioReservaPersonalizada
          alumnoId={alumnoId}
          entrenadorId={entrenadorId}
          entrenadorNombre={entrenadorSel?.nombre_completo}
          sedeId={sedeId}
          tarifa={tarifaIndividual(entrenadorSel)}
          onReservaCreada={() => qc.invalidateQueries({ queryKey: ['mis-reservas', alumnoId] })}
        />
      ) : (
        <p className="py-8 text-center text-sm text-slate-500">
          Elige un entrenador y una sede para ver los horarios disponibles.
        </p>
      )}
    </div>
  );
}
