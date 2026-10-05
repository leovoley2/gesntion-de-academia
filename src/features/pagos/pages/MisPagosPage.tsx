import { Link } from 'react-router-dom';
import { Wallet, Loader2, FileText, Info, Sparkles } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { listarMisPagos, urlComprobante } from '../api/pagos.api';
import { Badge } from '../../../components/ui/Badge';
import { CargarMas } from '../../../components/ui/CargarMas';
import { usePaginado } from '../../../lib/paginacion';
import { EMPRESA } from '../../legal/version';

/**
 * Historial de pagos del alumno. Los pagos nuevos se generan solos: al
 * inscribirse o comprar un paquete ("Elegir mi plan") y al confirmar una
 * sesión suelta. Las renovaciones las registra el admin. Antes había aquí un
 * formulario propio que creaba pagos sin inscribir al alumno en ninguna clase.
 */
export function MisPagosPage() {
  const { session } = useAuth();
  const alumnoId = session?.user.id ?? '';

  const {
    items: pagos,
    total,
    isLoading,
    hayMas,
    cargandoMas,
    cargarMas,
  } = usePaginado(['mis-pagos', alumnoId], (pagina) => listarMisPagos(alumnoId, pagina), {
    enabled: !!alumnoId,
  });

  async function ver(ruta: string) {
    const url = await urlComprobante(ruta);
    if (url) window.open(url, '_blank');
  }

  return (
    <div className="pagina pagina-dos-columnas">
      <section className="panel-lateral space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-slate-800">
          <Info className="h-5 w-5 text-brand-600" /> ¿Cómo pago?
        </h2>
        <p className="text-sm text-slate-600">
          Para inscribirte en la academia o comprar un paquete de clases personalizadas, elige tu
          plan y adjunta tu comprobante allí mismo.
        </p>
        <Link
          to="/inscripcion"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> Elegir mi plan
        </Link>
        <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
          Para <b>renovar tu mensualidad</b>, envía tu comprobante a la academia por WhatsApp al{' '}
          {EMPRESA.contactoWhatsApp} y lo registraremos por ti.
        </p>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <Wallet className="h-5 w-5 text-brand-600" /> Mis pagos
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : pagos && pagos.length > 0 ? (
          <ul className="lista-tarjetas">
            {pagos.map((p) => (
              <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{p.concepto}</p>
                    <p className="text-xs text-slate-400">{p.metodo_pago}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">S/ {Number(p.monto).toFixed(2)}</p>
                    <Badge variante={p.estado === 'aprobado' ? 'verde' : 'ambar'}>{p.estado}</Badge>
                  </div>
                </div>
                {p.comprobante_url && (
                  <button
                    onClick={() => ver(p.comprobante_url!)}
                    className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2 text-xs font-medium text-brand-600"
                  >
                    <FileText className="h-3.5 w-3.5" /> Ver comprobante
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Aún no tienes pagos.</p>
        )}
        {pagos && (
          <CargarMas
            hayMas={hayMas}
            cargando={cargandoMas}
            onClick={cargarMas}
            mostrados={pagos.length}
            total={total}
          />
        )}
      </section>
    </div>
  );
}
