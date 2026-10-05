import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  Users,
  TrendingUp,
  UserPlus,
  MapPin,
  CreditCard,
  CalendarClock,
  RefreshCw,
  UserCog,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { metricasAdmin } from '../api/dashboard.api';
import { actualizarVencimientos } from '../../membresias/api/renovaciones.api';

export function DashboardAdmin() {
  const { perfil } = useAuth();
  // Al abrir el panel, marca como vencidas las mensualidades caducadas
  // y luego trae las métricas ya consistentes.
  const { data: m } = useQuery({
    queryKey: ['metricas-admin'],
    queryFn: async () => {
      await actualizarVencimientos().catch(() => 0);
      return metricasAdmin();
    },
  });
  const v = (n?: number) => (n === undefined ? '—' : String(n));

  return (
    <div className="pagina space-y-4">
      <h1 className="text-lg font-bold text-slate-800">Hola, {perfil?.nombre_completo}</h1>
      <p className="text-sm text-slate-500">Panel administrativo</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tarjeta
          Icon={TrendingUp}
          titulo="Ingresos del mes"
          valor={m ? `S/ ${m.ingresosMes.toFixed(2)}` : 'S/ —'}
          color="text-green-600"
        />
        <Tarjeta Icon={Users} titulo="Alumnos activos" valor={v(m?.alumnosActivos)} color="text-brand-600" />
        <Tarjeta Icon={Wallet} titulo="Pagos pendientes" valor={v(m?.pagosPendientes)} color="text-amber-600" />
        <Tarjeta Icon={Users} titulo="Membresías vencidas" valor={v(m?.membresiasVencidas)} color="text-red-600" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          to="/reportes"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <BarChart3 className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Reporte mensual</p>
            <p className="text-xs text-slate-400">Ingresos por método y concepto, nuevos alumnos</p>
          </div>
        </Link>

        <Link
          to="/usuarios"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <UserPlus className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Gestionar usuarios</p>
            <p className="text-xs text-slate-400">Crear entrenadores y alumnos</p>
          </div>
        </Link>

        <Link
          to="/renovaciones"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <RefreshCw className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Renovaciones y vencimientos</p>
            <p className="text-xs text-slate-400">Renueva mensualidades y envía recordatorios</p>
          </div>
        </Link>

        <Link
          to="/alumnos"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <UserCog className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Días de entrenamiento</p>
            <p className="text-xs text-slate-400">Modifica los días de cada alumno</p>
          </div>
        </Link>

        <Link
          to="/membresias"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <CreditCard className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Membresías</p>
            <p className="text-xs text-slate-400">Asignar planes y créditos a alumnos</p>
          </div>
        </Link>

        <Link
          to="/tarifas"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <DollarSign className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Tarifas personalizadas</p>
            <p className="text-xs text-slate-400">Precios por entrenador y modalidad</p>
          </div>
        </Link>

        <Link
          to="/horarios"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <CalendarClock className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Horarios de clases</p>
            <p className="text-xs text-slate-400">Crear clases grupales e inscribir alumnos</p>
          </div>
        </Link>

        <Link
          to="/sedes"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98]"
        >
          <MapPin className="h-6 w-6 text-brand-600" />
          <div>
            <p className="font-semibold text-slate-800">Sedes y canchas</p>
            <p className="text-xs text-slate-400">Administrar lugares y tarifas</p>
          </div>
        </Link>
      </div>

    </div>
  );
}

function Tarjeta({
  Icon,
  titulo,
  valor,
  color,
}: {
  Icon: typeof Wallet;
  titulo: string;
  valor: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className={`h-5 w-5 ${color}`} />
      <p className="mt-2 text-xs text-slate-400">{titulo}</p>
      <p className="text-lg font-bold text-slate-800">{valor}</p>
    </div>
  );
}
