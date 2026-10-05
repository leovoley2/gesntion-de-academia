import {
  Home,
  ClipboardCheck,
  CalendarDays,
  Wallet,
  Users,
  MapPin,
  CreditCard,
  UserPlus,
  RefreshCw,
  UserCog,
  DollarSign,
  CalendarClock,
  BarChart3,
  ClipboardList,
  UserRound,
} from 'lucide-react';
import type { RolUsuario } from '../../types/database.types';

export interface ItemNav {
  to: string;
  label: string;
  Icon: typeof Home;
  roles: RolUsuario[];
  /** También aparece en la barra inferior del móvil (hay sitio para ~6). */
  movil?: boolean;
}

/**
 * Destinos de navegación. En escritorio la barra lateral los muestra todos;
 * en el móvil solo los marcados `movil` (el resto se alcanza desde Inicio).
 */
export const ITEMS_NAV: ItemNav[] = [
  { to: '/', label: 'Inicio', Icon: Home, roles: ['administrador', 'entrenador', 'alumno'], movil: true },
  { to: '/ingresos', label: 'Ingresos', Icon: UserPlus, roles: ['administrador'], movil: true },
  { to: '/asistencia', label: 'Asistencia', Icon: ClipboardCheck, roles: ['entrenador'], movil: true },
  { to: '/reservas', label: 'Reservas', Icon: CalendarDays, roles: ['alumno', 'entrenador'], movil: true },
  { to: '/inscripcion', label: 'Inscripción', Icon: ClipboardList, roles: ['alumno'] },
  { to: '/mis-pagos', label: 'Pagos', Icon: CreditCard, roles: ['alumno'], movil: true },
  { to: '/membresias', label: 'Planes', Icon: CreditCard, roles: ['administrador'], movil: true },
  { to: '/pagos', label: 'Pagos', Icon: Wallet, roles: ['administrador'], movil: true },
  { to: '/renovaciones', label: 'Renovaciones', Icon: RefreshCw, roles: ['administrador'] },
  { to: '/alumnos', label: 'Días de alumnos', Icon: UserCog, roles: ['administrador'] },
  { to: '/horarios', label: 'Horarios', Icon: CalendarClock, roles: ['administrador'] },
  { to: '/tarifas', label: 'Tarifas', Icon: DollarSign, roles: ['administrador', 'entrenador'] },
  { to: '/usuarios', label: 'Usuarios', Icon: Users, roles: ['administrador'], movil: true },
  { to: '/sedes', label: 'Sedes', Icon: MapPin, roles: ['administrador'], movil: true },
  { to: '/reportes', label: 'Reportes', Icon: BarChart3, roles: ['administrador'] },
  // En móvil se llega desde el icono de la cabecera.
  { to: '/cuenta', label: 'Mi cuenta', Icon: UserRound, roles: ['administrador', 'entrenador', 'alumno'] },
];
