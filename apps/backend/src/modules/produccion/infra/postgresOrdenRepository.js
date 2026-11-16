// Adaptador PostgreSQL del OrdenProduccionRepositoryPort.
import { ConflictoConcurrenciaError } from '../../../shared/domain/errors.js';
import { congelarProfundo } from '../../../shared/domain/inmutable.js';
import { enTransaccion } from '../../../shared/db/transaccion.js';
import { formatearCodigoOrden } from '../application/ports/ordenProduccionRepositoryPort.js';

const COLUMNAS = `id, codigo, pedido_id, cliente_id, tipo_producto, descripcion, cantidad,
  materiales, especificacion_sello, estado, version, creada_en, actualizada_en`;

export class PostgresOrdenRepository {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }

  async obtenerPorId(id) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNAS} FROM produccion_ordenes WHERE id = $1`, [id]);
    if (rows.length === 0) return null;
    const historial = await this.#historialDe([id]);
    return this.#aDominio(rows[0], historial.get(id) ?? []);
  }

  async listar({ estado, limite = 50 } = {}) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNAS} FROM produccion_ordenes
        WHERE ($1::varchar IS NULL OR estado = $1)
        ORDER BY creada_en DESC LIMIT $2`,
      [estado ?? null, limite],
    );
    const historiales = await this.#historialDe(rows.map((r) => r.id));
    return rows.map((r) => this.#aDominio(r, historiales.get(r.id) ?? []));
  }

  async crear(orden) {
    await enTransaccion(this.pool, async (c) => {
      await c.query(
        `INSERT INTO produccion_ordenes (${COLUMNAS})
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          orden.id,
          orden.codigo,
          orden.pedidoId,
          orden.clienteId,
          orden.tipoProducto,
          orden.descripcion,
          orden.cantidad,
          JSON.stringify(orden.materiales),
          orden.especificacionSello ? JSON.stringify(orden.especificacionSello) : null,
          orden.estado,
          orden.version,
          orden.creadaEn,
          orden.actualizadaEn,
        ],
      );
      await this.#insertarAuditoria(c, orden.id, orden.historial);
    });
  }

  async actualizar(orden, versionEsperada) {
    await enTransaccion(this.pool, async (c) => {
      const { rowCount } = await c.query(
        `UPDATE produccion_ordenes
            SET estado = $2, version = $3, actualizada_en = $4
          WHERE id = $1 AND version = $5`,
        [orden.id, orden.estado, orden.version, orden.actualizadaEn, versionEsperada],
      );
      if (rowCount !== 1) throw new ConflictoConcurrenciaError('OrdenProduccion', orden.id);

      const { rows } = await c.query(
        'SELECT COALESCE(MAX(secuencia), 0) AS max FROM produccion_auditoria_transiciones WHERE orden_id = $1',
        [orden.id],
      );
      const nuevos = orden.historial.filter((r) => r.secuencia > Number(rows[0].max));
      await this.#insertarAuditoria(c, orden.id, nuevos);
    });
  }

  async siguienteCodigo(anio) {
    const { rows } = await this.pool.query("SELECT nextval('produccion_codigo_orden_seq') AS n");
    return formatearCodigoOrden(anio, Number(rows[0].n));
  }

  async #insertarAuditoria(client, ordenId, registros) {
    for (const r of registros) {
      await client.query(
        `INSERT INTO produccion_auditoria_transiciones
           (orden_id, secuencia, desde, hacia, usuario_id, usuario, fecha, motivo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [ordenId, r.secuencia, r.desde, r.hacia, r.usuario.id, JSON.stringify(r.usuario), r.fecha, r.motivo],
      );
    }
  }

  async #historialDe(ids) {
    const mapa = new Map();
    if (ids.length === 0) return mapa;
    const { rows } = await this.pool.query(
      `SELECT orden_id, secuencia, desde, hacia, usuario, fecha, motivo
         FROM produccion_auditoria_transiciones
        WHERE orden_id = ANY($1::uuid[])
        ORDER BY orden_id, secuencia`,
      [ids],
    );
    for (const r of rows) {
      if (!mapa.has(r.orden_id)) mapa.set(r.orden_id, []);
      mapa.get(r.orden_id).push({
        secuencia: r.secuencia,
        desde: r.desde,
        hacia: r.hacia,
        usuario: r.usuario,
        fecha: r.fecha.toISOString(),
        motivo: r.motivo,
      });
    }
    return mapa;
  }

  #aDominio(row, historial) {
    return congelarProfundo({
      id: row.id,
      codigo: row.codigo,
      pedidoId: row.pedido_id,
      clienteId: row.cliente_id,
      tipoProducto: row.tipo_producto,
      descripcion: row.descripcion,
      cantidad: row.cantidad,
      materiales: row.materiales,
      especificacionSello: row.especificacion_sello,
      estado: row.estado,
      version: row.version,
      creadaEn: row.creada_en.toISOString(),
      actualizadaEn: row.actualizada_en.toISOString(),
      historial,
    });
  }
}
