// Puerto de persistencia del agregado OrdenProduccion (lado "driven").

/**
 * @typedef {Object} OrdenProduccionRepositoryPort
 * @property {(id: string) => Promise<object|null>} obtenerPorId
 * @property {(filtro?: { estado?: string, limite?: number }) => Promise<object[]>} listar
 * @property {(orden: object) => Promise<void>} crear
 *   Inserta una orden nueva (versión 1) con su historial inicial.
 * @property {(orden: object, versionEsperada: number) => Promise<void>} actualizar
 *   Persiste el nuevo estado y los registros de auditoría añadidos. Lanza
 *   ConflictoConcurrenciaError si la versión almacenada != versionEsperada.
 * @property {(anio: number) => Promise<string>} siguienteCodigo
 *   Genera el próximo código legible de orden, p. ej. "OP-2026-000123".
 */

export const ORDEN_PRODUCCION_REPOSITORY_PORT = Object.freeze([
  'obtenerPorId',
  'listar',
  'crear',
  'actualizar',
  'siguienteCodigo',
]);

/** Formato estándar de códigos de orden, compartido por los adaptadores. */
export function formatearCodigoOrden(anio, secuencia) {
  return `OP-${anio}-${String(secuencia).padStart(6, '0')}`;
}
