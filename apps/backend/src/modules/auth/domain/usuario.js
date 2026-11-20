// Agregado Usuario y reglas de cuentas. Código de dominio puro.
import { ROLES, ROLES_EMPLEADO } from '@markenny/contrato/dominio';
import { DomainError } from '../../../shared/domain/errors.js';
import { aIso, congelarProfundo } from '../../../shared/domain/inmutable.js';

function invariante(condicion, mensaje) {
  if (!condicion) throw new DomainError(mensaje, { codigo: 'REGLA_NEGOCIO' });
}

/**
 * @param {{ id: string, nombre: string, email: string, passwordHash: string,
 *   rol: string, telefono?: string|null, cargo?: string|null,
 *   creadoPor?: { id: string, nombre: string } | null, fecha: Date }} datos
 */
export function crearUsuario({ id, nombre, email, passwordHash, rol, telefono = null, cargo = null, creadoPor = null, fecha }) {
  invariante(typeof id === 'string' && id.length > 0, 'El usuario requiere un id');
  invariante(typeof nombre === 'string' && nombre.trim().length >= 3, 'Nombre y apellido requeridos');
  invariante(typeof email === 'string' && email.includes('@'), 'Correo inválido');
  invariante(typeof passwordHash === 'string' && passwordHash.length > 0, 'Falta la contraseña');
  invariante(ROLES.includes(rol), `Rol inválido: ${rol}`);
  return congelarProfundo({
    id,
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    rol,
    telefono: telefono?.trim() || null,
    cargo: cargo?.trim() || null,
    activo: true,
    creadoEn: aIso(fecha),
    ultimoAcceso: null,
    creadoPor: creadoPor ? { id: creadoPor.id, nombre: creadoPor.nombre } : null,
  });
}

/** Un administrador solo puede crear cuentas de Vendedor o Producción. */
export function validarRolEmpleado(rol) {
  if (!ROLES_EMPLEADO.includes(rol)) {
    throw new DomainError('Solo se pueden crear cuentas de Vendedor o Producción', { codigo: 'REGLA_NEGOCIO' });
  }
}

/**
 * Activar/desactivar una cuenta.
 * - Nadie se desactiva a sí mismo.
 * - Siempre debe quedar al menos un administrador activo.
 */
export function cambiarEstado(objetivo, { activo, actorId, adminsActivos }) {
  if (objetivo.id === actorId && !activo) {
    throw new DomainError('No puedes desactivar tu propia cuenta', { codigo: 'REGLA_NEGOCIO' });
  }
  if (objetivo.rol === 'ADMIN' && objetivo.activo && !activo && adminsActivos <= 1) {
    throw new DomainError('Debe existir al menos un administrador activo', { codigo: 'REGLA_NEGOCIO' });
  }
  return congelarProfundo({ ...objetivo, activo });
}

/** Proyección sin secretos para la API. */
export function aUsuarioPublico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono,
    cargo: usuario.cargo,
    rol: usuario.rol,
    activo: usuario.activo,
    creadoEn: usuario.creadoEn,
    ultimoAcceso: usuario.ultimoAcceso,
    creadoPor: usuario.creadoPor?.nombre ?? null,
  };
}
