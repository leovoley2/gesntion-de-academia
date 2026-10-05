import { useState } from 'react';
import { UserRound, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { mensajeErrorAuth } from '../password';
import { FormNuevaPassword } from '../components/FormNuevaPassword';

/** "Mi cuenta": datos del usuario y cambio de contraseña (todos los roles). */
export function CuentaPage() {
  const { session, perfil } = useAuth();
  const [cambiada, setCambiada] = useState(false);
  const email = session?.user.email ?? '';

  async function cambiar(nueva: string, actual: string) {
    setCambiada(false);
    // Confirmamos la contraseña actual antes de cambiarla: así una sesión
    // abierta en un dispositivo ajeno no basta para quitarle la cuenta a nadie.
    const { error: errActual } = await supabase.auth.signInWithPassword({ email, password: actual });
    if (errActual) {
      throw new Error(
        errActual.message.toLowerCase().includes('invalid login credentials')
          ? 'La contraseña actual no es correcta.'
          : mensajeErrorAuth(errActual)
      );
    }
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) throw new Error(mensajeErrorAuth(error));
    setCambiada(true);
  }

  return (
    <div className="pagina-media space-y-4">
      <h1 className="flex items-center gap-2 pt-2 text-lg font-bold text-slate-800">
        <UserRound className="h-5 w-5 text-brand-600" /> Mi cuenta
      </h1>

      <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Nombre</dt>
              <dd className="font-semibold text-slate-800">{perfil?.nombre_completo}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Correo</dt>
              <dd className="break-all text-slate-700">{email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Rol</dt>
              <dd className="capitalize text-slate-700">{perfil?.rol}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-slate-800">
            <KeyRound className="h-5 w-5 text-brand-600" /> Cambiar contraseña
          </h2>
          {cambiada && (
            <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Contraseña actualizada.
            </p>
          )}
          <FormNuevaPassword pedirActual textoBoton="Cambiar contraseña" onGuardar={cambiar} />
        </section>
      </div>
    </div>
  );
}
