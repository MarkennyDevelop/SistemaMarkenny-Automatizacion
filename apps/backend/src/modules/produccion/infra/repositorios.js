// Repositorios de órdenes de trabajo: memoria y PostgreSQL.
import { ConflictoConcurrenciaError } from '../../../shared/domain/errors.js';
import { enTransaccion } from '../../../shared/db/transaccion.js';

const formatearCodigo = (anio, n) => `OT-${anio}-${String(n).padStart(4, '0')}`;

/** Criterios comunes de resumen por cliente (ver docs/BASE-DE-DATOS.md). */
const esActiva = (o) => o.fase !== 'EMPAQUETADO';
const pendienteDeCobro = (o) => o.estadoEntrega !== 'ENTREGADO';

function coincide(o, { fase, categoria, estadoEntrega, q, vendedorId }) {
  if (fase && o.fase !== fase) return false;
  if (categoria && o.categoriaTrabajo !== categoria) return false;
  if (estadoEntrega && o.estadoEntrega !== estadoEntrega) return false;
  if (vendedorId && o.vendedorId !== vendedorId) return false;
  if (q) {
    const t = q.toLowerCase();
    return [o.codigo, o.producto, o.clienteNombre].some((v) => v.toLowerCase().includes(t));
  }
  return true;
}

export class OrdenRepositoryMemoria {
  #ordenes = new Map();
  #contadores = new Map();

