import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, vieneDeRecuperacion, errorEnlaceAuth } from '../lib/supabaseClient';
import type { Perfil, RolUsuario } from '../types/database.types';
import { puedeCambiarModo, rolDeVista, type Modo } from './rolVista';

interface AuthState {
  session: Session | null;
  perfil: Perfil | null;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
  /** Rol con el que se pinta la app (el admin-entrenador puede alternarlo). */
  rolVista: RolUsuario | undefined;
  puedeCambiarModo: boolean;
  cambiarModo: (modo: Modo) => void;
}

const CLAVE_MODO = 'modo-vista';

function leerModo(): Modo | null {
  try {
    const m = localStorage.getItem(CLAVE_MODO);
    return m === 'entrenador' || m === 'administrador' ? m : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState<Modo | null>(leerModo);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Si Supabase devolvió el enlace de recuperación a otra ruta (p. ej. la raíz,
  // cuando /restablecer no está en las Redirect URLs), lo llevamos a su página.
  useEffect(() => {
    if ((vieneDeRecuperacion || errorEnlaceAuth) && pathname !== '/restablecer') {
      navigate('/restablecer', { replace: true });
    }
    // Solo al cargar la app: después el usuario navega con normalidad.
  }, []);

  async function cargarPerfil(userId: string) {
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single();
    setPerfil(data ?? null);
  }

  useEffect(() => {
    let activo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!activo) return;
      setSession(data.session);
      if (data.session) await cargarPerfil(data.session.user.id);
      if (activo) setCargando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        // No consultar la BD dentro del propio callback: supabase-js mantiene
        // un lock durante onAuthStateChange y un await aquí puede colgar la app.
        setTimeout(() => {
          if (activo) void cargarPerfil(newSession.user.id);
        }, 0);
      } else {
        setPerfil(null);
      }
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
  }

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    try {
      localStorage.setItem(CLAVE_MODO, nuevo);
    } catch {
      // Sin almacenamiento (modo privado): el modo dura lo que la pestaña.
    }
    // Cada modo tiene su propio menú: volver al inicio evita quedarse en una
    // pantalla que el otro modo no muestra.
    navigate('/', { replace: true });
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        perfil,
        cargando,
        cerrarSesion,
        rolVista: rolDeVista(perfil, modo),
        puedeCambiarModo: puedeCambiarModo(perfil),
        cambiarModo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
