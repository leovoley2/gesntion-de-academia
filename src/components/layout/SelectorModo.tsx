import { ShieldCheck, Dumbbell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Modo } from '../../context/rolVista';

const OPCIONES: { modo: Modo; label: string; Icon: typeof ShieldCheck }[] = [
  { modo: 'administrador', label: 'Administrador', Icon: ShieldCheck },
  { modo: 'entrenador', label: 'Entrenador', Icon: Dumbbell },
];

/**
 * Interruptor "Administrador / Entrenador" para el admin que también da
 * clases. Para el resto de usuarios no pinta nada.
 */
export function SelectorModo() {
  const { puedeCambiarModo, rolVista, cambiarModo } = useAuth();
  if (!puedeCambiarModo) return null;

  return (
    <div role="radiogroup" aria-label="Modo de la app" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {OPCIONES.map(({ modo, label, Icon }) => {
        const activo = rolVista === modo;
        return (
          <button
            key={modo}
            role="radio"
            aria-checked={activo}
            onClick={() => !activo && cambiarModo(modo)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
              activo ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
