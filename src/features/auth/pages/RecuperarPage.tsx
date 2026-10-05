import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Loader2, MailCheck, ChevronLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { mensajeErrorAuth, urlRestablecer } from '../password';
import { EMPRESA } from '../../legal/version';

/** "Olvidé mi contraseña": envía al correo un enlace para crear una nueva. */
export function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: urlRestablecer(),
    });
    setCargando(false);
    if (error) {
      setError(mensajeErrorAuth(error));
      return;
    }
    // Mismo mensaje exista o no la cuenta: no revelamos qué correos están registrados.
    setEnviado(true);
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {enviado ? (
          <div className="space-y-3 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-green-500" />
            <h1 className="text-lg font-bold text-brand-800">Revisa tu correo</h1>
            <p className="text-sm text-slate-500">
              Si <b>{email.trim()}</b> está registrado, te enviamos un enlace para crear una nueva
              contraseña. Puede tardar unos minutos; revisa también la carpeta de spam.
            </p>
            <p className="text-xs text-slate-400">
              ¿No te llega? Escríbenos a {EMPRESA.contactoEmail} o por WhatsApp al{' '}
              {EMPRESA.contactoWhatsApp} y te ayudamos a recuperar el acceso.
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <KeyRound className="h-10 w-10 text-arena-400" />
              <h1 className="text-xl font-bold text-brand-800">¿Olvidaste tu contraseña?</h1>
              <p className="text-sm text-slate-400">
                Escribe el correo con el que te registraste y te enviaremos un enlace para crear una
                nueva.
              </p>
            </div>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
            >
              {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar enlace
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="flex items-center justify-center gap-1 text-sm font-semibold text-brand-600"
        >
          <ChevronLeft className="h-4 w-4" /> Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
