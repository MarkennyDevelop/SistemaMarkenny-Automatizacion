// Composition root: construye la aplicación cableando puertos con adaptadores.
import Fastify from 'fastify';
import { NodeEventBus } from './shared/events/eventBus.js';
import { relojSistema, generadorUuid } from './shared/infra/sistema.js';
import { manejadorErrores } from './shared/http/manejadorErrores.js';
import { registrarApi } from './shared/http/api.js';
import { sesionPlugin } from './shared/http/sesion.js';
import { seguridadPlugin } from './shared/http/seguridad.js';
import { crearPool } from './shared/db/pool.js';
import {
  crearModuloAuth,
  crearHasherScrypt,
  tokensSesion,
  UsuarioRepositoryMemoria,
  UsuarioRepositoryPostgres,
  SesionRepositoryMemoria,
  SesionRepositoryPostgres,
} from './modules/auth/index.js';
import { crearModuloVentas, ClienteRepositoryMemoria, ClienteRepositoryPostgres } from './modules/ventas/index.js';
import { crearModuloProduccion, OrdenRepositoryMemoria, OrdenRepositoryPostgres } from './modules/produccion/index.js';
import {
  crearModuloInventario,
  MaterialRepositoryMemoria,
  MaterialRepositoryPostgres,
  ProductoTerminadoRepositoryMemoria,
  ProductoTerminadoRepositoryPostgres,
} from './modules/inventario/index.js';
import {
  crearModuloNotificaciones,
  NotificacionRepositoryMemoria,
  NotificacionRepositoryPostgres,
} from './modules/notificaciones/index.js';

function crearRepositorios(pool) {
  if (pool) {
    return {
      usuarios: new UsuarioRepositoryPostgres(pool),
      sesiones: new SesionRepositoryPostgres(pool),
      clientes: new ClienteRepositoryPostgres(pool),
      ordenes: new OrdenRepositoryPostgres(pool),
      materiales: new MaterialRepositoryPostgres(pool),
      productos: new ProductoTerminadoRepositoryPostgres(pool),
      notificaciones: new NotificacionRepositoryPostgres(pool),
    };
  }
  const usuarios = new UsuarioRepositoryMemoria();
  return {
    usuarios,
    sesiones: new SesionRepositoryMemoria(usuarios),
    clientes: new ClienteRepositoryMemoria(),
    ordenes: new OrdenRepositoryMemoria(),
    materiales: new MaterialRepositoryMemoria(),
    productos: new ProductoTerminadoRepositoryMemoria(),
    notificaciones: new NotificacionRepositoryMemoria(),
  };
}

/**
 * @param {{ config: object, overrides?: object }} opciones
 *   `overrides` permite a las pruebas inyectar pool, reloj, ids, hasher, etc.
 */
export async function construirApp({ config, overrides = {} }) {
  const fastify = Fastify({
    logger:
      config.LOG_LEVEL === 'silent'
        ? false
        : {
            level: config.LOG_LEVEL,
            // Nunca registrar cookies de sesión ni contraseñas en los logs.
            redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body.password'],
          },
    bodyLimit: 256 * 1024,
    trustProxy: config.TRUST_PROXY ?? false,
  });

  const pool = overrides.pool ?? (config.DATABASE_URL ? crearPool({ connectionString: config.DATABASE_URL }) : null);
  const reloj = overrides.reloj ?? relojSistema;
  const ids = overrides.ids ?? generadorUuid;
  const logger = fastify.log;
  const eventBus = overrides.eventBus ?? new NodeEventBus({ logger, reloj });
  const repos = { ...crearRepositorios(pool), ...overrides.repositorios };

  const auth = crearModuloAuth({
    usuarios: repos.usuarios,
    sesiones: repos.sesiones,
    hasher: overrides.hasher ?? crearHasherScrypt(),
    tokens: tokensSesion,
    reloj,
    ids,
    duracionSesionHoras: config.SESION_HORAS ?? 12,
  });

  // Ventas y Producción se consultan entre sí solo por sus interfaces públicas.
  // Se enlazan de forma diferida porque cada una necesita a la otra.
  let produccion;
  const ventas = crearModuloVentas({
    clientes: repos.clientes,
    reloj,
    ids,
    resumenOrdenes: () => produccion.resumenPorCliente(),
  });
  produccion = crearModuloProduccion({
    ordenes: repos.ordenes,
    eventBus,
    reloj,
    ids,
    obtenerCliente: (id) => ventas.casosUso.obtenerCliente(id),
    logger,
  });
  const inventario = crearModuloInventario({
    materiales: repos.materiales,
    productos: repos.productos,
    eventBus,
    reloj,
    ids,
    fasesDeOrdenes: (ordenIds) => produccion.fasesDeOrdenes(ordenIds),
    logger,
  });
  const notificaciones = crearModuloNotificaciones({ notificaciones: repos.notificaciones, eventBus, reloj, ids });

  fastify.setErrorHandler(manejadorErrores);
  await fastify.register(seguridadPlugin, {
    produccion: config.NODE_ENV === 'production',
    origenesPermitidos: config.ORIGENES_PERMITIDOS ?? [],
    limiteGlobal: config.LIMITE_PETICIONES_MINUTO ?? 600,
  });
  await fastify.register(sesionPlugin, {
    resolverSesion: auth.resolverSesion,
    cookieSegura: config.COOKIE_SEGURA ?? false,
    duracionHoras: config.SESION_HORAS ?? 12,
  });
  fastify.get('/salud', async () => ({ estado: 'ok', persistencia: pool ? 'postgres' : 'memoria' }));

  await registrarApi(fastify, {
    ...auth.manejadores,
    ...ventas.manejadores,
    ...produccion.manejadores,
    ...inventario.manejadores,
    ...notificaciones.manejadores,
  });
  await fastify.register(produccion.rutasTiempoReal);

  fastify.addHook('onClose', async () => {
    produccion.desuscribir();
    inventario.desuscribir();
    notificaciones.desuscribir();
    await eventBus.esperarInactividad?.();
    if (pool && !overrides.pool) await pool.end();
  });

  fastify.decorate('modulos', { auth, ventas, produccion, inventario, notificaciones });
  fastify.decorate('eventBus', eventBus);
  return fastify;
}
