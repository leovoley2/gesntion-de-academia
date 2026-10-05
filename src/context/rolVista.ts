import type { RolUsuario } from '../types/database.types';

/** Modo elegido por un administrador que también es entrenador. */
export type Modo = 'administrador' | 'entrenador';

type PerfilRol = { rol: RolUsuario; es_entrenador?: boolean | null } | null | undefined;

/** Solo un administrador marcado como entrenador puede alternar de modo. */
export function puedeCambiarModo(perfil: PerfilRol): boolean {
  return perfil?.rol === 'administrador' && !!perfil.es_entrenador;
}

/**
 * Rol con el que se pinta la app (menú, inicio, rutas). Es solo la vista:
 * los permisos reales los decide la base de datos con el rol verdadero.
 */
export function rolDeVista(perfil: PerfilRol, modo: Modo | null): RolUsuario | undefined {
  if (!perfil) return undefined;
  if (puedeCambiarModo(perfil) && modo === 'entrenador') return 'entrenador';
  return perfil.rol;
}
