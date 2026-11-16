import { DomainError } from '../../../shared/domain/errors.js';

export class StockInsuficienteError extends DomainError {
  /** @param {{ materialId: string, requerido: number, disponible: number }[]} faltantes */
  constructor(faltantes) {
    super(`Stock insuficiente para ${faltantes.length} material(es)`, {
      codigo: 'STOCK_INSUFICIENTE',
      detalles: { faltantes },
    });
  }
}

export class MaterialesNoRegistradosError extends DomainError {
  constructor(materialIds) {
    super(`Materiales no registrados en inventario: ${materialIds.join(', ')}`, {
      codigo: 'MATERIAL_NO_REGISTRADO',
      detalles: { materialIds },
    });
  }
}

export class InventarioInvalidoError extends DomainError {
  constructor(mensaje, detalles) {
    super(mensaje, { codigo: 'INVENTARIO_INVALIDO', detalles });
  }
}

export class EntregaInvalidaError extends DomainError {
  constructor(mensaje, detalles) {
    super(mensaje, { codigo: 'ENTREGA_INVALIDA', detalles });
  }
}
