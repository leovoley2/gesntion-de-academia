import { describe, expect, it } from 'vitest';
import { puedeCambiarModo, rolDeVista } from './rolVista';

const admin = { rol: 'administrador' as const, es_entrenador: false };
const adminEntrenador = { rol: 'administrador' as const, es_entrenador: true };

describe('rolDeVista', () => {
  it('un alumno siempre ve la app de alumno', () => {
    expect(rolDeVista({ rol: 'alumno', es_entrenador: false }, 'entrenador')).toBe('alumno');
  });

  it('un entrenador siempre ve la app de entrenador', () => {
    expect(rolDeVista({ rol: 'entrenador', es_entrenador: false }, 'administrador')).toBe('entrenador');
  });

  it('un admin que no es entrenador no puede pasar a modo entrenador', () => {
    expect(rolDeVista(admin, 'entrenador')).toBe('administrador');
  });

  it('un admin-entrenador ve la app de entrenador en modo entrenador', () => {
    expect(rolDeVista(adminEntrenador, 'entrenador')).toBe('entrenador');
  });

  it('un admin-entrenador entra por defecto en modo administrador', () => {
    expect(rolDeVista(adminEntrenador, null)).toBe('administrador');
  });

  it('sin perfil cargado no hay rol', () => {
    expect(rolDeVista(null, 'entrenador')).toBeUndefined();
  });
});

describe('puedeCambiarModo', () => {
  it('solo el admin que también es entrenador puede cambiar de modo', () => {
    expect(puedeCambiarModo(adminEntrenador)).toBe(true);
    expect(puedeCambiarModo(admin)).toBe(false);
    expect(puedeCambiarModo({ rol: 'entrenador', es_entrenador: true })).toBe(false);
    expect(puedeCambiarModo(null)).toBe(false);
  });
});
