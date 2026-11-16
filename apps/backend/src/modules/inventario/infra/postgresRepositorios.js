// Adaptadores PostgreSQL de los puertos de Inventario.
import { ConflictoConcurrenciaError, DomainError } from '../../../shared/domain/errors.js';
import { congelarProfundo } from '../../../shared/domain/inmutable.js';
import { enTransaccion } from '../../../shared/db/transaccion.js';

const COLS_MATERIAL = 'id, codigo, nombre, categoria, unidad, stock_actual, stock_minimo, version, actualizado_en';

const aMaterial = (r) =>
  congelarProfundo({
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    categoria: r.categoria,
    unidad: r.unidad,
    stockActual: r.stock_actual,
    stockMinimo: r.stock_minimo,
    version: r.version,
    actualizadoEn: r.actualizado_en.toISOString(),
  });

const aMovimiento = (r) =>
  congelarProfundo({
    id: r.id,
    materialId: r.material_id,
    tipo: r.tipo,
    cantidad: r.cantidad,
    stockResultante: r.stock_resultante,
    referencia: r.referencia_tipo ? { tipo: r.referencia_tipo, id: r.referencia_id } : null,
    usuario: r.usuario,
    fecha: r.fecha.toISOString(),
  });

export class PostgresMaterialRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }

  async obtenerPorId(id) {
    const { rows } = await this.pool.query(`SELECT ${COLS_MATERIAL} FROM inventario_materiales WHERE id = $1`, [id]);
    return rows[0] ? aMaterial(rows[0]) : null;
  }

  async obtenerVarios(ids) {
    const { rows } = await this.pool.query(
      `SELECT ${COLS_MATERIAL} FROM inventario_materiales WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    return rows.map(aMaterial);
  }

  async listar({ categoria } = {}) {
    const { rows } = await this.pool.query(
      `SELECT ${COLS_MATERIAL} FROM inventario_materiales
        WHERE ($1::varchar IS NULL OR categoria = $1) ORDER BY codigo`,
      [categoria ?? null],
    );
    return rows.map(aMaterial);
  }

  async crear(m) {
    try {
      await this.pool.query(
        `INSERT INTO inventario_materiales (${COLS_MATERIAL}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [m.id, m.codigo, m.nombre, m.categoria, m.unidad, m.stockActual, m.stockMinimo, m.version, m.actualizadoEn],
      );
    } catch (err) {
      if (err.code === '23505') {
        throw new DomainError(`Ya existe un material con código "${m.codigo}"`, { codigo: 'CODIGO_DUPLICADO' });
      }
      throw err;
    }
  }

  async aplicarMovimientos({ cambios, movimientos }) {
    try {
      await enTransaccion(this.pool, async (c) => {
        for (const { material, versionEsperada } of cambios) {
          const { rowCount } = await c.query(
            `UPDATE inventario_materiales
                SET stock_actual = $2, version = $3, actualizado_en = $4
              WHERE id = $1 AND version = $5`,
            [material.id, material.stockActual, material.version, material.actualizadoEn, versionEsperada],
          );
          if (rowCount !== 1) throw new ConflictoConcurrenciaError('Material', material.id);
        }
        for (const mv of movimientos) {
          await c.query(
            `INSERT INTO inventario_movimientos
               (id, material_id, tipo, cantidad, stock_resultante, referencia_tipo, referencia_id, usuario_id, usuario, fecha)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              mv.id,
              mv.materialId,
              mv.tipo,
              mv.cantidad,
              mv.stockResultante,
              mv.referencia?.tipo ?? null,
              mv.referencia?.id ?? null,
              mv.usuario.id,
              JSON.stringify(mv.usuario),
              mv.fecha,
            ],
          );
        }
      });
    } catch (err) {
      // Índice único de idempotencia: otra ejecución ya descontó esta orden.
      if (err.code === '23505') throw new ConflictoConcurrenciaError('MovimientoInventario', movimientos[0]?.id);
      throw err;
    }
  }

  async existenMovimientosDeReferencia(tipo, id) {
    const { rows } = await this.pool.query(
      'SELECT EXISTS (SELECT 1 FROM inventario_movimientos WHERE referencia_tipo = $1 AND referencia_id = $2) AS e',
      [tipo, id],
    );
    return rows[0].e;
  }

  async listarMovimientos(materialId, limite = 100) {
    const { rows } = await this.pool.query(
      `SELECT * FROM inventario_movimientos WHERE material_id = $1 ORDER BY fecha DESC, id LIMIT $2`,
      [materialId, limite],
    );
    return rows.map(aMovimiento);
  }
}

const COLS_EXISTENCIA = `id, orden_id, codigo_orden, pedido_id, cliente_id, tipo_producto, descripcion,
  especificacion_sello, ubicacion, cantidad, cantidad_entregada, estado, ingresado_por, ingresado_en, entregas, version`;

const aExistencia = (r) =>
  congelarProfundo({
    id: r.id,
    ordenId: r.orden_id,
    codigoOrden: r.codigo_orden,
    pedidoId: r.pedido_id,
    clienteId: r.cliente_id,
    tipoProducto: r.tipo_producto,
    descripcion: r.descripcion,
    especificacionSello: r.especificacion_sello,
    ubicacion: r.ubicacion,
    cantidad: r.cantidad,
    cantidadEntregada: r.cantidad_entregada,
    estado: r.estado,
    ingresadoPor: r.ingresado_por,
    ingresadoEn: r.ingresado_en.toISOString(),
    entregas: r.entregas,
    version: r.version,
  });

export class PostgresProductoTerminadoRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }

  async obtenerPorId(id) {
    const { rows } = await this.pool.query(`SELECT ${COLS_EXISTENCIA} FROM inventario_productos_terminados WHERE id = $1`, [id]);
    return rows[0] ? aExistencia(rows[0]) : null;
  }

  async obtenerPorOrdenId(ordenId) {
    const { rows } = await this.pool.query(
      `SELECT ${COLS_EXISTENCIA} FROM inventario_productos_terminados WHERE orden_id = $1`,
      [ordenId],
    );
    return rows[0] ? aExistencia(rows[0]) : null;
  }

  async crear(e) {
    try {
      await this.pool.query(
        `INSERT INTO inventario_productos_terminados (${COLS_EXISTENCIA})
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          e.id,
          e.ordenId,
          e.codigoOrden,
          e.pedidoId,
          e.clienteId,
          e.tipoProducto,
          e.descripcion,
          e.especificacionSello ? JSON.stringify(e.especificacionSello) : null,
          e.ubicacion,
          e.cantidad,
          e.cantidadEntregada,
          e.estado,
          JSON.stringify(e.ingresadoPor),
          e.ingresadoEn,
          JSON.stringify(e.entregas),
          e.version,
        ],
      );
    } catch (err) {
      if (err.code === '23505') throw new ConflictoConcurrenciaError('ExistenciaProductoTerminado', e.ordenId);
      throw err;
    }
  }

  async actualizar(e, versionEsperada) {
    const { rowCount } = await this.pool.query(
      `UPDATE inventario_productos_terminados
          SET cantidad_entregada = $2, estado = $3, entregas = $4, ubicacion = $5, version = $6
        WHERE id = $1 AND version = $7`,
      [e.id, e.cantidadEntregada, e.estado, JSON.stringify(e.entregas), e.ubicacion, e.version, versionEsperada],
    );
    if (rowCount !== 1) throw new ConflictoConcurrenciaError('ExistenciaProductoTerminado', e.id);
  }

  async listarPendientes({ tipoProducto, clienteId } = {}) {
    const { rows } = await this.pool.query(
      `SELECT ${COLS_EXISTENCIA} FROM inventario_productos_terminados
        WHERE estado <> 'ENTREGADO'
          AND ($1::varchar IS NULL OR tipo_producto = $1)
          AND ($2::uuid IS NULL OR cliente_id = $2)
        ORDER BY ingresado_en`,
      [tipoProducto ?? null, clienteId ?? null],
    );
    return rows.map(aExistencia);
  }
}
