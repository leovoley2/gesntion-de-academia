import { NavLink } from 'react-router-dom';
import { Home, ClipboardCheck, CalendarDays, Wallet, Users, MapPin, CreditCard, UserPlus } from 'lucide-react';
import type { RolUsuario } from '../../types/database.types';

interface ItemNav {
  to: string;
  label: string;
  Icon: typeof Home;
  roles: RolUsuario[];
}

const ITEMS: ItemNav[] = [
  { to: '/', label: 'Inicio', Icon: Home, roles: ['administrador', 'entrenador', 'alumno'] },
  { to: '/ingresos', label: 'Ingresos', Icon: UserPlus, roles: ['administrador'] },
  { to: '/asistencia', label: 'Asistencia', Icon: ClipboardCheck, roles: ['entrenador'] },
  { to: '/reservas', label: 'Reservas', Icon: CalendarDays, roles: ['alumno', 'entrenador'] },
  { to: '/mis-pagos', label: 'Pagos', Icon: CreditCard, roles: ['alumno'] },
  { to: '/membresias', label: 'Planes', Icon: CreditCard, roles: ['administrador'] },
  { to: '/pagos', label: 'Pagos', Icon: Wallet, roles: ['administrador'] },
  { to: '/usuarios', label: 'Usuarios', Icon: Users, roles: ['administrador'] },
  { to: '/sedes', label: 'Sedes', Icon: MapPin, roles: ['administrador'] },
];

export function BottomNav({ rol }: { rol?: RolUsuario }) {
  if (!rol) return null;
  const visibles = ITEMS.filter((i) => i.roles.includes(rol));

  return (
    <nav className="sticky bottom-0 z-10 grid grid-flow-col border-t border-slate-200 bg-white">
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
