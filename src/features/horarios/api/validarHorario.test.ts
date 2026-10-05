import { describe, expect, it } from 'vitest';
import { validarHorario, type DatosHorario } from './horarios.api';

const VALIDO: DatosHorario = {
  sede_id: 's1',
  entrenador_id: 'e1',
  dia_semana: 3,
  hora_inicio: '06:30',
  hora_fin: '08:30',
  nivel: 'intermedio',
};

describe('validarHorario', () => {
  it('acepta una clase normal de 2 horas', () => {
    expect(validarHorario(VALIDO)).toBeNull();
  });

  it('exige sede y entrenador', () => {
    expect(validarHorario({ ...VALIDO, sede_id: '' })).toMatch(/sede/);
    expect(validarHorario({ ...VALIDO, entrenador_id: '' })).toMatch(/entrenador/);
  });

  it('rechaza que la clase termine antes de empezar o a la misma hora', () => {
    expect(validarHorario({ ...VALIDO, hora_fin: '06:30' })).toMatch(/después/);
    expect(validarHorario({ ...VALIDO, hora_fin: '05:00' })).toMatch(/después/);
  });

  it('avisa de una duración sospechosa (el caso real 06:30–20:30)', () => {
    expect(validarHorario({ ...VALIDO, hora_fin: '20:30' })).toMatch(/4 horas/);
  });

  it('acepta justo 4 horas', () => {
    expect(validarHorario({ ...VALIDO, hora_inicio: '08:00', hora_fin: '12:00' })).toBeNull();
  });

  it('acepta la hora con segundos tal como la devuelve la base (HH:MM:SS)', () => {
    expect(validarHorario({ ...VALIDO, hora_inicio: '06:30:00', hora_fin: '08:30:00' })).toBeNull();
  });
});
