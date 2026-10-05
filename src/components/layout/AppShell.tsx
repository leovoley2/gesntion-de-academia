import { type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, CircleDot } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';

/**
 * Móvil: cabecera arriba + barra de navegación abajo.
 * Tablet (md+): barra lateral de iconos. Escritorio (lg+): barra lateral con nombres.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, cerrarSesion } = useAuth();

  return (
    <div className="flex h-full bg-slate-50">
      <SideNav perfil={perfil} onSalir={cerrarSesion} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <CircleDot className="h-6 w-6 text-arena-400" />
            <div>
              <p className="text-sm font-bold text-brand-800">Arena Voleibol Club</p>
              <p className="text-xs capitalize text-slate-400">{perfil?.rol ?? ''}</p>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            className="rounded-lg p-2 text-slate-500 active:bg-slate-100"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>

        <BottomNav rol={perfil?.rol} />
      </div>
    </div>
  );
}
