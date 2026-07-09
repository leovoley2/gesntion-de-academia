import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleDot, Loader2, MailCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { TERMINOS_VERSION } from '../../legal/version';

interface Bienvenida {
  nombre: string;
  conSesion: boolean; // true = ya entró (confirmación de correo desactivada)
}

export function RegistroPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [bienvenida, setBienvenida] = useState<Bienvenida | null>(null);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!acepta) {
      setError('Debes aceptar los Términos y la Política de Privacidad para continuar.');
      return;
    }
    setCargando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // La versión aceptada se guarda como constancia (trigger handle_new_user).
        data: {
          nombre_completo: nombre.trim(),
          telefono: telefono.trim(),
          terminos_version: TERMINOS_VERSION,
        },
      },
    });
    setCargando(false);

    if (error) {
      const msg = String(error.message ?? '');
      if (/confirmation email|rate limit|sending/i.test(msg)) {
        setError(
          'No pudimos enviar el correo de confirmación en este momento. ' +
            'Inténtalo de nuevo en unos minutos o contacta a la academia.'
        );
      } else if (/already registered|already exists/i.test(msg)) {
        setError('Ese correo ya está registrado. Inicia sesión o usa otro correo.');
      } else {
        setError(msg || 'No se pudo completar el registro. Inténtalo de nuevo.');
      }
      return;
    }
    // Bienvenida personalizada. Si la confirmación de correo está desactivada,
    // `data.session` existe y el atleta puede entrar directo a elegir su plan.
    setBienvenida({
      nombre: nombre.trim().split(' ')[0] || nombre.trim(),
      conSesion: !!data.session,
    });
  }

  if (bienvenida) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
          {/* Cabecera con la marca del club */}
          <div className="bg-brand-800 px-6 py-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-arena-400">
              <CircleDot className="h-7 w-7 text-arena-400" />
            </div>
            <p className="mt-3 text-lg font-bold tracking-wide text-white">ARENA VOLEIBOL CLUB</p>
            <p className="text-xs uppercase tracking-widest text-arena-300">Vóley Playa · Lima</p>
          </div>

          <div className="space-y-3 px-6 py-6">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="text-xl font-bold text-brand-800">
              ¡Bienvenido, {bienvenida.nombre}! 🏐
            </h1>

            {bienvenida.conSesion ? (
              <>
                <p className="text-sm text-slate-500">
                  Tu cuenta está lista. Ahora elige tu plan de la academia o una clase
                  personalizada, y empieza a entrenar con nosotros.
                </p>
                <button
                  onClick={() => navigate('/inscripcion')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95"
                >
                  <Sparkles className="h-4 w-4" /> Elegir mi plan
                </button>
              </>
            ) : (
              <>
                <MailCheck className="mx-auto h-6 w-6 text-brand-600" />
                <p className="text-sm text-slate-500">
                  Te enviamos un correo para confirmar tu cuenta. Ábrelo, confirma y luego inicia
                  sesión para elegir tu plan.
                </p>
                <Link
                  to="/login"
                  className="block rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95"
                >
                  Ir a iniciar sesión
                </Link>
              </>
            )}

            <p className="text-xs text-slate-400">
              ¿Dudas? Escríbenos por WhatsApp y te ayudamos con gusto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <form
        onSubmit={registrar}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col items-center gap-2">
          <CircleDot className="h-10 w-10 text-arena-400" />
          <h1 className="text-xl font-bold text-brand-800">Arena Voleibol Club</h1>
          <p className="text-sm text-slate-400">Crea tu cuenta y elige tu plan</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            autoComplete="name"
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Teléfono (WhatsApp)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
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
            autoComplete="new-password"
            placeholder="Contraseña (mín. 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
          />
          <span>
            He leído y acepto los{' '}
            <Link to="/terminos" target="_blank" className="font-semibold text-brand-600">
              Términos y Condiciones
            </Link>{' '}
            y la{' '}
            <Link to="/privacidad" target="_blank" className="font-semibold text-brand-600">
              Política de Privacidad
            </Link>
            . Si el alumno es menor de edad, declaro ser su padre/madre o apoderado.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={cargando || !acepta}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
        >
          {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear cuenta
        </button>

        <p className="text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-600">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
