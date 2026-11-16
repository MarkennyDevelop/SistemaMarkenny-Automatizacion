// Adaptador en memoria del OrdenProduccionRepositoryPort (pruebas / desarrollo).
import { ConflictoConcurrenciaError } from '../../../shared/domain/errors.js';
import { formatearCodigoOrden } from '../application/ports/ordenProduccionRepositoryPort.js';

export class InMemoryOrdenRepository {
  #ordenes = new Map();
  #secuencia = 0;

  async obtenerPorId(id) {
    return this.#ordenes.get(id) ?? null;
  }

  async listar({ estado, limite = 50 } = {}) {
    return [...this.#ordenes.values()]
      .filter((o) => !estado || o.estado === estado)
      .sort((a, b) => (a.creadaEn < b.creadaEn ? 1 : -1))
      .slice(0, limite);
  }

  async crear(orden) {
    if (this.#ordenes.has(orden.id)) throw new ConflictoConcurrenciaError('OrdenProduccion', orden.id);
    this.#ordenes.set(orden.id, orden); // las órdenes son inmutables (congeladas)
  }

  async actualizar(orden, versionEsperada) {
    const actual = this.#ordenes.get(orden.id);
    if (!actual || actual.version !== versionEsperada) {
      throw new ConflictoConcurrenciaError('OrdenProduccion', orden.id);
    }
    this.#ordenes.set(orden.id, orden);
  }

  async siguienteCodigo(anio) {
    this.#secuencia += 1;
    return formatearCodigoOrden(anio, this.#secuencia);
  }
}
