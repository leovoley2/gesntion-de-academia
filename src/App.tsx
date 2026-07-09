import { Routes, Route, Outlet } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegistroPage } from './features/auth/pages/RegistroPage';
import { TerminosPage } from './features/legal/TerminosPage';
import { PrivacidadPage } from './features/legal/PrivacidadPage';
import { InscripcionPage } from './features/planes/pages/InscripcionPage';
import { NuevosIngresosPage } from './features/ingresos/pages/NuevosIngresosPage';
import { DashboardRouter } from './features/dashboard/pages/DashboardRouter';
import { AsistenciaPage } from './features/asistencia/pages/AsistenciaPage';
import { ReservasPage } from './features/reservas/pages/ReservasPage';
import { PagosPage } from './features/pagos/pages/PagosPage';
import { GestionUsuariosPage } from './features/usuarios/pages/GestionUsuariosPage';
import { SedesPage } from './features/sedes/pages/SedesPage';
import { MembresiasPage } from './features/membresias/pages/MembresiasPage';
import { RenovacionesPage } from './features/membresias/pages/RenovacionesPage';
import { HorariosPage } from './features/horarios/pages/HorariosPage';
import { MisPagosPage } from './features/pagos/pages/MisPagosPage';
import { GestionDiasPage } from './features/alumnos/pages/GestionDiasPage';
import { TarifasPage } from './features/tarifas/pages/TarifasPage';
import { ReportesPage } from './features/reportes/pages/ReportesPage';

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />
      <Route path="/terminos" element={<TerminosPage />} />
      <Route path="/privacidad" element={<PrivacidadPage />} />

      {/* Privadas */}
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <AppShell>
              <Outlet />
            </AppShell>
          }
        >
          <Route index element={<DashboardRouter />} />

          {/* Solo entrenador / administrador */}
          <Route element={<RoleRoute permitidos={['entrenador', 'administrador']} />}>
            <Route path="asistencia" element={<AsistenciaPage />} />
          </Route>

          {/* Alumno y entrenador */}
          <Route element={<RoleRoute permitidos={['alumno', 'entrenador']} />}>
            <Route path="reservas" element={<ReservasPage />} />
          </Route>

          {/* Entrenador (su tarifa) y administrador (todas) */}
          <Route element={<RoleRoute permitidos={['entrenador', 'administrador']} />}>
            <Route path="tarifas" element={<TarifasPage />} />
          </Route>

          {/* Solo alumno */}
          <Route element={<RoleRoute permitidos={['alumno']} />}>
            <Route path="mis-pagos" element={<MisPagosPage />} />
            <Route path="inscripcion" element={<InscripcionPage />} />
          </Route>

          {/* Solo administrador */}
          <Route element={<RoleRoute permitidos={['administrador']} />}>
            <Route path="ingresos" element={<NuevosIngresosPage />} />
            <Route path="pagos" element={<PagosPage />} />
            <Route path="usuarios" element={<GestionUsuariosPage />} />
            <Route path="sedes" element={<SedesPage />} />
            <Route path="membresias" element={<MembresiasPage />} />
            <Route path="renovaciones" element={<RenovacionesPage />} />
            <Route path="alumnos" element={<GestionDiasPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="horarios" element={<HorariosPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
