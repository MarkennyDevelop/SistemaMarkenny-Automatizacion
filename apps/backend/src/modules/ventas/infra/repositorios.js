// Repositorios de clientes: memoria y PostgreSQL.
import { DomainError } from '../../../shared/domain/errors.js';

const rifDuplicado = (rif) => new DomainError(`Ya existe un cliente con el RIF ${rif}`, { codigo: 'CODIGO_DUPLICADO' });

export class ClienteRepositoryMemoria {
  #clientes = new Map();
  async listar() {
    return [...this.#clientes.values()];
  }
  async obtenerPorId(id) {
    return this.#clientes.get(id) ?? null;
  }
  async crear(cliente) {
    if ([...this.#clientes.values()].some((c) => c.rif === cliente.rif)) throw rifDuplicado(cliente.rif);
    this.#clientes.set(cliente.id, cliente);
  }
}

const aCliente = (f) =>
  Object.freeze({
    id: f.id,
    nombre: f.nombre,
    rif: f.rif,
    contacto: f.contacto,
    telefono: f.telefono,
    email: f.email,
    ciudad: f.ciudad,
    creadoPor: f.creado_por,
    creadoEn: f.creado_en.toISOString(),
  });

export class ClienteRepositoryPostgres {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }
  async listar() {
    const { rows } = await this.pool.query('SELECT * FROM clientes');
    return rows.map(aCliente);
  }
  async obtenerPorId(id) {
    const { rows } = await this.pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
    return rows[0] ? aCliente(rows[0]) : null;
  }
  async crear(c) {
    try {
      await this.pool.query(
        `INSERT INTO clientes (id, nombre, rif, contacto, telefono, email, ciudad, creado_por, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [c.id, c.nombre, c.rif, c.contacto, c.telefono, c.email, c.ciudad, c.creadoPor, c.creadoEn],
      );
    } catch (err) {
      if (err.code === '23505') throw rifDuplicado(c.rif);
      throw err;
    }
  }
}
