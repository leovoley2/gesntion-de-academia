import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD, mensajeErrorAuth, urlRestablecer, validarPassword } from './password';

describe('validarPassword', () => {
  it('rechaza contraseñas más cortas que el mínimo', () => {
    expect(validarPassword('a'.repeat(MIN_PASSWORD - 1))).toMatch(/al menos/);
  });

  it('acepta una contraseña con la longitud mínima', () => {
    expect(validarPassword('a'.repeat(MIN_PASSWORD))).toBeNull();
  });

  it('exige que la repetición coincida cuando se pasa', () => {
    expect(validarPassword('secreto123', 'secreto124')).toBe('Las contraseñas no coinciden.');
    expect(validarPassword('secreto123', 'secreto123')).toBeNull();
  });

  it('comprueba la longitud antes que la coincidencia', () => {
    expect(validarPassword('corta', 'corta')).toMatch(/al menos/);
  });
});

describe('urlRestablecer', () => {
  it('apunta a /restablecer del dominio actual', () => {
    expect(urlRestablecer('https://gesntion-de-academia.vercel.app')).toBe(
      'https://gesntion-de-academia.vercel.app/restablecer'
    );
  });
});

describe('mensajeErrorAuth', () => {
  it('traduce los códigos de Supabase Auth', () => {
    expect(mensajeErrorAuth({ code: 'same_password', message: '' })).toMatch(/distinta/);
    expect(mensajeErrorAuth({ code: 'weak_password', message: '' })).toMatch(/débil/);
    expect(mensajeErrorAuth({ code: 'over_email_send_rate_limit', message: '' })).toMatch(/minutos/);
  });

  it('reconoce el límite por mensaje aunque no venga el código', () => {
    expect(
      mensajeErrorAuth({ message: 'For security purposes, you can only request this after 30 seconds.' })
    ).toMatch(/minutos/);
  });

  it('da un mensaje genérico para errores desconocidos', () => {
    expect(mensajeErrorAuth({ message: 'boom' })).toMatch(/No se pudo/);
  });
});
