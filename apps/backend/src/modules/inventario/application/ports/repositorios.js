// Puertos de persistencia del módulo de Inventario.

/**
 * @typedef {Object} MaterialRepositoryPort
 * @property {(id: string) => Promise<object|null>} obtenerPorId
 * @property {(ids: string[]) => Promise<object[]>} obtenerVarios
 * @property {(filtro?: { categoria?: string }) => Promise<object[]>} listar
 * @property {(material: object) => Promise<void>} crear  Lanza CodigoDuplicado si el código existe.
 * @property {(op: { cambios: {material: object, versionEsperada: number}[], movimientos: object[] }) => Promise<void>} aplicarMovimientos
 *   Persiste ATÓMICAMENTE los nuevos stocks y sus movimientos. Si alguna
 *   versión no coincide, no aplica nada y lanza ConflictoConcurrenciaError.
 * @property {(tipo: string, id: string) => Promise<boolean>} existenMovimientosDeReferencia
 * @property {(materialId: string, limite?: number) => Promise<object[]>} listarMovimientos
 *
 * @typedef {Object} ProductoTerminadoRepositoryPort
 * @property {(id: string) => Promise<object|null>} obtenerPorId
 * @property {(ordenId: string) => Promise<object|null>} obtenerPorOrdenId
 * @property {(existencia: object) => Promise<void>} crear
 * @property {(existencia: object, versionEsperada: number) => Promise<void>} actualizar
 * @property {(filtro?: { tipoProducto?: string, clienteId?: string }) => Promise<object[]>} listarPendientes
 */

export const MATERIAL_REPOSITORY_PORT = Object.freeze([
  'obtenerPorId',
  'obtenerVarios',
  'listar',
  'crear',
  'aplicarMovimientos',
  'existenMovimientosDeReferencia',
  'listarMovimientos',
]);

export const PRODUCTO_TERMINADO_REPOSITORY_PORT = Object.freeze([
  'obtenerPorId',
  'obtenerPorOrdenId',
  'crear',
  'actualizar',
  'listarPendientes',
]);
