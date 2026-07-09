import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { RolUsuario } from '../types/database.types';

interface Props {
  permitidos: RolUsuario[];
}

export function RoleRoute({ permitidos }: Props) {
  const { perfil } = useAuth();

  // Sin perfil aún (recién iniciada la sesión) no se sabe el rol:
  // mostrar loader en vez de renderizar contenido restringido.
  if (!perfil) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!permitidos.includes(perfil.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
