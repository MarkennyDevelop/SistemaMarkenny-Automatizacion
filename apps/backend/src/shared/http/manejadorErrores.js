// Traducción de errores a respuestas HTTP con el formato del contrato:
// { error: CODIGO, mensaje, detalles? }. El estado sale del catálogo ERRORES.
import { ERRORES } from '@markenny/contrato';
import { DomainError } from '../domain/errors.js';
import { ContratoInvalidoError } from '../application/validacion.js';

export function manejadorErrores(err, req, reply) {
  if (err instanceof ContratoInvalidoError) {
    // Una respuesta que no cumple el contrato es un defecto del servidor.
    if (err.contrato.endsWith(':salida')) {
      req.log.error({ err, issues: err.issues }, 'Respuesta fuera del contrato');
      return reply.code(500).send({ error: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' });
    }
    return reply.code(400).send({ error: err.codigo, mensaje: 'Revisa los datos enviados', detalles: err.issues });
  }
  if (err instanceof DomainError) {
    const estado = ERRORES[err.codigo] ?? 422;
    return reply.code(estado).send({ error: err.codigo, mensaje: err.message, detalles: err.detalles });
  }
  // Límite de peticiones (@fastify/rate-limit).
  if (err.statusCode === 429) {
    return reply.code(429).send({ error: 'DEMASIADOS_INTENTOS', mensaje: err.mensaje ?? 'Demasiadas peticiones. Espera un momento.' });
  }
  // Errores de Fastify antes del handler (JSON malformado, cuerpo demasiado grande...).
  if (err.statusCode && err.statusCode < 500) {
    return reply.code(err.statusCode).send({ error: 'CONTRATO_INVALIDO', mensaje: err.message });
  }
  req.log.error({ err }, 'Error no controlado');
  return reply.code(500).send({ error: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' });
}
