// Referencia al usuario que ejecuta una acción (actor de auditoría). Código puro.
import { DomainError } from './errors.js';

/**
 * @typedef {{ id: string, nombre?: string, rol?: string }} UsuarioRef
 */

/** Normaliza y congela la referencia del usuario actor. */
export function crearUsuarioRef(usuario) {
  if (!usuario || typeof usuario.id !== 'string' || usuario.id.trim() === '') {
    throw new DomainError('Toda acción auditada requiere un usuario identificado', { codigo: 'USUARIO_REQUERIDO' });
  }
  const ref = { id: usuario.id.trim() };
  if (usuario.nombre) ref.nombre = usuario.nombre;
  if (usuario.rol) ref.rol = usuario.rol;
  return Object.freeze(ref);
}
