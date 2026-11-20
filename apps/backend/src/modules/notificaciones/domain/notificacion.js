// Notificaciones de la campana. Código de dominio puro.
import { ROLES, TIPOS_NOTIFICACION } from '@markenny/contrato/dominio';
import { DomainError } from '../../../shared/domain/errors.js';
import { aIso, congelarProfundo } from '../../../shared/domain/inmutable.js';

export function crearNotificacion({ id, tipo, titulo, detalle, ordenId = null, codigo = null, roles, destinatarioId = null, fecha }) {
  if (!TIPOS_NOTIFICACION.includes(tipo)) throw new DomainError(`Tipo de notificación inválido: ${tipo}`);
  if (!roles?.length || !roles.every((r) => ROLES.includes(r))) throw new DomainError('Roles de notificación inválidos');
  return congelarProfundo({
    id,
    tipo,
    titulo: titulo.slice(0, 150),
    detalle: detalle.slice(0, 300),
    ordenId,
    codigo,
    roles: [...roles],
    destinatarioId,
    creadaEn: aIso(fecha),
  });
}

/**
 * Quién ve una notificación: alguien de uno de sus roles. Si tiene
 * destinatario (el vendedor de la orden), los demás vendedores no la ven; el
 * administrador ve todas.
 */
export function esVisiblePara(notificacion, usuario) {
  if (!notificacion.roles.includes(usuario.rol)) return false;
  return !notificacion.destinatarioId || usuario.rol === 'ADMIN' || notificacion.destinatarioId === usuario.id;
}
