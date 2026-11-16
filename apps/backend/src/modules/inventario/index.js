// API pública del módulo de Inventario.
import { implementaPuerto, PUERTOS } from '../../shared/application/ports.js';
import { MATERIAL_REPOSITORY_PORT, PRODUCTO_TERMINADO_REPOSITORY_PORT } from './application/ports/repositorios.js';
import {
  crearCrearMaterial,
  crearRegistrarEntradaMaterial,
  crearDescontarMaterialesOrden,
  crearListarMateriales,
  crearListarMovimientosMaterial,
} from './application/casos-uso/materiales.js';
import {
  crearRegistrarIngresoProductoTerminado,
  crearRegistrarEntregaProductoTerminado,
  crearListarPendientesEntrega,
} from './application/casos-uso/productosTerminados.js';
import { registrarSuscriptoresInventario } from './application/suscriptores.js';
import { inventarioRoutes } from './infra/rutas.js';

export { InMemoryMaterialRepository, InMemoryProductoTerminadoRepository } from './infra/inMemoryRepositorios.js';
export { PostgresMaterialRepository, PostgresProductoTerminadoRepository } from './infra/postgresRepositorios.js';

const loggerNulo = { info() {}, warn() {}, error() {} };

export function crearModuloInventario({
  materialRepository,
  productoTerminadoRepository,
  eventBus,
  reloj,
  ids,
  logger = loggerNulo,
}) {
  const deps = {
    materialRepository: implementaPuerto('MaterialRepository', MATERIAL_REPOSITORY_PORT, materialRepository),
    productoTerminadoRepository: implementaPuerto(
      'ProductoTerminadoRepository',
      PRODUCTO_TERMINADO_REPOSITORY_PORT,
      productoTerminadoRepository,
    ),
    eventBus: implementaPuerto('EventBus', PUERTOS.EventBus, eventBus),
    reloj: implementaPuerto('Clock', PUERTOS.Clock, reloj),
    ids: implementaPuerto('IdGenerator', PUERTOS.IdGenerator, ids),
  };

  const casosUso = Object.freeze({
    crearMaterial: crearCrearMaterial(deps),
    registrarEntradaMaterial: crearRegistrarEntradaMaterial(deps),
    descontarMaterialesOrden: crearDescontarMaterialesOrden(deps),
    listarMateriales: crearListarMateriales(deps),
    listarMovimientosMaterial: crearListarMovimientosMaterial(deps),
    registrarIngresoProductoTerminado: crearRegistrarIngresoProductoTerminado(deps),
    registrarEntregaProductoTerminado: crearRegistrarEntregaProductoTerminado(deps),
    listarPendientesEntrega: crearListarPendientesEntrega(deps),
  });

  const desuscribir = registrarSuscriptoresInventario({ eventBus, casosUso, logger });

  async function plugin(fastify) {
    await fastify.register(inventarioRoutes, { prefix: '/v1/inventario', casosUso });
  }

  return { casosUso, plugin, desuscribir };
}
