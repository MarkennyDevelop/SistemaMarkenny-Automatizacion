// Adaptadores en memoria de los puertos de Inventario (pruebas / desarrollo).
import { ConflictoConcurrenciaError, DomainError } from '../../../shared/domain/errors.js';
import { ESTADOS_EXISTENCIA } from '../domain/productoTerminado.js';

export class InMemoryMaterialRepository {
  #materiales = new Map();
  #movimientos = [];

  async obtenerPorId(id) {
    return this.#materiales.get(id) ?? null;
  }

  async obtenerVarios(ids) {
    return ids.map((id) => this.#materiales.get(id)).filter(Boolean);
  }

  async listar({ categoria } = {}) {
    return [...this.#materiales.values()]
      .filter((m) => !categoria || m.categoria === categoria)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  async crear(material) {
    if ([...this.#materiales.values()].some((m) => m.codigo === material.codigo)) {
      throw new DomainError(`Ya existe un material con código "${material.codigo}"`, { codigo: 'CODIGO_DUPLICADO' });
    }
    this.#materiales.set(material.id, material);
  }

  async aplicarMovimientos({ cambios, movimientos }) {
    // Verificar TODO antes de aplicar nada (atomicidad).
    for (const { material, versionEsperada } of cambios) {
      if (this.#materiales.get(material.id)?.version !== versionEsperada) {
        throw new ConflictoConcurrenciaError('Material', material.id);
      }
    }
    for (const { material } of cambios) this.#materiales.set(material.id, material);
    this.#movimientos.push(...movimientos);
  }

  async existenMovimientosDeReferencia(tipo, id) {
    return this.#movimientos.some((m) => m.referencia?.tipo === tipo && m.referencia?.id === id);
  }

  async listarMovimientos(materialId, limite = 100) {
    return this.#movimientos
      .filter((m) => m.materialId === materialId)
      .slice(-limite)
      .reverse();
  }
}

export class InMemoryProductoTerminadoRepository {
  #existencias = new Map();

  async obtenerPorId(id) {
    return this.#existencias.get(id) ?? null;
  }

  async obtenerPorOrdenId(ordenId) {
    return [...this.#existencias.values()].find((e) => e.ordenId === ordenId) ?? null;
  }

  async crear(existencia) {
    if (await this.obtenerPorOrdenId(existencia.ordenId)) {
      throw new ConflictoConcurrenciaError('ExistenciaProductoTerminado', existencia.ordenId);
    }
    this.#existencias.set(existencia.id, existencia);
  }

  async actualizar(existencia, versionEsperada) {
    if (this.#existencias.get(existencia.id)?.version !== versionEsperada) {
      throw new ConflictoConcurrenciaError('ExistenciaProductoTerminado', existencia.id);
    }
    this.#existencias.set(existencia.id, existencia);
  }

  async listarPendientes({ tipoProducto, clienteId } = {}) {
    return [...this.#existencias.values()]
      .filter((e) => e.estado !== ESTADOS_EXISTENCIA.ENTREGADO)
      .filter((e) => !tipoProducto || e.tipoProducto === tipoProducto)
      .filter((e) => !clienteId || e.clienteId === clienteId)
      .sort((a, b) => (a.ingresadoEn < b.ingresadoEn ? -1 : 1));
  }
}
