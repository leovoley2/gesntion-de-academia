import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** Contenedor legible para los documentos legales, con botón de volver. */
export function LegalLayout({ titulo, children }: { titulo: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-full bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/login'))}
          className="rounded-lg p-1.5 text-slate-500 active:bg-slate-100"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-slate-800">{titulo}</h1>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <article className="space-y-4 text-sm leading-relaxed text-slate-600">{children}</article>
        <p className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          <Link to="/terminos" className="text-brand-600">
            Términos
          </Link>
          {' · '}
          <Link to="/privacidad" className="text-brand-600">
            Privacidad
          </Link>
        </p>
      </main>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-2 text-base font-bold text-slate-800">{children}</h2>;
}
