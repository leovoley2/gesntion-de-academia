import { describe, expect, it } from 'vitest';
import { rango, TAM_PAGINA } from './paginacion';

describe('rango', () => {
  it('la primera página va de 0 a TAM_PAGINA - 1', () => {
    expect(rango(0)).toEqual([0, TAM_PAGINA - 1]);
  });

  it('las páginas siguientes son contiguas y sin solaparse', () => {
    const [, finPrimera] = rango(0);
    const [inicioSegunda, finSegunda] = rango(1);
    expect(inicioSegunda).toBe(finPrimera + 1);
    expect(finSegunda - inicioSegunda + 1).toBe(TAM_PAGINA);
  });
});
