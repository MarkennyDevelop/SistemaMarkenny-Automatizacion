// Repositorios en memoria del módulo auth (pruebas y desarrollo sin BD).
import { DomainError } from '../../../shared/domain/errors.js';

export class UsuarioRepositoryMemoria {
  #usuarios = new Map();

  async obtenerPorId(id) {
    return this.#usuarios.get(id) ?? null;
  }
  async obtenerPorEmail(email) {
    return [...this.#usuarios.values()].find((u) => u.email === email.trim().toLowerCase()) ?? null;
  }
  async listar() {
    return [...this.#usuarios.values()];
  }
  async existeAdministrador() {
    return [...this.#usuarios.values()].some((u) => u.rol === 'ADMIN');
  }
  async contarAdministradoresActivos() {
    return [...this.#usuarios.values()].filter((u) => u.rol === 'ADMIN' && u.activo).length;
  }
  async crear(usuario) {
    if (await this.obtenerPorEmail(usuario.email)) {
      throw new DomainError('Ese correo ya está registrado', { codigo: 'EMAIL_DUPLICADO' });
    }
    this.#usuarios.set(usuario.id, usuario);
  }
  async crearAdministradorUnico(usuario) {
    if (await this.existeAdministrador()) {
      throw new DomainError('El administrador maestro ya fue registrado', { codigo: 'ADMIN_YA_REGISTRADO' });
    }
    await this.crear(usuario);
  }
  async actualizar(id, cambios) {
    const actual = this.#usuarios.get(id);
    if (actual) this.#usuarios.set(id, Object.freeze({ ...actual, ...cambios }));
  }
}

export class SesionRepositoryMemoria {
  #sesiones = new Map();
  constructor(usuarios) {
    this.usuarios = usuarios;
  }
  async crear(sesion) {
    this.#sesiones.set(sesion.tokenHash, sesion);
  }
  async usuarioDeSesion(tokenHash, ahora) {
    const sesion = this.#sesiones.get(tokenHash);
    if (!sesion || sesion.expiraEn <= ahora) return null;
    return this.usuarios.obtenerPorId(sesion.usuarioId);
  }
  async eliminar(tokenHash) {
    this.#sesiones.delete(tokenHash);
  }
  async eliminarDeUsuario(usuarioId) {
    for (const [hash, sesion] of this.#sesiones) if (sesion.usuarioId === usuarioId) this.#sesiones.delete(hash);
  }
}
