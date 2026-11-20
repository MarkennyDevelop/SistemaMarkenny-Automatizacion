// API pública del módulo de autenticación y empleados.
import { implementaPuerto, PUERTOS } from '../../shared/application/ports.js';
import {
  PASSWORD_HASHER_PORT,
  SESION_REPOSITORY_PORT,
  TOKEN_SESION_PORT,
  USUARIO_REPOSITORY_PORT,
} from './application/puertos.js';
import { crearCasosUsoAuth } from './application/casosUso.js';
import { actorDe } from '../../shared/application/actor.js';

export { UsuarioRepositoryMemoria, SesionRepositoryMemoria } from './infra/memoria.js';
export { UsuarioRepositoryPostgres, SesionRepositoryPostgres } from './infra/postgres.js';
export { crearHasherScrypt, tokensSesion } from './infra/seguridad.js';


export function crearModuloAuth({ usuarios, sesiones, hasher, tokens, reloj, ids, duracionSesionHoras = 12 }) {
  const casosUso = crearCasosUsoAuth({
    usuarios: implementaPuerto('UsuarioRepository', USUARIO_REPOSITORY_PORT, usuarios),
    sesiones: implementaPuerto('SesionRepository', SESION_REPOSITORY_PORT, sesiones),
    hasher: implementaPuerto('PasswordHasher', PASSWORD_HASHER_PORT, hasher),
    tokens: implementaPuerto('TokenSesion', TOKEN_SESION_PORT, tokens),
    reloj: implementaPuerto('Clock', PUERTOS.Clock, reloj),
    ids: implementaPuerto('IdGenerator', PUERTOS.IdGenerator, ids),
    duracionSesionHoras,
  });

  /** Manejadores HTTP por nombre de endpoint del contrato. */
  const manejadores = {
    estadoInstalacion: () => casosUso.estadoInstalacion({}),
    registrarAdministrador: async ({ body, reply }) => {
      const { token, usuario } = await casosUso.registrarAdministrador(body);
      reply.abrirSesion(token);
      return usuario;
    },
    login: async ({ body, reply }) => {
      const { token, usuario } = await casosUso.login(body);
      reply.abrirSesion(token);
      return usuario;
    },
    logout: async ({ req, reply }) => {
      if (req.tokenSesion) await casosUso.logout({ token: req.tokenSesion });
      reply.cerrarSesion();
    },
    sesionActual: ({ usuario }) => usuario,
    listarUsuarios: () => casosUso.listarUsuarios({}),
    crearEmpleado: ({ body, usuario }) => casosUso.crearEmpleado({ ...body, actor: actorDe(usuario) }),
    cambiarEstadoUsuario: ({ params, body, usuario }) =>
      casosUso.cambiarEstadoUsuario({ id: params.id, ...body, actor: actorDe(usuario) }),
    restablecerPassword: ({ params, body }) => casosUso.restablecerPassword({ id: params.id, ...body }),
  };

  return { casosUso, manejadores, resolverSesion: casosUso.resolverSesion };
}
