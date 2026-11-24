// Repositorios PostgreSQL del módulo auth (tablas usuarios, roles y sesiones).
import { DomainError } from '../../../shared/domain/errors.js';
import { enTransaccion } from '../../../shared/db/transaccion.js';

const SELECT_USUARIO = `
  SELECT u.id, u.nombre_completo, u.email, u.password_hash, r.nombre AS rol, u.telefono, u.cargo,
         u.activo, u.creado_en, u.ultimo_acceso, u.creado_por, c.nombre_completo AS creado_por_nombre
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN usuarios c ON c.id = u.creado_por`;

const aUsuario = (f) =>
  Object.freeze({
    id: f.id,
    nombre: f.nombre_completo,
    email: f.email,
    passwordHash: f.password_hash,
    rol: f.rol,
    telefono: f.telefono,
    cargo: f.cargo,
    activo: f.activo,
    creadoEn: f.creado_en.toISOString(),
    ultimoAcceso: f.ultimo_acceso ? f.ultimo_acceso.toISOString() : null,
    creadoPor: f.creado_por ? { id: f.creado_por, nombre: f.creado_por_nombre } : null,
  });

async function insertar(cliente, u) {
  try {
    await cliente.query(
      `INSERT INTO usuarios (id, nombre_completo, email, password_hash, rol_id, telefono, cargo, activo, creado_por, creado_en)
       VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE nombre = $5), $6, $7, $8, $9, $10)`,
      [u.id, u.nombre, u.email, u.passwordHash, u.rol, u.telefono, u.cargo, u.activo, u.creadoPor?.id ?? null, u.creadoEn],
    );
  } catch (err) {
    if (err.code === '23505') throw new DomainError('Ese correo ya está registrado', { codigo: 'EMAIL_DUPLICADO' });
    throw err;
  }
}

export class UsuarioRepositoryPostgres {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }
  async obtenerPorId(id) {
    const { rows } = await this.pool.query(`${SELECT_USUARIO} WHERE u.id = $1`, [id]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }
  async obtenerPorEmail(email) {
    const { rows } = await this.pool.query(`${SELECT_USUARIO} WHERE u.email = $1`, [email.trim().toLowerCase()]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }
  async listar() {
    const { rows } = await this.pool.query(`${SELECT_USUARIO} ORDER BY u.creado_en`);
    return rows.map(aUsuario);
  }
  async existeAdministrador() {
    const { rows } = await this.pool.query(
      `SELECT EXISTS (SELECT 1 FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'ADMIN') AS hay`,
    );
    return rows[0].hay;
  }
  async contarAdministradoresActivos() {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS n FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'ADMIN' AND u.activo`,
    );
    return rows[0].n;
  }
  async crear(usuario) {
    await insertar(this.pool, usuario);
  }
  async crearAdministradorUnico(usuario) {
    await enTransaccion(this.pool, async (c) => {
      // Cerrojo de transacción: dos instalaciones simultáneas se ejecutan en serie.
      await c.query("SELECT pg_advisory_xact_lock(hashtext('markenny:setup-admin'))");
      const { rows } = await c.query(
        `SELECT EXISTS (SELECT 1 FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'ADMIN') AS hay`,
      );
      if (rows[0].hay) {
        throw new DomainError('El administrador maestro ya fue registrado', { codigo: 'ADMIN_YA_REGISTRADO' });
      }
      await insertar(c, usuario);
    });
  }
  async actualizar(id, { activo, passwordHash, ultimoAcceso }) {
    await this.pool.query(
      `UPDATE usuarios
          SET activo = COALESCE($2, activo),
              password_hash = COALESCE($3, password_hash),
              ultimo_acceso = COALESCE($4, ultimo_acceso)
        WHERE id = $1`,
      [id, activo ?? null, passwordHash ?? null, ultimoAcceso ?? null],
    );
  }
}

export class SesionRepositoryPostgres {
  /** @param {import('pg').Pool} pool */
  constructor(pool) {
    this.pool = pool;
  }
  async crear({ tokenHash, usuarioId, expiraEn, ahora }) {
    await this.pool.query('INSERT INTO sesiones (token_hash, usuario_id, expira_en) VALUES ($1, $2, $3)', [
      tokenHash,
      usuarioId,
      expiraEn,
    ]);
    // Limpieza oportunista de sesiones caducadas, con el reloj de la aplicación
    // (el mismo que fija la expiración), no con now() de la base de datos.
    await this.pool.query('DELETE FROM sesiones WHERE expira_en < $1', [ahora]);
  }
  async usuarioDeSesion(tokenHash, ahora) {
    const { rows } = await this.pool.query(
      `${SELECT_USUARIO} JOIN sesiones s ON s.usuario_id = u.id WHERE s.token_hash = $1 AND s.expira_en > $2`,
      [tokenHash, ahora],
    );
    return rows[0] ? aUsuario(rows[0]) : null;
  }
  async eliminar(tokenHash) {
    await this.pool.query('DELETE FROM sesiones WHERE token_hash = $1', [tokenHash]);
  }
  async eliminarDeUsuario(usuarioId) {
    await this.pool.query('DELETE FROM sesiones WHERE usuario_id = $1', [usuarioId]);
  }
}
