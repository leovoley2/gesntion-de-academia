import { describe, expect, it } from 'vitest';
import { ITEMS_NAV } from './navegacion';
import type { RolUsuario } from '../../types/database.types';

const ROLES: RolUsuario[] = ['administrador', 'entrenador', 'alumno'];

describe('ITEMS_NAV', () => {
  it.each(ROLES)('la barra inferior del móvil del rol %s cabe en pantalla (máx. 6)', (rol) => {
    const movil = ITEMS_NAV.filter((i) => i.movil && i.roles.includes(rol));
    expect(movil.length).toBeGreaterThan(0);
    expect(movil.length).toBeLessThanOrEqual(6);
  });

  it.each(ROLES)('Inicio es el primer destino del rol %s', (rol) => {
    expect(ITEMS_NAV.find((i) => i.roles.includes(rol))?.to).toBe('/');
  });

  it.each(ROLES)('el rol %s puede llegar a Mi cuenta para cambiar su contraseña', (rol) => {
    expect(ITEMS_NAV.some((i) => i.to === '/cuenta' && i.roles.includes(rol))).toBe(true);
  });

  it('no repite rutas', () => {
    const rutas = ITEMS_NAV.map((i) => i.to);
    expect(new Set(rutas).size).toBe(rutas.length);
  });
});
