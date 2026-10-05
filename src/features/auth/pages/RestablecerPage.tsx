import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase, vieneDeRecuperacion, errorEnlaceAuth } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { mensajeErrorAuth } from '../password';
import { FormNuevaPassword } from '../components/FormNuevaPassword';

/**
 * Destino del enlace del correo de recuperación: supabase-js abre una sesión
 * temporal a partir del enlace y aquí el usuario fija su nueva contraseña.
 */
export function RestablecerPage() {
  const { session, cargando } = useAuth();
  const navigate = useNavigate();
  const [listo, setListo] = useState(false);

  // Sin enlace de recuperación: quien ya inició sesión la cambia en "Mi cuenta".
  // (Esperamos a saber si hay sesión antes de decidir a dónde mandarlo.)
  if (!vieneDeRecuperacion && !errorEnlaceAuth && !cargando) {
    return <Navigate to={session ? '/cuenta' : '/recuperar'} replace />;
  }

  let contenido;
  if (cargando) {
    contenido = <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />;
  } else if (errorEnlaceAuth || !session) {
    contenido = (
      <div className="space-y-3 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="text-lg font-bold text-brand-800">El enlace ya no es válido</h1>
        <p className="text-sm text-slate-500">
          {errorEnlaceAuth === 'otp_expired'
            ? 'El enlace caducó o ya se usó. '
            : 'No pudimos verificar el enlace. '}
          Pide uno nuevo; recuerda usar el último correo que te llegue.
        </p>
        <Link
          to="/recuperar"
          className="inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Pedir un enlace nuevo
        </Link>
      </div>
    );
  } else if (listo) {
    contenido = (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
        <h1 className="text-lg font-bold text-brand-800">Contraseña actualizada</h1>
        <p className="text-sm text-slate-500">Ya puedes usar tu nueva contraseña.</p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Ir a la app
        </button>
      </div>
    );
  } else {
    contenido = (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <KeyRound className="h-10 w-10 text-arena-400" />
          <h1 className="text-xl font-bold text-brand-800">Crea tu nueva contraseña</h1>
          <p className="text-sm text-slate-400">{session.user.email}</p>
        </div>
        <FormNuevaPassword
          textoBoton="Guardar contraseña"
          onGuardar={async (nueva) => {
            const { error } = await supabase.auth.updateUser({ password: nueva });
            if (error) throw new Error(mensajeErrorAuth(error));
            setListo(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {contenido}
      </div>
    </div>
  );
}
