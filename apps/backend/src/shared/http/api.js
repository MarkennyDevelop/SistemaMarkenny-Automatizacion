// Registro de la API a partir de la tabla de endpoints del contrato.
//
// Cada módulo aporta manejadores por nombre de endpoint; este archivo:
//  - comprueba sesión y rol según `roles` del contrato,
//  - valida params, query y body con los esquemas del contrato,
//  - valida la respuesta (nunca sale algo que el contrato no describe),
//  - responde con el estado de éxito declarado (o 204).
// Si un endpoint del contrato no tiene manejador, la app no arranca.
import { ENDPOINTS, PREFIJO_API } from '@markenny/contrato';
import { validarContrato } from '../application/validacion.js';
import { DomainError } from '../domain/errors.js';

export class NoAutenticadoError extends DomainError {
  constructor() {
    super('Inicia sesión para continuar', { codigo: 'NO_AUTENTICADO' });
  }
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Record<string, (ctx: { params?: any, query?: any, body?: any, usuario: any, req: any, reply: any }) => Promise<unknown>>} manejadores
 */
export async function registrarApi(fastify, manejadores) {
  const faltantes = Object.keys(ENDPOINTS).filter((nombre) => typeof manejadores[nombre] !== 'function');
  if (faltantes.length > 0) throw new Error(`Endpoints del contrato sin implementar: ${faltantes.join(', ')}`);
  const sobrantes = Object.keys(manejadores).filter((nombre) => !(nombre in ENDPOINTS));
  if (sobrantes.length > 0) throw new Error(`Manejadores que no están en el contrato: ${sobrantes.join(', ')}`);

  await fastify.register(
    async (api) => {
      for (const [nombre, ep] of Object.entries(ENDPOINTS)) {
        api.route({
          method: ep.metodo,
          url: ep.ruta,
          handler: async (req, reply) => {
            if (ep.roles) {
              if (!req.usuario) throw new NoAutenticadoError();
              if (!ep.roles.includes(req.usuario.rol)) {
                throw new DomainError('Tu rol no tiene acceso a esta operación', { codigo: 'SIN_PERMISO' });
              }
            }
            const ctx = {
              params: ep.params ? validarContrato(ep.params, req.params, `${nombre}:params`) : undefined,
              query: ep.query ? validarContrato(ep.query, req.query ?? {}, `${nombre}:query`) : undefined,
              body: ep.body ? validarContrato(ep.body, req.body ?? {}, `${nombre}:body`) : undefined,
              usuario: req.usuario ?? null,
              req,
              reply,
            };
            const resultado = await manejadores[nombre](ctx);
            if (ep.respuesta === null) return reply.code(204).send();
            const salida = validarContrato(ep.respuesta, resultado, `${nombre}:salida`);
            return reply.code(ep.estadoExito ?? 200).send(salida);
          },
        });
      }
    },
    { prefix: PREFIJO_API },
  );
}