  async siguienteCodigo(anio) {
    const n = (this.#contadores.get(anio) ?? 0) + 1;
    this.#contadores.set(anio, n);
    return formatearCodigo(anio, n);
  }
  async crear(orden) {
    this.#ordenes.set(orden.id, orden);
  }
  async actualizar(orden, versionEsperada) {
    if (this.#ordenes.get(orden.id)?.version !== versionEsperada) throw new ConflictoConcurrenciaError('La orden', orden.id);
    this.#ordenes.set(orden.id, orden);
  }
  async actualizarEstadoEntrega(id, estadoEntrega) {
    const o = this.#ordenes.get(id);
    if (o) this.#ordenes.set(id, Object.freeze({ ...o, estadoEntrega }));
  }
  async agregarNota(ordenId, nota) {
    const o = this.#ordenes.get(ordenId);
    if (o) this.#ordenes.set(ordenId, Object.freeze({ ...o, notas: [...o.notas, nota] }));
  }
  async obtenerPorId(id) {
    return this.#ordenes.get(id) ?? null;
  }
  async listar({ limite = 200, ...filtro } = {}) {
    return [...this.#ordenes.values()]
      .filter((o) => coincide(o, filtro))
      .sort((a, b) => (a.fechaCreacion < b.fechaCreacion ? 1 : a.fechaCreacion > b.fechaCreacion ? -1 : b.codigo.localeCompare(a.codigo)))
      .slice(0, limite);
  }
  async fasesDe(ids) {
    return new Map(ids.flatMap((id) => (this.#ordenes.has(id) ? [[id, this.#ordenes.get(id).fase]] : [])));
  }
  async resumenPorCliente() {
    const mapa = new Map();
    for (const o of this.#ordenes.values()) {
      const r = mapa.get(o.clienteId) ?? { activas: 0, saldo: 0 };
      if (esActiva(o)) r.activas += 1;
      if (pendienteDeCobro(o)) r.saldo = Math.round((r.saldo + o.montoTotal) * 100) / 100;
      mapa.set(o.clienteId, r);
    }
    return mapa;
  }
}

/* --------------------------------------------------------------------- */

const SELECT_ORDEN = `
  SELECT o.*, v.nombre_completo AS vendedor_nombre
    FROM ordenes_trabajo o
    JOIN usuarios v ON v.id = o.vendedor_id`;

const aEvento = (f) => ({
  id: f.id,
  fase: f.estado_nuevo,
  anterior: f.estado_anterior,
  usuarioId: f.usuario_id,
  usuario: f.usuario_nombre,
  rol: f.usuario_rol,
  fecha: f.registrado_en.toISOString(),
  nota: f.comentario,
});

const aNota = (f) => ({
  id: f.id,
  mensaje: f.mensaje,
  solicitaRetrabajo: f.solicita_retrabajo,
  usuarioId: f.usuario_id,
  usuario: f.usuario_nombre,
  rol: f.usuario_rol,
  fecha: f.registrado_en.toISOString(),
});

function aOrden(f, historial, notas) {
  const especificaciones = { ...f.especificaciones };
  // La columna `observaciones` del esquema original es la fuente de las observaciones.
  if (f.observaciones) especificaciones.observaciones = f.observaciones;
  return Object.freeze({
    id: f.id,
    codigo: f.codigo_orden,
    clienteId: f.cliente_id,
    clienteNombre: f.cliente_nombre,
    clienteTelefono: f.cliente_telefono,
    vendedorId: f.vendedor_id,
    vendedor: f.vendedor_nombre,
    categoriaTrabajo: f.tipo_trabajo,
    productoTerminado: f.producto_terminado,
    materialId: f.material_id,
    consumoSustrato: f.consumo_sustrato === null ? null : Number(f.consumo_sustrato),
    producto: f.producto,
    descripcion: f.descripcion,
    tecnologia: f.tecnologia,
    prioridad: f.prioridad,
    maquina: f.maquina,
    operador: f.operador,
    cantidad: f.cantidad,
    sustrato: f.sustrato,
    tintas: f.tintas,
    acabados: f.acabados,
    especificaciones,
    montoTotal: f.monto_total,
    fase: f.estado_produccion,
    estadoEntrega: f.estado_entrega,
    fechaCreacion: f.creado_en.toISOString(),
    fechaEntrega: f.fecha_estimada_entrega.toISOString(),
    fechaFinalizado: f.fecha_finalizado ? f.fecha_finalizado.toISOString() : null,
    version: f.version,
    historial,
    notas,
  });
}

async function insertarEventos(cliente, ordenId, eventos) {
  for (const e of eventos) {
    await cliente.query(
      `INSERT INTO produccion_etapas_auditoria
         (id, orden_id, usuario_id, usuario_nombre, usuario_rol, estado_anterior, estado_nuevo, comentario, registrado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [e.id, ordenId, e.usuarioId, e.usuario, e.rol, e.anterior, e.fase, e.nota, e.fecha],
    );
  }
}

export class OrdenRepositoryPostgres {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }

  async siguienteCodigo(anio) {
    // UPSERT atómico: dos ventas simultáneas nunca reciben el mismo número.
    const { rows } = await this.pool.query(
      `INSERT INTO ordenes_trabajo_contadores (anio, ultimo) VALUES ($1, 1)
       ON CONFLICT (anio) DO UPDATE SET ultimo = ordenes_trabajo_contadores.ultimo + 1
       RETURNING ultimo`,
      [anio],
    );
    return formatearCodigo(anio, rows[0].ultimo);
  }

  async crear(o) {
    const { observaciones, ...especificaciones } = o.especificaciones;
    await enTransaccion(this.pool, async (c) => {
      await c.query(
        `INSERT INTO ordenes_trabajo
           (id, codigo_orden, cliente_id, cliente_nombre, cliente_telefono, vendedor_id, tipo_trabajo, producto,
            descripcion, tecnologia, prioridad, maquina, operador, cantidad, sustrato, tintas, acabados,
            especificaciones, estado_produccion, estado_entrega, monto_total, observaciones, fecha_aprobacion,
            fecha_estimada_entrega, fecha_finalizado, version, creado_en, producto_terminado,
            material_id, consumo_sustrato)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$23,$27,$28,$29)`,
        [
          o.id, o.codigo, o.clienteId, o.clienteNombre, o.clienteTelefono, o.vendedorId, o.categoriaTrabajo, o.producto,
          o.descripcion, o.tecnologia, o.prioridad, o.maquina, o.operador, o.cantidad, o.sustrato, o.tintas, o.acabados,
          JSON.stringify(especificaciones), o.fase, o.estadoEntrega, o.montoTotal, observaciones ?? null, o.fechaCreacion,
          o.fechaEntrega, o.fechaFinalizado, o.version, o.productoTerminado,
          o.materialId ?? null, o.consumoSustrato ?? null,
        ],
      );
      await insertarEventos(c, o.id, o.historial);
    });
  }

  async actualizar(o, versionEsperada) {
    await enTransaccion(this.pool, async (c) => {
      const { rowCount } = await c.query(
        `UPDATE ordenes_trabajo
            SET estado_produccion = $2, estado_entrega = $3, fecha_finalizado = $4, version = $5
          WHERE id = $1 AND version = $6`,
        [o.id, o.fase, o.estadoEntrega, o.fechaFinalizado, o.version, versionEsperada],
      );
      if (rowCount !== 1) throw new ConflictoConcurrenciaError('La orden', o.id);
      const { rows } = await c.query('SELECT id FROM produccion_etapas_auditoria WHERE orden_id = $1', [o.id]);
      const guardados = new Set(rows.map((r) => r.id));
      await insertarEventos(c, o.id, o.historial.filter((e) => !guardados.has(e.id)));
    });
  }

  async actualizarEstadoEntrega(id, estadoEntrega) {
    await this.pool.query('UPDATE ordenes_trabajo SET estado_entrega = $2 WHERE id = $1', [id, estadoEntrega]);
  }

  async agregarNota(ordenId, n) {
    await this.pool.query(
      `INSERT INTO ordenes_notas (id, orden_id, mensaje, solicita_retrabajo, usuario_id, usuario_nombre, usuario_rol, registrado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [n.id, ordenId, n.mensaje, n.solicitaRetrabajo, n.usuarioId, n.usuario, n.rol, n.fecha],
    );
  }

  async obtenerPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_ORDEN} WHERE o.id = $1`, [id]);
    if (!rows[0]) return null;
    const [historiales, notas] = await Promise.all([this.#historiales([id]), this.#notas([id])]);
    return aOrden(rows[0], historiales.get(id) ?? [], notas.get(id) ?? []);
  }

  async listar({ fase, categoria, estadoEntrega, q, vendedorId, limite = 200 } = {}) {
    const { rows } = await this.pool.query(
      `${SELECT_ORDEN}
        WHERE ($1::text IS NULL OR o.estado_produccion = $1)
          AND ($2::text IS NULL OR o.tipo_trabajo = $2)
          AND ($3::text IS NULL OR o.estado_entrega = $3)
          AND ($4::uuid IS NULL OR o.vendedor_id = $4)
          AND ($5::text IS NULL OR o.codigo_orden ILIKE '%' || $5 || '%'
               OR o.producto ILIKE '%' || $5 || '%' OR o.cliente_nombre ILIKE '%' || $5 || '%')
        ORDER BY o.creado_en DESC, o.codigo_orden DESC
        LIMIT $6`,
      [fase ?? null, categoria ?? null, estadoEntrega ?? null, vendedorId ?? null, q || null, limite],
    );
    const ids = rows.map((f) => f.id);
    const [historiales, notas] = await Promise.all([this.#historiales(ids), this.#notas(ids)]);
    return rows.map((f) => aOrden(f, historiales.get(f.id) ?? [], notas.get(f.id) ?? []));
  }

  async fasesDe(ids) {
    if (ids.length === 0) return new Map();
    const { rows } = await this.pool.query(
      'SELECT id, estado_produccion FROM ordenes_trabajo WHERE id = ANY($1::uuid[])',
      [ids],
    );
    return new Map(rows.map((f) => [f.id, f.estado_produccion]));
  }

  async resumenPorCliente() {
    const { rows } = await this.pool.query(
      `SELECT cliente_id,
              count(*) FILTER (WHERE estado_produccion <> 'EMPAQUETADO')::int AS activas,
              COALESCE(sum(monto_total) FILTER (WHERE estado_entrega <> 'ENTREGADO'), 0) AS saldo
         FROM ordenes_trabajo GROUP BY cliente_id`,
    );
    return new Map(rows.map((f) => [f.cliente_id, { activas: f.activas, saldo: Number(f.saldo) }]));
  }

  async #notas(ids) {
    const mapa = new Map();
    if (ids.length === 0) return mapa;
    const { rows } = await this.pool.query(
      'SELECT * FROM ordenes_notas WHERE orden_id = ANY($1::uuid[]) ORDER BY registrado_en, secuencia',
      [ids],
    );
    for (const f of rows) {
      if (!mapa.has(f.orden_id)) mapa.set(f.orden_id, []);
      mapa.get(f.orden_id).push(aNota(f));
    }
    return mapa;
  }

  async #historiales(ids) {
    const mapa = new Map();
    if (ids.length === 0) return mapa;
    const { rows } = await this.pool.query(
      `SELECT * FROM produccion_etapas_auditoria WHERE orden_id = ANY($1::uuid[]) ORDER BY registrado_en, secuencia`,
      [ids],
    );
    for (const f of rows) {
      if (!mapa.has(f.orden_id)) mapa.set(f.orden_id, []);
      mapa.get(f.orden_id).push(aEvento(f));
    }
    return mapa;
  }
}
