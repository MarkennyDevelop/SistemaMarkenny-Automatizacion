import { DomainError } from '../../../shared/domain/errors.js';

export class EstadoDesconocidoError extends DomainError {
  constructor(estado) {
    super(`Estado de producción desconocido: "${estado}"`, { codigo: 'ESTADO_DESCONOCIDO', detalles: { estado } });
  }
}

export class TransicionNoPermitidaError extends DomainError {
  constructor(desde, hacia, permitidas) {
    const sufijo =
      permitidas.length === 0
        ? `"${desde}" es un estado terminal`
        : `desde "${desde}" solo se permite: ${permitidas.join(', ')}`;
    super(`Transición no permitida de "${desde}" a "${hacia}"; ${sufijo}`, {
      codigo: 'TRANSICION_NO_PERMITIDA',
      detalles: { desde, hacia, permitidas: [...permitidas] },
    });
  }
}

export class MotivoRequeridoError extends DomainError {
  constructor(desde, hacia) {
    super(`La transición de "${desde}" a "${hacia}" requiere indicar un motivo`, {
      codigo: 'MOTIVO_REQUERIDO',
      detalles: { desde, hacia },
    });
  }
}

export class FechaAuditoriaInvalidaError extends DomainError {
  constructor(fecha, ultima) {
    super(`La fecha de la transición (${fecha}) es anterior al último registro de auditoría (${ultima})`, {
      codigo: 'FECHA_AUDITORIA_INVALIDA',
      detalles: { fecha, ultima },
    });
  }
}

export class OrdenInvalidaError extends DomainError {
  constructor(mensaje, detalles) {
    super(mensaje, { codigo: 'ORDEN_INVALIDA', detalles });
  }
}
