import { describe, expect, it } from 'vitest';
import { etiquetaPlan } from './asistencia.api';

describe('etiquetaPlan (lista de asistencia del entrenador)', () => {
  it('avisa cuando el alumno no tiene ningún plan activo', () => {
    expect(etiquetaPlan(null)).toBe('sin plan activo');
  });

  it('muestra el tipo de plan legible', () => {
    expect(etiquetaPlan('mensual')).toBe('mensual');
    expect(etiquetaPlan('paquete_clases')).toBe('paquete de clases');
    expect(etiquetaPlan('personalizado')).toBe('personalizado');
  });
});
