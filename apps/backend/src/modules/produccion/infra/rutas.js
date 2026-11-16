// Adaptador HTTP (Fastify) del módulo de Producción. Solo traduce HTTP <-> casos de uso.
import { requiereUsuario } from '../../../shared/http/usuario.js';

export async function produccionRoutes(fastify, { casosUso }) {
  fastify.post('/ordenes', { preHandler: requiereUsuario }, async (req, reply) => {
    const orden = await casosUso.aprobarOrdenTrabajo({ ...req.body, usuario: req.usuario });
    return reply.code(201).send(orden);
  });

  fastify.get('/ordenes', async (req) => casosUso.listarOrdenes(req.query ?? {}));

  fastify.get('/ordenes/:id', async (req) => casosUso.consultarOrden({ ordenId: req.params.id }));

  fastify.get('/ordenes/:id/historial', async (req) =>
    casosUso.consultarHistorialOrden({ ordenId: req.params.id }),
  );

  fastify.post('/ordenes/:id/transiciones', { preHandler: requiereUsuario }, async (req) =>
    casosUso.cambiarEstadoOrden({ ...req.body, ordenId: req.params.id, usuario: req.usuario }),
  );
}
