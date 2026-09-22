import { describe, expect, it } from 'vitest';
import { isoLocal, isoLocalMas } from './fechas';

describe('entorno de tests', () => {
  it('corre en hora de Perú (UTC-5), sin horario de verano', () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(300);
    expect(new Date(2026, 6, 15).getTimezoneOffset()).toBe(300);
  });
});

describe('isoLocal', () => {
  it('formatea como YYYY-MM-DD con mes y día de dos dígitos', () => {
    expect(isoLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('devuelve el día local aunque en UTC ya sea el día siguiente (23:30 en Lima)', () => {
    const nocheEnLima = new Date(2026, 8, 22, 23, 30);
    expect(isoLocal(nocheEnLima)).toBe('2026-09-22');
  });

  it('coincide con getDay() local a medianoche menos un minuto', () => {
    const domingoNoche = new Date(2026, 8, 20, 23, 59); // domingo
    expect(domingoNoche.getDay()).toBe(0);
    expect(isoLocal(domingoNoche)).toBe('2026-09-20');
  });
});

describe('isoLocalMas', () => {
  it('suma días cruzando el fin de mes', () => {
    expect(isoLocalMas(3, new Date(2026, 0, 30))).toBe('2026-02-02');
  });

  it('resta días con un número negativo', () => {
    expect(isoLocalMas(-1, new Date(2026, 2, 1))).toBe('2026-02-28');
  });

  it('cruza el cambio de año', () => {
    expect(isoLocalMas(1, new Date(2026, 11, 31))).toBe('2027-01-01');
  });

  it('respeta el 29 de febrero en año bisiesto', () => {
    expect(isoLocalMas(1, new Date(2028, 1, 28))).toBe('2028-02-29');
  });

  it('con 0 días devuelve la misma fecha local, también de noche', () => {
    expect(isoLocalMas(0, new Date(2026, 8, 22, 23, 30))).toBe('2026-09-22');
  });

  it('no modifica la fecha base', () => {
    const base = new Date(2026, 0, 30);
    isoLocalMas(10, base);
    expect(base.getDate()).toBe(30);
  });
});
