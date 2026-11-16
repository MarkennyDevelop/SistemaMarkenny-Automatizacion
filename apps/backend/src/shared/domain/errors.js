// Errores base del dominio. Código puro: sin dependencias de infraestructura.

/** Error de regla de negocio. `codigo` es estable y apto para mapear a HTTP. */
export class DomainError extends Error {
  constructor(mensaje, { codigo = 'REGLA_NEGOCIO', detalles } = {}) {
    super(mensaje);
    this.name = new.target.name;
    this.codigo = codigo;
    if (detalles !== undefined) this.detalles = detalles;
  }
}

export class RecursoNoEncontradoError extends DomainError {
  constructor(recurso, id) {
    super(`${recurso} con id "${id}" no existe`, { codigo: 'NO_ENCONTRADO', detalles: { recurso, id } });
  }
}

/** Otro proceso modificó el agregado entre la lectura y la escritura (bloqueo optimista). */
export class ConflictoConcurrenciaError extends DomainError {
  constructor(recurso, id) {
    super(`${recurso} "${id}" fue modificado por otro proceso; reintente la operación`, {
      codigo: 'CONFLICTO_CONCURRENCIA',
      detalles: { recurso, id },
    });
  }
}
