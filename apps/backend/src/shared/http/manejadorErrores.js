// Traducción de errores de dominio / contrato a respuestas HTTP.
import { DomainError } from '../domain/errors.js';
import { ContratoInvalidoError } from '../application/validacion.js';

const ESTADO_POR_CODIGO = Object.freeze({
  NO_ENCONTRADO: 404,
  CONFLICTO_CONCURRENCIA: 409,
  TRANSICION_NO_PERMITIDA: 409,
  STOCK_INSUFICIENTE: 409,
  CODIGO_DUPLICADO: 409,
  USUARIO_REQUERIDO: 401,
});

export function manejadorErrores(err, req, reply) {
  if (err instanceof ContratoInvalidoError) {
    // Un contrato de SALIDA inválido es un defecto del servidor, no del cliente.
    if (err.contrato.endsWith(':salida')) {
      req.log.error({ err }, 'Contrato de salida inválido');
      return reply.code(500).send({ error: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' });
    }
    return reply.code(400).send({ error: err.codigo, mensaje: err.message, detalles: err.issues });
  }
  if (err instanceof DomainError) {
    const status = ESTADO_POR_CODIGO[err.codigo] ?? 422;
    return reply.code(status).send({ error: err.codigo, mensaje: err.message, detalles: err.detalles });
  }
  if (err.validation || err.statusCode === 400) {
    return reply.code(400).send({ error: 'SOLICITUD_INVALIDA', mensaje: err.message });
  }
  req.log.error({ err }, 'Error no controlado');
  return reply.code(500).send({ error: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' });
}
