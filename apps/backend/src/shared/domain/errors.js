// Errores del dominio. Código puro. `codigo` coincide con el catálogo ERRORES
// del contrato, que define el estado HTTP de cada uno.

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
    super(`${recurso} no encontrado`, { codigo: 'NO_ENCONTRADO', detalles: { recurso, id } });
  }
}

/** Otro proceso modificó el registro entre la lectura y la escritura (bloqueo optimista). */
export class ConflictoConcurrenciaError extends DomainError {
  constructor(recurso, id) {
    super(`${recurso} fue modificado por otra persona; actualiza y vuelve a intentarlo`, {
      codigo: 'CONFLICTO_CONCURRENCIA',
      detalles: { recurso, id },
    });
  }
}
