// Máquina de estados determinista e inmutable para órdenes de producción.
//
// `transicionar` es una función pura: no muta la orden recibida, no lee el
// reloj ni genera IDs; todo lo no determinista (fecha, usuario) entra como
// argumento. Cada transición válida añade un registro inmutable de auditoría.
import { congelarProfundo, aIso } from '../../../shared/domain/inmutable.js';
import { crearUsuarioRef } from '../../../shared/domain/usuario.js';
import { TRANSICIONES_PERMITIDAS, TRANSICIONES_CON_MOTIVO, esEstadoValido } from './estados.js';
import {
  EstadoDesconocidoError,
  TransicionNoPermitidaError,
  MotivoRequeridoError,
  FechaAuditoriaInvalidaError,
} from './errores.js';

export function transicionesDesde(estado) {
  if (!esEstadoValido(estado)) throw new EstadoDesconocidoError(estado);
  return TRANSICIONES_PERMITIDAS[estado];
}

export function puedeTransicionar(desde, hacia) {
  return esEstadoValido(desde) && esEstadoValido(hacia) && TRANSICIONES_PERMITIDAS[desde].includes(hacia);
}

export function requiereMotivo(desde, hacia) {
  return TRANSICIONES_CON_MOTIVO.includes(`${desde}->${hacia}`);
}

/**
 * Crea un registro de auditoría de transición.
 * @returns {{ secuencia: number, desde: string|null, hacia: string, usuario: object, fecha: string, motivo: string|null }}
 */
export function crearRegistroAuditoria({ secuencia, desde, hacia, usuario, fecha, motivo }) {
  return congelarProfundo({
    secuencia,
    desde,
    hacia,
    usuario: crearUsuarioRef(usuario),
    fecha: aIso(fecha),
    motivo: motivo?.trim() ? motivo.trim() : null,
  });
}

/**
 * Aplica una transición de estado a la orden.
 * @param {object} orden  Orden de producción (inmutable).
 * @param {{ hacia: string, usuario: {id: string}, fecha: Date, motivo?: string }} cambio
 * @returns {object} Nueva orden con estado, versión e historial actualizados.
 */
export function transicionar(orden, { hacia, usuario, fecha, motivo }) {
  const desde = orden.estado;
  const permitidas = transicionesDesde(desde);
  if (!esEstadoValido(hacia)) throw new EstadoDesconocidoError(hacia);
  if (!permitidas.includes(hacia)) throw new TransicionNoPermitidaError(desde, hacia, permitidas);
  if (requiereMotivo(desde, hacia) && !motivo?.trim()) throw new MotivoRequeridoError(desde, hacia);

  const ultimo = orden.historial.at(-1);
  const fechaIso = aIso(fecha);
  if (ultimo && fechaIso < ultimo.fecha) throw new FechaAuditoriaInvalidaError(fechaIso, ultimo.fecha);

  const registro = crearRegistroAuditoria({
    secuencia: orden.historial.length + 1,
    desde,
    hacia,
    usuario,
    fecha,
    motivo,
  });

  return congelarProfundo({
    ...orden,
    estado: hacia,
    version: orden.version + 1,
    actualizadaEn: registro.fecha,
    historial: [...orden.historial, registro],
  });
}
