// Repositorios de notificaciones: memoria y PostgreSQL.
import { esVisiblePara } from '../domain/notificacion.js';

const aDTO = (n, leida) => ({
  id: n.id,
  tipo: n.tipo,
  titulo: n.titulo,
  detalle: n.detalle,
  ordenId: n.ordenId,
  codigo: n.codigo,
  leida,
  creadaEn: n.creadaEn,
});

export class NotificacionRepositoryMemoria {
  #notificaciones = [];
  #lecturas = new Set();

  async crear(n) {
    this.#notificaciones.push(n);
  }
  async listarPara(usuario, limite = 100) {
    return this.#notificaciones
      .filter((n) => esVisiblePara(n, usuario))
      .sort((a, b) => (a.creadaEn < b.creadaEn ? 1 : -1))
      .slice(0, limite)
      .map((n) => aDTO(n, this.#lecturas.has(`${n.id}:${usuario.id}`)));
  }
  async marcarLeida(id, usuario) {
    const n = this.#notificaciones.find((x) => x.id === id);
    if (!n || !esVisiblePara(n, usuario)) return null;
    this.#lecturas.add(`${n.id}:${usuario.id}`);
    return aDTO(n, true);
  }
  async marcarTodas(usuario) {
    let marcadas = 0;
    for (const n of this.#notificaciones) {
      const clave = `${n.id}:${usuario.id}`;
      if (esVisiblePara(n, usuario) && !this.#lecturas.has(clave)) {
        this.#lecturas.add(clave);
        marcadas += 1;
      }
    }
    return marcadas;
  }
}

/** Misma regla que esVisiblePara, en SQL ($1 = rol, $2 = id del usuario). */
const VISIBLE = `($1 = ANY(n.roles) AND (n.destinatario_id IS NULL OR $1 = 'ADMIN' OR n.destinatario_id = $2))`;

const desdeFila = (f) =>
  aDTO(
    {
      id: f.id,
      tipo: f.tipo,
      titulo: f.titulo,
      detalle: f.detalle,
      ordenId: f.orden_id,
      codigo: f.codigo,
      creadaEn: f.creada_en.toISOString(),
    },
    f.leida,
  );

export class NotificacionRepositoryPostgres {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }
  async crear(n) {
    await this.pool.query(
      `INSERT INTO notificaciones (id, tipo, titulo, detalle, orden_id, codigo, roles, destinatario_id, creada_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [n.id, n.tipo, n.titulo, n.detalle, n.ordenId, n.codigo, n.roles, n.destinatarioId, n.creadaEn],
    );
  }
  async listarPara(usuario, limite = 100) {
    const { rows } = await this.pool.query(
      `SELECT n.*, (l.usuario_id IS NOT NULL) AS leida
         FROM notificaciones n
         LEFT JOIN notificaciones_lecturas l ON l.notificacion_id = n.id AND l.usuario_id = $2
        WHERE ${VISIBLE}
        ORDER BY n.creada_en DESC
        LIMIT $3`,
      [usuario.rol, usuario.id, limite],
    );
    return rows.map(desdeFila);
  }
  async marcarLeida(id, usuario) {
    const { rows } = await this.pool.query(
      `SELECT n.*, TRUE AS leida FROM notificaciones n WHERE n.id = $3 AND ${VISIBLE}`,
      [usuario.rol, usuario.id, id],
    );
    if (!rows[0]) return null;
    await this.pool.query(
      `INSERT INTO notificaciones_lecturas (notificacion_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, usuario.id],
    );
    return desdeFila(rows[0]);
  }
  async marcarTodas(usuario) {
    const { rowCount } = await this.pool.query(
      `INSERT INTO notificaciones_lecturas (notificacion_id, usuario_id)
       SELECT n.id, $2 FROM notificaciones n WHERE ${VISIBLE}
       ON CONFLICT DO NOTHING`,
      [usuario.rol, usuario.id],
    );
    return rowCount;
  }
}
