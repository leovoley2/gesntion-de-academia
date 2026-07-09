import { useAuth } from '../../../context/AuthContext';
import { DashboardAdmin } from './DashboardAdmin';
import { DashboardEntrenador } from './DashboardEntrenador';
import { DashboardAlumno } from './DashboardAlumno';

export function DashboardRouter() {
  const { perfil } = useAuth();

  switch (perfil?.rol) {
    case 'administrador':
      return <DashboardAdmin />;
    case 'entrenador':
      return <DashboardEntrenador />;
    case 'alumno':
      return <DashboardAlumno />;
    default:
      return <p className="p-6 text-sm text-slate-500">Cargando perfil…</p>;
  }
}
