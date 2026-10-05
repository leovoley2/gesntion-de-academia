import { describe, expect, it } from 'vitest';
import { generarBloques, type ParamsLote } from './disponibilidad.api';

const BASE: ParamsLote = {
  entrenadorId: 'e1',
  tipo: 'personalizada',
  diasSemana: [1, 3], // lunes y miércoles
  desde: '2026-10-05', // lunes
  hasta: '2026-10-11', // domingo
  horaInicio: '07:00',
  horaFin: '09:00',
  duracionMin: 60,
};

describe('generarBloques', () => {
  it('crea un bloque por hora solo en los días de la semana elegidos', () => {
    const bloques = generarBloques(BASE);
    expect(bloques.map((b) => `${b.fecha} ${b.hora_inicio}-${b.hora_fin}`)).toEqual([
      '2026-10-05 07:00-08:00',
      '2026-10-05 08:00-09:00',
      '2026-10-07 07:00-08:00',
      '2026-10-07 08:00-09:00',
    ]);
  });

  it('descarta el tramo final que no completa la duración', () => {
    const bloques = generarBloques({ ...BASE, diasSemana: [1], horaFin: '08:30' });
    expect(bloques.map((b) => b.hora_inicio)).toEqual(['07:00']);
  });

  it('no genera nada si la hora de fin no es posterior a la de inicio', () => {
    expect(generarBloques({ ...BASE, horaFin: '07:00' })).toEqual([]);
  });

  it('usa la fecha local de Perú (no se corre un día por UTC)', () => {
    const [primero] = generarBloques({ ...BASE, diasSemana: [0], desde: '2026-10-11' });
    expect(primero.fecha).toBe('2026-10-11');
  });

  it('crea los bloques habilitados y del tipo pedido', () => {
    const bloques = generarBloques({ ...BASE, tipo: 'academia' });
    expect(bloques.every((b) => b.habilitado && b.tipo === 'academia')).toBe(true);
  });
});
