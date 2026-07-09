import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleDot, Loader2, AlertTriangle } from 'lucide-react';
import { supabase, supabaseConfigurado } from '../../../lib/supabaseClient';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setCargando(false);
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes('invalid login credentials')) {
        setError('Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.');
      } else if (m.includes('email not confirmed')) {
        setError('Tu correo aún no está confirmado. Revisa tu bandeja o escríbenos por WhatsApp.');
      } else if (m.includes('failed to fetch') || m.includes('network') || m.includes('fetch')) {
        setError('No pudimos conectar. Revisa tu conexión a internet e inténtalo de nuevo.');
      } else {
        setError('No pudimos iniciar sesión. Inténtalo de nuevo en un momento.');
      }
      return;
    }
    navigate('/');
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col items-center gap-2">
          <CircleDot className="h-10 w-10 text-arena-400" />
          <h1 className="text-xl font-bold text-brand-800">Arena Voleibol Club</h1>
          <p className="text-sm text-slate-400">Inicia sesión para continuar</p>
        </div>

        {!supabaseConfigurado && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Falta configurar Supabase. Edita <code>.env.local</code> con tu URL y anon key,
              luego reinicia <code>npm run dev</code>.
            </span>
          </div>
        )}

        <div className="space-y-3">
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
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
        >
          {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
          Entrar
        </button>

        <p className="text-center text-sm text-slate-500">
          ¿Nuevo en la academia?{' '}
          <Link to="/registro" className="font-semibold text-brand-600">
            Regístrate aquí
          </Link>
        </p>

        <p className="text-center text-xs text-slate-400">
          <Link to="/terminos" className="text-slate-500">
            Términos
          </Link>
          {' · '}
          <Link to="/privacidad" className="text-slate-500">
            Privacidad
          </Link>
        </p>
      </form>
    </div>
  );
}
