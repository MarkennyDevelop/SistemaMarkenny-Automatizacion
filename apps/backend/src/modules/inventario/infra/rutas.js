// Adaptador HTTP (Fastify) del módulo de Inventario.
import { requiereUsuario } from '../../../shared/http/usuario.js';

export async function inventarioRoutes(fastify, { casosUso }) {
  // Materias primas
  fastify.post('/materiales', { preHandler: requiereUsuario }, async (req, reply) =>
    reply.code(201).send(await casosUso.crearMaterial({ ...req.body, usuario: req.usuario })),
  );
  fastify.get('/materiales', async (req) => casosUso.listarMateriales(req.query ?? {}));
  fastify.post('/materiales/:id/entradas', { preHandler: requiereUsuario }, async (req) =>
    casosUso.registrarEntradaMaterial({ ...req.body, materialId: req.params.id, usuario: req.usuario }),
  );
  fastify.get('/materiales/:id/movimientos', async (req) =>
    casosUso.listarMovimientosMaterial({ materialId: req.params.id }),
  );

  // Stock específico: sellos / productos terminados pendientes de entrega
  fastify.get('/productos-terminados/pendientes', async (req) => casosUso.listarPendientesEntrega(req.query ?? {}));
  fastify.post('/productos-terminados/:id/entregas', { preHandler: requiereUsuario }, async (req) =>
    casosUso.registrarEntregaProductoTerminado({ ...req.body, existenciaId: req.params.id, usuario: req.usuario }),
  );
}
