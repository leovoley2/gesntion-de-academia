import { Loader2 } from 'lucide-react';

/** Botón "Cargar más" para listas paginadas (ver usePaginado). No pinta nada si no hay más. */
export function CargarMas({
  hayMas,
  cargando,
  onClick,
  mostrados,
  total,
}: {
  hayMas: boolean;
  cargando: boolean;
  onClick: () => void;
  mostrados: number;
  total: number;
}) {
  if (!hayMas) return null;
  return (
    <button
      onClick={onClick}
      disabled={cargando}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-brand-600 active:bg-brand-50 disabled:opacity-60"
    >
      {cargando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      Cargar más ({mostrados} de {total})
    </button>
  );
}
