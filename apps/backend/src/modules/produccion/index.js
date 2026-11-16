// API pública del módulo de Producción (lo único que otros módulos / el
// composition root pueden importar de este módulo).
import { implementaPuerto, PUERTOS } from '../../shared/application/ports.js';
import { ORDEN_PRODUCCION_REPOSITORY_PORT } from './application/ports/ordenProduccionRepositoryPort.js';
import { crearAprobarOrdenTrabajo } from './application/casos-uso/aprobarOrdenTrabajo.js';
import { crearCambiarEstadoOrden } from './application/casos-uso/cambiarEstadoOrden.js';
import {
  crearConsultarOrden,
  crearListarOrdenes,
  crearConsultarHistorialOrden,
} from './application/casos-uso/consultas.js';
import { produccionRoutes } from './infra/rutas.js';

export { ESTADOS_PRODUCCION, FLUJO_PRODUCCION } from './domain/estados.js';
export { InMemoryOrdenRepository } from './infra/inMemoryOrdenRepository.js';
export { PostgresOrdenRepository } from './infra/postgresOrdenRepository.js';

export function crearModuloProduccion({ ordenRepository, eventBus, reloj, ids }) {
  const deps = {
    ordenRepository: implementaPuerto('OrdenProduccionRepository', ORDEN_PRODUCCION_REPOSITORY_PORT, ordenRepository),
    eventBus: implementaPuerto('EventBus', PUERTOS.EventBus, eventBus),
    reloj: implementaPuerto('Clock', PUERTOS.Clock, reloj),
    ids: implementaPuerto('IdGenerator', PUERTOS.IdGenerator, ids),
  };

  const casosUso = Object.freeze({
    aprobarOrdenTrabajo: crearAprobarOrdenTrabajo(deps),
    cambiarEstadoOrden: crearCambiarEstadoOrden(deps),
    consultarOrden: crearConsultarOrden(deps),
    listarOrdenes: crearListarOrdenes(deps),
    consultarHistorialOrden: crearConsultarHistorialOrden(deps),
  });

  /** Plugin Fastify encapsulado: rutas bajo /v1/produccion. */
  async function plugin(fastify) {
    await fastify.register(produccionRoutes, { prefix: '/v1/produccion', casosUso });
  }

  return { casosUso, plugin };
}
