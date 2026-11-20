// Repositorios de Inventario: memoria y PostgreSQL.
import { ConflictoConcurrenciaError, DomainError } from '../../../shared/domain/errors.js';
import { enTransaccion } from '../../../shared/db/transaccion.js';

const skuDuplicado = (sku) => new DomainError(`Ya existe un material con el SKU ${sku}`, { codigo: 'CODIGO_DUPLICADO' });

function filtrarMateriales(lista, { categoria, q }) {
  const t = q?.toLowerCase();
  return lista
    .filter((m) => !categoria || m.categoria === categoria)
    .filter((m) => !t || m.nombre.toLowerCase().includes(t) || m.sku.toLowerCase().includes(t))
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

export class MaterialRepositoryMemoria {
  #materiales = new Map();
  #movimientos = [];

  async listar(filtro = {}) {
    return filtrarMateriales([...this.#materiales.values()], filtro);
  }
  async obtenerPorId(id) {
    return this.#materiales.get(id) ?? null;
  }
  async obtenerVarios(ids) {
    return ids.map((id) => this.#materiales.get(id)).filter(Boolean);
  }
  async crear(material) {
    if ([...this.#materiales.values()].some((m) => m.sku === material.sku)) throw skuDuplicado(material.sku);
    this.#materiales.set(material.id, material);
  }
  async aplicarMovimientos({ cambios, movimientos }) {
    for (const { material, versionEsperada } of cambios) {
      if (this.#materiales.get(material.id)?.version !== versionEsperada) throw new ConflictoConcurrenciaError('El material', material.id);
    }
    for (const { material } of cambios) this.#materiales.set(material.id, material);
    this.#movimientos.push(...movimientos);
  }
  async existenSalidasDeOrden(ordenId) {
    return this.#movimientos.some((m) => m.tipo === 'SALIDA' && m.ordenId === ordenId);
  }
  async listarMovimientos({ materialId, limite = 50 } = {}) {
    return this.#movimientos
      .filter((m) => !materialId || m.materialId === materialId)
      .slice()
      .reverse()
      .slice(0, limite);
  }
}

export class ProductoTerminadoRepositoryMemoria {
  #productos = new Map();

  async obtenerPorId(id) {
    return this.#productos.get(id) ?? null;
  }
  async obtenerPorOrden(ordenId) {
    return [...this.#productos.values()].find((p) => p.ordenId === ordenId) ?? null;
  }
  async crear(producto) {
    if (producto.ordenId && (await this.obtenerPorOrden(producto.ordenId))) {
      throw new ConflictoConcurrenciaError('El producto', producto.ordenId);
    }
    this.#productos.set(producto.id, producto);
  }
  async registrarEntrega(producto, versionEsperada) {
    if (this.#productos.get(producto.id)?.version !== versionEsperada) throw new ConflictoConcurrenciaError('El producto', producto.id);
    this.#productos.set(producto.id, producto);
  }
  async listar({ tipo, soloPendientes = true } = {}) {
    return [...this.#productos.values()]
      .filter((p) => !tipo || p.tipo === tipo)
      .filter((p) => !soloPendientes || p.estadoEntrega !== 'ENTREGADO')
      .sort((a, b) => (a.ingresadoEn < b.ingresadoEn ? -1 : 1));
  }
}

/* --------------------------------------------------------------------- */

const aMaterial = (f) =>
  Object.freeze({
    id: f.id,
    sku: f.codigo_sku,
    nombre: f.nombre,
    categoria: f.tipo,
    unidad: f.unidad_medida,
    stock: f.stock_actual,
    stockMinimo: f.stock_minimo,
    costoUnitario: f.costo_unitario,
    ubicacion: f.ubicacion,
    proveedor: f.proveedor,
    lote: f.lote,
    version: f.version,
    actualizadoEn: f.actualizado_en.toISOString(),
  });

const aMovimiento = (f) =>
  Object.freeze({
    id: f.id,
    materialId: f.material_id,
    materialNombre: f.material_nombre,
    tipo: f.tipo,
    cantidad: f.cantidad,
    stockResultante: f.stock_resultante,
    motivo: f.motivo,
    ordenId: f.orden_id,
    usuarioId: f.usuario_id,
    usuario: f.usuario_nombre,
    fecha: f.registrado_en.toISOString(),
  });

export class MaterialRepositoryPostgres {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }
  async listar({ categoria, q } = {}) {
    const { rows } = await this.pool.query(
      `SELECT * FROM materiales
        WHERE ($1::text IS NULL OR tipo = $1)
          AND ($2::text IS NULL OR nombre ILIKE '%' || $2 || '%' OR codigo_sku ILIKE '%' || $2 || '%')
        ORDER BY codigo_sku`,
      [categoria ?? null, q || null],
    );
    return rows.map(aMaterial);
  }
  async obtenerPorId(id) {
    const { rows } = await this.pool.query('SELECT * FROM materiales WHERE id = $1', [id]);
    return rows[0] ? aMaterial(rows[0]) : null;
  }
  async obtenerVarios(ids) {
    const { rows } = await this.pool.query('SELECT * FROM materiales WHERE id = ANY($1::uuid[])', [ids]);
    return rows.map(aMaterial);
  }
  async crear(m) {
    try {
      await this.pool.query(
        `INSERT INTO materiales (id, codigo_sku, nombre, tipo, stock_actual, unidad_medida, stock_minimo,
                                 costo_unitario, ubicacion, proveedor, lote, version, actualizado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [m.id, m.sku, m.nombre, m.categoria, m.stock, m.unidad, m.stockMinimo, m.costoUnitario, m.ubicacion, m.proveedor, m.lote, m.version, m.actualizadoEn],
      );
    } catch (err) {
      if (err.code === '23505') throw skuDuplicado(m.sku);
      throw err;
    }
  }
  async aplicarMovimientos({ cambios, movimientos }) {
    try {
      await enTransaccion(this.pool, async (c) => {
        for (const { material, versionEsperada } of cambios) {
          const { rowCount } = await c.query(
            `UPDATE materiales SET stock_actual = $2, version = $3, actualizado_en = $4 WHERE id = $1 AND version = $5`,
            [material.id, material.stock, material.version, material.actualizadoEn, versionEsperada],
          );
          if (rowCount !== 1) throw new ConflictoConcurrenciaError('El material', material.id);
        }
        for (const mv of movimientos) {
          await c.query(
            `INSERT INTO movimientos_inventario
               (id, material_id, tipo, cantidad, stock_resultante, motivo, orden_id, usuario_id, usuario_nombre, registrado_en)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [mv.id, mv.materialId, mv.tipo, mv.cantidad, mv.stockResultante, mv.motivo, mv.ordenId, mv.usuarioId, mv.usuario, mv.fecha],
          );
        }
      });
    } catch (err) {
      // Índice de idempotencia: otra ejecución ya descontó esta orden.
      if (err.code === '23505') throw new ConflictoConcurrenciaError('El descuento de la orden', movimientos[0]?.ordenId);
      throw err;
    }
  }
  async existenSalidasDeOrden(ordenId) {
    const { rows } = await this.pool.query(
      `SELECT EXISTS (SELECT 1 FROM movimientos_inventario WHERE tipo = 'SALIDA' AND orden_id = $1) AS hay`,
      [ordenId],
    );
    return rows[0].hay;
  }
  async listarMovimientos({ materialId, limite = 50 } = {}) {
    const { rows } = await this.pool.query(
      `SELECT mv.*, m.nombre AS material_nombre
         FROM movimientos_inventario mv JOIN materiales m ON m.id = mv.material_id
        WHERE ($1::uuid IS NULL OR mv.material_id = $1)
        ORDER BY mv.registrado_en DESC, mv.id DESC
        LIMIT $2`,
      [materialId ?? null, limite],
    );
    return rows.map(aMovimiento);
  }
}

const aEntrega = (f) => ({
  id: f.id,
  cantidad: f.cantidad,
  recibidoPor: f.recibido_por,
  usuarioId: f.usuario_id,
  usuario: f.usuario_nombre,
  fecha: f.registrado_en.toISOString(),
});

const aProducto = (f, entregas) =>
  Object.freeze({
    id: f.id,
    tipo: f.tipo_producto,
    ordenId: f.referencia_id,
    codigoOrden: f.codigo_orden,
    clienteId: f.cliente_id,
    clienteNombre: f.cliente_nombre,
    descripcion: f.descripcion,
    cantidad: f.cantidad_inicial,
    cantidadEntregada: f.cantidad_inicial - f.cantidad_en_stock,
    ubicacion: f.ubicacion_almacen,
    estadoEntrega: f.estado_entrega,
    ingresadoEn: f.ingresado_en.toISOString(),
    version: f.version,
    entregas,
  });

export class ProductoTerminadoRepositoryPostgres {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }
  async #conEntregas(filas) {
    if (filas.length === 0) return [];
    const { rows } = await this.pool.query(
      'SELECT * FROM entregas_productos WHERE producto_id = ANY($1::uuid[]) ORDER BY registrado_en, id',
      [filas.map((f) => f.id)],
    );
    return filas.map((f) => aProducto(f, rows.filter((e) => e.producto_id === f.id).map(aEntrega)));
  }
  async obtenerPorId(id) {
    const { rows } = await this.pool.query('SELECT * FROM stock_productos_pendientes WHERE id = $1', [id]);
    return (await this.#conEntregas(rows))[0] ?? null;
  }
  async obtenerPorOrden(ordenId) {
    const { rows } = await this.pool.query('SELECT * FROM stock_productos_pendientes WHERE referencia_id = $1', [ordenId]);
    return (await this.#conEntregas(rows))[0] ?? null;
  }
  async crear(p) {
    try {
      await this.pool.query(
        `INSERT INTO stock_productos_pendientes
           (id, tipo_producto, referencia_id, codigo_orden, cliente_id, cliente_nombre, descripcion,
            cantidad_inicial, cantidad_en_stock, ubicacion_almacen, estado_entrega, version, ingresado_en, actualizado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
        [p.id, p.tipo, p.ordenId, p.codigoOrden, p.clienteId, p.clienteNombre, p.descripcion,
          p.cantidad, p.cantidad - p.cantidadEntregada, p.ubicacion, p.estadoEntrega, p.version, p.ingresadoEn],
      );
    } catch (err) {
      // La orden ya ingresó al almacén (evento repetido).
      if (err.code === '23505') throw new ConflictoConcurrenciaError('El producto', p.ordenId);
      throw err;
    }
  }
  async registrarEntrega(p, versionEsperada) {
    const e = p.entregas.at(-1);
    await enTransaccion(this.pool, async (c) => {
      const { rowCount } = await c.query(
        `UPDATE stock_productos_pendientes
            SET cantidad_en_stock = $2, estado_entrega = $3, version = $4, actualizado_en = $5
          WHERE id = $1 AND version = $6`,
        [p.id, p.cantidad - p.cantidadEntregada, p.estadoEntrega, p.version, e.fecha, versionEsperada],
      );
      if (rowCount !== 1) throw new ConflictoConcurrenciaError('El producto', p.id);
      await c.query(
        `INSERT INTO entregas_productos (id, producto_id, cantidad, recibido_por, usuario_id, usuario_nombre, registrado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [e.id, p.id, e.cantidad, e.recibidoPor, e.usuarioId, e.usuario, e.fecha],
      );
    });
  }
  async listar({ tipo, soloPendientes = true } = {}) {
    const { rows } = await this.pool.query(
      `SELECT * FROM stock_productos_pendientes
        WHERE ($1::text IS NULL OR tipo_producto = $1)
          AND (NOT $2 OR estado_entrega <> 'ENTREGADO')
        ORDER BY ingresado_en`,
      [tipo ?? null, soloPendientes],
    );
    return this.#conEntregas(rows);
  }
}
