import { NavLink } from 'react-router-dom';
import { LogOut, CircleDot } from 'lucide-react';
import type { Perfil } from '../../types/database.types';
import { ITEMS_NAV } from './navegacion';

/**
 * Barra lateral con todas las secciones del rol, siempre a la vista.
 * Tablet (md): solo iconos (con tooltip). Escritorio (lg+): iconos + nombres.
 */
export function SideNav({ perfil, onSalir }: { perfil: Perfil | null; onSalir: () => void }) {
  const rol = perfil?.rol;
  const visibles = rol ? ITEMS_NAV.filter((i) => i.roles.includes(rol)) : [];

  return (
    <aside className="hidden w-20 shrink-0 flex-col border-r border-slate-200 bg-white md:flex lg:w-64">
      <div className="flex items-center justify-center gap-2 border-b border-slate-200 px-5 py-4 lg:justify-start">
        <CircleDot className="h-7 w-7 text-arena-400" />
        <div className="hidden lg:block">
          <p className="text-sm font-bold text-brand-800">Arena Voleibol Club</p>
          <p className="text-xs capitalize text-slate-400">{rol ?? ''}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibles.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            aria-label={label}
            className={({ isActive }) =>
              `flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:justify-start ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-center gap-2 border-t border-slate-200 px-4 py-3 lg:justify-between">
        <p className="hidden truncate text-sm font-medium text-slate-700 lg:block">{perfil?.nombre_completo}</p>
        <button
          onClick={onSalir}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
