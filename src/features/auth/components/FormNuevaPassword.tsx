import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { MIN_PASSWORD, validarPassword } from '../password';

interface Props {
  /** Pide también la contraseña actual (cambio desde "Mi cuenta"). */
  pedirActual?: boolean;
  textoBoton: string;
  /** Lanza un Error con el mensaje a mostrar si algo falla. */
  onGuardar: (nueva: string, actual: string) => Promise<void>;
}

const INPUT =
  'w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-brand-400';

/** Formulario de contraseña nueva + repetición (y opcionalmente la actual). */
export function FormNuevaPassword({ pedirActual = false, textoBoton, onGuardar }: Props) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validarPassword(nueva, repetida);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await onGuardar(nueva, actual);
      setActual('');
      setNueva('');
      setRepetida('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la contraseña.');
    } finally {
      setCargando(false);
    }
  }

  const tipo = visible ? 'text' : 'password';

  return (
    <form onSubmit={enviar} className="space-y-3">
      {pedirActual && (
        <input
          type={tipo}
          autoComplete="current-password"
          placeholder="Contraseña actual"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          required
          className={INPUT}
        />
      )}
      <div className="relative">
        <input
          type={tipo}
          autoComplete="new-password"
          placeholder={`Nueva contraseña (mín. ${MIN_PASSWORD})`}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          required
          className={INPUT}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400"
          aria-label={visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <input
        type={tipo}
        autoComplete="new-password"
        placeholder="Repite la nueva contraseña"
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
        required
        className={INPUT}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={cargando}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
      >
        {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
        {textoBoton}
      </button>
    </form>
  );
}
