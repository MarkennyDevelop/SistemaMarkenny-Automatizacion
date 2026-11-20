// Puertos del módulo de autenticación y usuarios.

/**
 * @typedef {Object} UsuarioRepositoryPort
 * @property {(id: string) => Promise<object|null>} obtenerPorId
 * @property {(email: string) => Promise<object|null>} obtenerPorEmail
 * @property {() => Promise<object[]>} listar
 * @property {() => Promise<boolean>} existeAdministrador
 * @property {() => Promise<number>} contarAdministradoresActivos
 * @property {(usuario: object) => Promise<void>} crear  Lanza EMAIL_DUPLICADO.
 * @property {(usuario: object) => Promise<void>} crearAdministradorUnico
 *   Inserta el administrador solo si no existe ninguno, de forma atómica
 *   (dos instalaciones simultáneas no pueden crear dos). Lanza ADMIN_YA_REGISTRADO.
 * @property {(id: string, cambios: { activo?: boolean, passwordHash?: string, ultimoAcceso?: string }) => Promise<void>} actualizar
 *
 * @typedef {Object} SesionRepositoryPort
 * @property {(sesion: { tokenHash: string, usuarioId: string, expiraEn: string }) => Promise<void>} crear
 * @property {(tokenHash: string, ahora: string) => Promise<object|null>} usuarioDeSesion  Usuario de una sesión vigente.
 * @property {(tokenHash: string) => Promise<void>} eliminar
 * @property {(usuarioId: string) => Promise<void>} eliminarDeUsuario
 *
 * @typedef {Object} PasswordHasherPort
 * @property {(password: string) => Promise<string>} hash
 * @property {(password: string, hash: string) => Promise<boolean>} verificar
 *
 * @typedef {Object} TokenSesionPort
 * @property {() => string} generar      Token aleatorio para la cookie.
 * @property {(token: string) => string} huella  SHA-256 hex que se guarda en BD.
 */

export const USUARIO_REPOSITORY_PORT = Object.freeze([
  'obtenerPorId', 'obtenerPorEmail', 'listar', 'existeAdministrador',
  'contarAdministradoresActivos', 'crear', 'crearAdministradorUnico', 'actualizar',
]);
export const SESION_REPOSITORY_PORT = Object.freeze(['crear', 'usuarioDeSesion', 'eliminar', 'eliminarDeUsuario']);
export const PASSWORD_HASHER_PORT = Object.freeze(['hash', 'verificar']);
export const TOKEN_SESION_PORT = Object.freeze(['generar', 'huella']);
