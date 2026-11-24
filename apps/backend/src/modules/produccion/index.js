// API pública del módulo de Producción.
import { PREFIJO_API, SSE_PRODUCCION } from '@markenny/contrato';
import { implementaPuerto, PUERTOS } from '../../shared/application/ports.js';
import { actorDe } from '../../shared/application/actor.js';
import { EVENTOS } from '../../shared/events/catalogo.js';
import { ORDEN_REPOSITORY_PORT, crearCasosUsoProduccion } from './application/casosUso.js';

export { OrdenRepositoryMemoria, OrdenRepositoryPostgres } from './infra/repositorios.js';

const LATIDO_MS = 25_000;

export function crearModuloProduccion({ ordenes, eventBus, reloj, ids, obtenerCliente, logger }) {
  const casosUso = crearCasosUsoProduccion({
    ordenes: implementaPuerto('OrdenRepository', ORDEN_REPOSITORY_PORT, ordenes),
    eventBus: implementaPuerto('EventBus', PUERTOS.EventBus, eventBus),
    reloj: implementaPuerto('Clock', PUERTOS.Clock, reloj),
    ids: implementaPuerto('IdGenerator', PUERTOS.IdGenerator, ids),
    obtenerCliente,
  });

  // Almacén registra una entrega -> la orden refleja su estado de entrega.
  const desuscribir = eventBus.suscribir(EVENTOS.PRODUCTO_ENTREGADO, async ({ payload }) => {
    if (payload.ordenId) await casosUso.actualizarEstadoEntrega(payload);
  });

  const manejadores = {
    listarOrdenes: ({ query, usuario }) => casosUso.listarOrdenes({ ...query, actor: actorDe(usuario) }),
    obtenerOrden: ({ params, usuario }) => casosUso.obtenerOrden({ id: params.id, actor: actorDe(usuario) }),
    crearOrden: ({ body, usuario }) => casosUso.crearOrden({ ...body, actor: actorDe(usuario) }),
    cambiarFaseOrden: ({ params, body, usuario }) =>
      casosUso.cambiarFase({ id: params.id, ...body, actor: actorDe(usuario) }),
    agregarNotaOrden: ({ params, body, usuario }) =>
      casosUso.agregarNota({ id: params.id, ...body, actor: actorDe(usuario) }),
  };

  /**
   * Flujo en tiempo real (Server-Sent Events) para el tablero de planta y el
   * seguimiento del vendedor. Un vendedor solo recibe sus órdenes.
   */
  async function rutasTiempoReal(fastify) {
    fastify.get(PREFIJO_API + SSE_PRODUCCION.ruta, (req, reply) => {
      const usuario = req.usuario;
      if (!usuario) {
        return reply.code(401).send({ error: 'NO_AUTENTICADO', mensaje: 'Inicia sesión para continuar' });
      }
      reply.hijack();
      const res = reply.raw;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(': conectado\n\n');

      const enviar = ({ payload }) => {
        if (usuario.rol === 'VENDEDOR' && payload.vendedorId !== usuario.id) return;
        const datos = {
          ordenId: payload.ordenId,
          codigo: payload.codigo,
          fase: payload.fase,
          anterior: payload.anterior,
          version: payload.version,
          usuario: payload.actor.nombre,
          fecha: payload.fecha,
        };
        res.write(`event: ${SSE_PRODUCCION.evento}\ndata: ${JSON.stringify(datos)}\n\n`);
      };
      const quitar = eventBus.suscribir(EVENTOS.ORDEN_ACTUALIZADA, enviar);
      const latido = setInterval(() => res.write(': latido\n\n'), LATIDO_MS);
      req.raw.on('close', () => {
        clearInterval(latido);
        quitar();
        logger?.debug?.({ usuario: usuario.id }, 'SSE cerrado');
      });
    });
  }

  return {
    casosUso,
    manejadores,
    rutasTiempoReal,
    desuscribir,
    /** Interfaz pública para Ventas. */
    resumenPorCliente: casosUso.resumenPorCliente,
    /** Interfaz pública para Inventario (almacén de producto terminado). */
    fasesDeOrdenes: casosUso.fasesDeOrdenes,
  };
}
