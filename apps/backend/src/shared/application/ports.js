// Puertos transversales (kernel compartido) y utilidad para verificar adaptadores.
//
// JavaScript no tiene interfaces: cada puerto se declara como una lista de
// métodos obligatorios + un typedef JSDoc. `implementaPuerto` valida en el
// momento del cableado (composition root) que un adaptador cumple el contrato,
// fallando rápido en el arranque en lugar de en producción.

/**
 * @typedef {Object} ClockPort
 * @property {() => Date} ahora
 *
 * @typedef {Object} IdGeneratorPort
 * @property {() => string} generar
 *
 * @typedef {{ tipo: string, payload: object, ocurridoEn: string, id: string }} EventoIntegracion
 *
 * @typedef {Object} EventBusPort
 * @property {(tipo: string, payload: object) => void} publicar  Publica de forma asíncrona (no bloquea al emisor).
 * @property {(tipo: string, manejador: (evento: EventoIntegracion) => Promise<void>|void) => () => void} suscribir  Devuelve función para desuscribir.
 *
 * @typedef {Object} LoggerPort
 * @property {(obj: object|string, msg?: string) => void} info
 * @property {(obj: object|string, msg?: string) => void} warn
 * @property {(obj: object|string, msg?: string) => void} error
 */

export const PUERTOS = Object.freeze({
  Clock: ['ahora'],
  IdGenerator: ['generar'],
  EventBus: ['publicar', 'suscribir'],
  Logger: ['info', 'warn', 'error'],
});

/**
 * Verifica que `adaptador` implemente todos los `metodos` del puerto `nombre`.
 * @template T
 * @param {string} nombre
 * @param {readonly string[]} metodos
 * @param {T} adaptador
 * @returns {T}
 */
export function implementaPuerto(nombre, metodos, adaptador) {
  if (!adaptador || typeof adaptador !== 'object') {
    throw new TypeError(`Adaptador inválido para el puerto ${nombre}`);
  }
  const faltantes = metodos.filter((m) => typeof adaptador[m] !== 'function');
  if (faltantes.length > 0) {
    throw new TypeError(`El adaptador no implementa el puerto ${nombre}; faltan: ${faltantes.join(', ')}`);
  }
  return adaptador;
}
