// Composition root: construye la aplicación cableando puertos con adaptadores.
import Fastify from 'fastify';
import { NodeEventBus } from './shared/events/eventBus.js';
import { relojSistema, generadorUuid } from './shared/infra/sistema.js';
import { usuarioPlugin } from './shared/http/usuario.js';
import { manejadorErrores } from './shared/http/manejadorErrores.js';
import { crearPool } from './shared/db/pool.js';
import { crearModuloProduccion, InMemoryOrdenRepository, PostgresOrdenRepository } from './modules/produccion/index.js';
import {
  crearModuloInventario,
  InMemoryMaterialRepository,
  InMemoryProductoTerminadoRepository,
  PostgresMaterialRepository,
  PostgresProductoTerminadoRepository,
} from './modules/inventario/index.js';
import { crearModuloVentas } from './modules/ventas/index.js';

function crearRepositorios(pool) {
  if (pool) {
    return {
      ordenRepository: new PostgresOrdenRepository(pool),
      materialRepository: new PostgresMaterialRepository(pool),
      productoTerminadoRepository: new PostgresProductoTerminadoRepository(pool),
    };
  }
  return {
    ordenRepository: new InMemoryOrdenRepository(),
    materialRepository: new InMemoryMaterialRepository(),
    productoTerminadoRepository: new InMemoryProductoTerminadoRepository(),
  };
}

/**
 * @param {{ config: object, overrides?: object }} opciones
 *   `overrides` permite a las pruebas inyectar reloj, ids, repositorios, etc.
 */
export async function construirApp({ config, overrides = {} }) {
  const fastify = Fastify({ logger: config.LOG_LEVEL === 'silent' ? false : { level: config.LOG_LEVEL } });

  const pool = overrides.pool ?? (config.DATABASE_URL ? crearPool({ connectionString: config.DATABASE_URL }) : null);
  const reloj = overrides.reloj ?? relojSistema;
  const ids = overrides.ids ?? generadorUuid;
  const logger = fastify.log;
  const eventBus = overrides.eventBus ?? new NodeEventBus({ logger, reloj });
  const repos = { ...crearRepositorios(pool), ...overrides.repositorios };

  const produccion = crearModuloProduccion({ ordenRepository: repos.ordenRepository, eventBus, reloj, ids });
  const inventario = crearModuloInventario({
    materialRepository: repos.materialRepository,
    productoTerminadoRepository: repos.productoTerminadoRepository,
    eventBus,
    reloj,
    ids,
    logger,
  });
  const ventas = crearModuloVentas();

  fastify.setErrorHandler(manejadorErrores);
  await fastify.register(usuarioPlugin);
  fastify.get('/salud', async () => ({ estado: 'ok', persistencia: pool ? 'postgres' : 'memoria' }));

  await fastify.register(ventas.plugin);
  await fastify.register(produccion.plugin);
  await fastify.register(inventario.plugin);

  fastify.addHook('onClose', async () => {
    inventario.desuscribir();
    await eventBus.esperarInactividad?.();
    if (pool && !overrides.pool) await pool.end();
  });

  fastify.decorate('modulos', { produccion, inventario, ventas });
  fastify.decorate('eventBus', eventBus);
  return fastify;
}
