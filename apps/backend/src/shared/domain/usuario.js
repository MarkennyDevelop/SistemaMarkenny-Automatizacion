// Actor: usuario autenticado que ejecuta una acción auditada. Código puro.
import { ROLES } from '@markenny/contrato/dominio';
import { DomainError } from './errors.js';

/**
 * @typedef {{ id: string, nombre: string, rol: import('@markenny/contrato/dominio').Rol }} Actor
 */

/** Valida y congela al actor. Toda acción auditada exige id, nombre y rol. */
export function crearActor(actor) {
  if (
    !actor ||
    typeof actor.id !== 'string' ||
    !actor.id.trim() ||
    typeof actor.nombre !== 'string' ||
    !actor.nombre.trim() ||
    !ROLES.includes(actor.rol)
  ) {
    throw new DomainError('Toda acción auditada requiere un usuario identificado', { codigo: 'NO_AUTENTICADO' });
  }
  return Object.freeze({ id: actor.id, nombre: actor.nombre.trim(), rol: actor.rol });
}

/** Exige que el actor tenga uno de los roles indicados (regla de negocio, no solo HTTP). */
export function exigirRol(actor, roles, accion) {
  const valido = crearActor(actor);
  if (!roles.includes(valido.rol)) {
    throw new DomainError(`Tu rol no permite ${accion}`, { codigo: 'SIN_PERMISO' });
  }
  return valido;
}
