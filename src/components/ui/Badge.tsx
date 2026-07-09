import { type ReactNode } from 'react';

type Variante = 'verde' | 'rojo' | 'ambar' | 'gris';

const ESTILOS: Record<Variante, string> = {
  verde: 'bg-green-100 text-green-700',
  rojo: 'bg-red-100 text-red-700',
  ambar: 'bg-amber-100 text-amber-700',
  gris: 'bg-slate-100 text-slate-600',
};

export function Badge({ variante = 'gris', children }: { variante?: Variante; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILOS[variante]}`}>
      {children}
    </span>
  );
}
