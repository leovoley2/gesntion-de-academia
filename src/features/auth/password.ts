/** Longitud mínima de contraseña (la misma que exige la Edge Function `crear-usuario`). */
export const MIN_PASSWORD = 8;

/**
 * Valida una contraseña nueva y, si se pasa, su repetición.
 * Devuelve el mensaje de error para mostrar, o null si es válida.
 */
export function validarPassword(nueva: string, repetida?: string): string | null {
  if (nueva.length < MIN_PASSWORD) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }
  if (repetida !== undefined && nueva !== repetida) {
    return 'Las contraseñas no coinciden.';
  }
  return null;
}

/** URL a la que lleva el enlace del correo de recuperación. */
export function urlRestablecer(origen = window.location.origin): string {
  return `${origen}/restablecer`;
}

/** Traduce los errores de Supabase Auth relacionados con contraseñas y correos. */
export function mensajeErrorAuth(error: { code?: string; message: string }): string {
  const m = error.message.toLowerCase();
  if (error.code === 'same_password' || m.includes('different from the old')) {
    return 'La nueva contraseña debe ser distinta de la actual.';
  }
  if (error.code === 'weak_password' || m.includes('weak') || m.includes('pwned')) {
    return 'Esa contraseña es demasiado débil o apareció en filtraciones públicas. Elige otra.';
  }
  if (
    error.code === 'over_email_send_rate_limit' ||
    error.code === 'over_request_rate_limit' ||
    m.includes('rate limit') ||
    m.includes('security purposes')
  ) {
    return 'Hiciste demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'No pudimos conectar. Revisa tu conexión a internet e inténtalo de nuevo.';
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo en un momento.';
}
