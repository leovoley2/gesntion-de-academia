import { NavLink } from 'react-router-dom';
import type { RolUsuario } from '../../types/database.types';
import { ITEMS_NAV } from './navegacion';

/** Barra de navegación inferior (solo móvil; desde tablet manda la barra lateral). */
export function BottomNav({ rol }: { rol?: RolUsuario }) {
  if (!rol) return null;
  const visibles = ITEMS_NAV.filter((i) => i.movil && i.roles.includes(rol));

  return (
    <nav className="sticky bottom-0 z-10 grid grid-flow-col border-t border-slate-200 bg-white md:hidden">
      {visibles.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2 text-xs transition ${
              isActive ? 'text-brand-600' : 'text-slate-400'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
