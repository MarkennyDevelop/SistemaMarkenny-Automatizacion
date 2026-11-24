// Casos de uso de autenticación, sesión y gestión de empleados.
import { z } from 'zod';
import {
  CambiarEstadoUsuarioSchema,
  CrearEmpleadoSchema,
  EstadoInstalacionSchema,
  LoginSchema,
  RestablecerPasswordSchema,
  SetupAdminSchema,
  UsuarioPublicoSchema,
} from '@markenny/contrato';
import { casoDeUso } from '../../../shared/application/validacion.js';
import { ActorSchema } from '../../../shared/application/actor.js';
import { DomainError, RecursoNoEncontradoError } from '../../../shared/domain/errors.js';
import { aUsuarioPublico, cambiarEstado, crearUsuario, validarRolEmpleado } from '../domain/usuario.js';

const CREDENCIALES_INVALIDAS = () =>
  new DomainError('Correo o contraseña incorrectos', { codigo: 'CREDENCIALES_INVALIDAS' });

/**
 * @param {{ usuarios: any, sesiones: any, hasher: any, tokens: any, reloj: any, ids: any,
 *   duracionSesionHoras: number }} deps
 */
export function crearCasosUsoAuth({ usuarios, sesiones, hasher, tokens, reloj, ids, duracionSesionHoras }) {
  // Hash de referencia para gastar el mismo tiempo cuando el correo no existe:
  // así la respuesta no revela qué correos están registrados.
  let hashSenuelo = null;
  const obtenerHashSenuelo = async () => (hashSenuelo ??= await hasher.hash('senuelo-sin-cuenta-1'));

  async function abrirSesion(usuario) {
    const ahora = reloj.ahora();
    const token = tokens.generar();
    await sesiones.crear({
      tokenHash: tokens.huella(token),
      usuarioId: usuario.id,
      expiraEn: new Date(ahora.getTime() + duracionSesionHoras * 3_600_000).toISOString(),
      ahora: ahora.toISOString(),
    });
    await usuarios.actualizar(usuario.id, { ultimoAcceso: ahora.toISOString() });
    return { token, usuario: aUsuarioPublico({ ...usuario, ultimoAcceso: ahora.toISOString() }) };
  }

  const SesionAbiertaSchema = z.object({ token: z.string().min(20), usuario: UsuarioPublicoSchema });

  return {
    estadoInstalacion: casoDeUso({
      nombre: 'auth.estadoInstalacion',
      entrada: z.object({}).strict(),
      salida: EstadoInstalacionSchema,
      ejecutar: async () => ({ hayAdministrador: await usuarios.existeAdministrador() }),
    }),

    /** Registro único del administrador maestro; deja la sesión abierta. */
    registrarAdministrador: casoDeUso({
      nombre: 'auth.registrarAdministrador',
      entrada: SetupAdminSchema,
      salida: SesionAbiertaSchema,
      async ejecutar(datos) {
        if (await usuarios.existeAdministrador()) {
          throw new DomainError('El administrador maestro ya fue registrado', { codigo: 'ADMIN_YA_REGISTRADO' });
        }
        const admin = crearUsuario({
          id: ids.generar(),
          nombre: datos.nombre,
          email: datos.email,
          passwordHash: await hasher.hash(datos.password),
          rol: 'ADMIN',
          telefono: datos.telefono,
          cargo: datos.cargo || 'Administrador general',
          fecha: reloj.ahora(),
        });
        await usuarios.crearAdministradorUnico(admin);
        return abrirSesion(admin);
      },
    }),

    login: casoDeUso({
      nombre: 'auth.login',
      entrada: LoginSchema,
      salida: SesionAbiertaSchema,
      async ejecutar({ email, password }) {
        const usuario = await usuarios.obtenerPorEmail(email);
        const valida = await hasher.verificar(password, usuario?.passwordHash ?? (await obtenerHashSenuelo()));
        // Correo inexistente, contraseña errónea y cuenta inactiva responden igual.
        if (!usuario || !valida || !usuario.activo) throw CREDENCIALES_INVALIDAS();
        return abrirSesion(usuario);
      },
    }),

    logout: casoDeUso({
      nombre: 'auth.logout',
      entrada: z.object({ token: z.string() }).strict(),
      ejecutar: async ({ token }) => {
        await sesiones.eliminar(tokens.huella(token));
      },
    }),

    /** Usuario de la cookie, o null si no hay sesión vigente o la cuenta está inactiva. */
    async resolverSesion(token) {
      if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
      const usuario = await sesiones.usuarioDeSesion(tokens.huella(token), reloj.ahora().toISOString());
      return usuario && usuario.activo ? aUsuarioPublico(usuario) : null;
    },

    listarUsuarios: casoDeUso({
      nombre: 'auth.listarUsuarios',
      entrada: z.object({}).strict(),
      salida: z.array(UsuarioPublicoSchema),
      async ejecutar() {
        const lista = await usuarios.listar();
        return lista
          .map(aUsuarioPublico)
          // Administradores primero; el resto, por nombre.
          .sort((a, b) => Number(b.rol === 'ADMIN') - Number(a.rol === 'ADMIN') || a.nombre.localeCompare(b.nombre));
      },
    }),

    crearEmpleado: casoDeUso({
      nombre: 'auth.crearEmpleado',
      entrada: CrearEmpleadoSchema.extend({ actor: ActorSchema }),
      salida: UsuarioPublicoSchema,
      async ejecutar({ actor, ...datos }) {
        validarRolEmpleado(datos.rol);
        const empleado = crearUsuario({
          id: ids.generar(),
          nombre: datos.nombre,
          email: datos.email,
          passwordHash: await hasher.hash(datos.password),
          rol: datos.rol,
          telefono: datos.telefono,
          cargo: datos.cargo || (datos.rol === 'VENDEDOR' ? 'Ejecutivo de ventas' : 'Operario de planta'),
          creadoPor: { id: actor.id, nombre: actor.nombre },
          fecha: reloj.ahora(),
        });
        await usuarios.crear(empleado);
        return aUsuarioPublico(empleado);
      },
    }),

    cambiarEstadoUsuario: casoDeUso({
      nombre: 'auth.cambiarEstadoUsuario',
      entrada: CambiarEstadoUsuarioSchema.extend({ id: z.string().uuid(), actor: ActorSchema }),
      salida: UsuarioPublicoSchema,
      async ejecutar({ id, activo, actor }) {
        const objetivo = await usuarios.obtenerPorId(id);
        if (!objetivo) throw new RecursoNoEncontradoError('Usuario', id);
        const actualizado = cambiarEstado(objetivo, {
          activo,
          actorId: actor.id,
          adminsActivos: await usuarios.contarAdministradoresActivos(),
        });
        await usuarios.actualizar(id, { activo });
        if (!activo) await sesiones.eliminarDeUsuario(id); // la cuenta pierde el acceso al instante
        return aUsuarioPublico(actualizado);
      },
    }),

    restablecerPassword: casoDeUso({
      nombre: 'auth.restablecerPassword',
      entrada: RestablecerPasswordSchema.extend({ id: z.string().uuid() }),
      async ejecutar({ id, password }) {
        const objetivo = await usuarios.obtenerPorId(id);
        if (!objetivo) throw new RecursoNoEncontradoError('Usuario', id);
        await usuarios.actualizar(id, { passwordHash: await hasher.hash(password) });
        await sesiones.eliminarDeUsuario(id);
      },
    }),
  };
}
