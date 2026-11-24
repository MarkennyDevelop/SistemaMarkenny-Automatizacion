// API pública del módulo de Inventario.
import { implementaPuerto, PUERTOS } from '../../shared/application/ports.js';
import { actorDe } from '../../shared/application/actor.js';
import { DomainError } from '../../shared/domain/errors.js';
import { EVENTOS } from '../../shared/events/catalogo.js';
import {
  MATERIAL_REPOSITORY_PORT,
  PRODUCTO_REPOSITORY_PORT,
  crearCasosUsoInventario,
} from './application/casosUso.js';

export {
  MaterialRepositoryMemoria,
  MaterialRepositoryPostgres,
  ProductoTerminadoRepositoryMemoria,
  ProductoTerminadoRepositoryPostgres,
} from './infra/repositorios.js';

const loggerNulo = { info() {}, warn() {}, error() {} };

/**
 * @param {object} deps
 * @param {(ids: string[]) => Promise<Map<string, string>>} deps.fasesDeOrdenes
 *   Fase actual de las órdenes (interfaz pública de Producción).
 */
export function crearModuloInventario({ materiales, productos, eventBus, reloj, ids, fasesDeOrdenes, logger = loggerNulo }) {
  if (typeof fasesDeOrdenes !== 'function') throw new TypeError('Inventario necesita fasesDeOrdenes de Producción');
  const casosUso = crearCasosUsoInventario({
    fasesDeOrdenes,
    materiales: implementaPuerto('MaterialRepository', MATERIAL_REPOSITORY_PORT, materiales),
    productos: implementaPuerto('ProductoTerminadoRepository', PRODUCTO_REPOSITORY_PORT, productos),
    eventBus: implementaPuerto('EventBus', PUERTOS.EventBus, eventBus),
    reloj: implementaPuerto('Clock', PUERTOS.Clock, reloj),
    ids: implementaPuerto('IdGenerator', PUERTOS.IdGenerator, ids),
  });

  const suscripciones = [
    // Orden creada -> descuento de materias primas (si la ficha las indica).
    eventBus.suscribir(EVENTOS.ORDEN_CREADA, async ({ payload }) => {
      try {
        await casosUso.descontarMaterialesOrden(payload);
      } catch (err) {
        if (!(err instanceof DomainError)) throw err;
        logger.warn({ ordenId: payload.ordenId, codigo: err.codigo }, 'No se pudieron descontar materiales');
        eventBus.publicar(EVENTOS.DESCUENTO_MATERIALES_FALLIDO, {
          ordenId: payload.ordenId,
          codigoError: err.codigo,
          mensaje: err.message,
          detalles: err.detalles,
        });
      }
    }),
    // Orden empaquetada -> ingresa al almacén pendiente de entrega.
    eventBus.suscribir(EVENTOS.ORDEN_EMPAQUETADA, ({ payload }) => casosUso.ingresarProductoTerminado(payload)),
  ];

  const manejadores = {
    listarMateriales: ({ query }) => casosUso.listarMateriales(query),
    disponibilidadInventario: () => casosUso.disponibilidad({}),
    crearMaterial: ({ body }) => casosUso.crearMaterial(body),
    configurarConsumoMaterial: ({ params, body }) => casosUso.configurarConsumoMaterial({ id: params.id, ...body }),
    listarMovimientos: ({ query }) => casosUso.listarMovimientos(query),
    registrarMovimiento: ({ body, usuario }) => casosUso.registrarMovimiento({ ...body, actor: actorDe(usuario) }),
    listarProductosTerminados: ({ query }) => casosUso.listarProductosTerminados(query),
    registrarEntrega: ({ params, body, usuario }) =>
      casosUso.registrarEntrega({ id: params.id, ...body, actor: actorDe(usuario) }),
  };

  return {
    casosUso,
    manejadores,
    desuscribir: () => suscripciones.forEach((quitar) => quitar()),
    /** Interfaz pública para Producción: consumo del sustrato de una orden. */
    sustratos: {
      calcular: casosUso.calcularConsumoSustrato,
      descontar: casosUso.descontarMaterialesOrden,
    },
  };
}
