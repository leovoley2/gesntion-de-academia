import { describe, expect, it } from 'vitest';
import { precioPaquete, type EntrenadorConTarifas } from './planes.api';

// La app solo usa este precio para MOSTRARLO; el cobro real lo calcula la BD
// con `precio_paquete` (migración 0010). Estos casos son los mismos que se
// verificaron contra la BD, para que pantalla y cobro no se desalineen.
function entrenador(tarifas: Record<string, number>): EntrenadorConTarifas {
  return {
    id: 'e1',
    nombre_completo: 'Entrenador',
    tarifas: Object.entries(tarifas).map(([modalidad, precio], i) => ({
      id: `t${i}`,
      entrenador_id: 'e1',
      modalidad,
      precio_por_atleta: precio,
    })),
  } as unknown as EntrenadorConTarifas;
}

describe('precioPaquete', () => {
  it('aplica 5 % de descuento al paquete de 4 sesiones (100 × 4 → 380)', () => {
    expect(precioPaquete(entrenador({ individual: 100 }), 'individual', 4)).toBe(380);
  });

  it('aplica 15 % de descuento al paquete de 12 sesiones (50 × 12 → 510)', () => {
    expect(precioPaquete(entrenador({ grupo3: 50 }), 'grupo3', 12)).toBe(510);
  });

  it('aplica 10 % de descuento al paquete de 8 sesiones (85 × 8 → 612)', () => {
    expect(precioPaquete(entrenador({ duo: 85 }), 'duo', 8)).toBe(612);
  });

  it('redondea .5 hacia arriba igual que round() de Postgres (72.5 × 4 × 0.95 = 275.5 → 276)', () => {
    expect(precioPaquete(entrenador({ individual: 72.5 }), 'individual', 4)).toBe(276);
  });

  it('devuelve 0 si el entrenador no tiene tarifa para esa modalidad', () => {
    expect(precioPaquete(entrenador({ individual: 100 }), 'grupo4', 4)).toBe(0);
  });

  it('acepta el precio como texto, tal como llega el numeric de Supabase', () => {
    const e = entrenador({});
    e.tarifas = [{ modalidad: 'individual', precio_por_atleta: '100.00' }] as never;
    expect(precioPaquete(e, 'individual', 4)).toBe(380);
  });
});
