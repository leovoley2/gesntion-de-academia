import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, CalendarDays, DollarSign } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { clasesHoyEntrenador } from '../api/dashboard.api';

export function DashboardEntrenador() {
  const { session, perfil } = useAuth();
  const { data: clasesHoy } = useQuery({
    queryKey: ['clases-hoy', session?.user.id],
    queryFn: () => clasesHoyEntrenador(session!.user.id),
    enabled: !!session,
  });

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4">
      <h1 className="text-lg font-bold text-slate-800">Hola, {perfil?.nombre_completo}</h1>
      <p className="text-sm text-slate-500">
        {clasesHoy === undefined
          ? 'Tu agenda de hoy'
          : clasesHoy === 0
            ? 'No tienes clases hoy'
            : `Tienes ${clasesHoy} clase(s) hoy`}
      </p>

      <Link
        to="/asistencia"
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
      >
        <ClipboardCheck className="h-6 w-6 text-brand-600" />
        <div>
          <p className="font-semibold text-slate-800">Tomar asistencia</p>
          <p className="text-xs text-slate-400">Marca a tus alumnos del día</p>
        </div>
      </Link>

      <Link
        to="/reservas"
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
      >
        <CalendarDays className="h-6 w-6 text-brand-600" />
        <div>
          <p className="font-semibold text-slate-800">Mi disponibilidad</p>
          <p className="text-xs text-slate-400">Habilita o bloquea horarios</p>
        </div>
      </Link>

      <Link
        to="/tarifas"
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
      >
        <DollarSign className="h-6 w-6 text-brand-600" />
        <div>
          <p className="font-semibold text-slate-800">Mis tarifas</p>
          <p className="text-xs text-slate-400">Precio de tus clases personalizadas</p>
        </div>
      </Link>
    </div>
  );
}
