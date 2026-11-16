// Agregado OrdenProduccion. Código de dominio puro.
import { congelarProfundo, aIso } from '../../../shared/domain/inmutable.js';
import { ESTADO_INICIAL, ESTADOS_PRODUCCION } from './estados.js';
import { crearRegistroAuditoria } from './ordenStateMachine.js';
import { OrdenInvalidaError } from './errores.js';

export const TIPOS_PRODUCTO = Object.freeze({ IMPRESO: 'IMPRESO', SELLO: 'SELLO' });

function invariante(condicion, mensaje, detalles) {
  if (!condicion) throw new OrdenInvalidaError(mensaje, detalles);
}

/**
 * Crea una orden de producción a partir de una orden de trabajo aprobada.
 * La orden nace en EN_PROCESO con el primer registro de auditoría.
 */
export function crearOrdenProduccion({
  id,
  codigo,
  pedidoId = null,
  clienteId,
  tipoProducto,
  descripcion,
  cantidad,
  materiales = [],
  especificacionSello = null,
  usuario,
  fecha,
}) {
  invariante(typeof id === 'string' && id.length > 0, 'La orden requiere un id');
  invariante(typeof codigo === 'string' && codigo.trim().length > 0, 'La orden requiere un código');
  invariante(typeof clienteId === 'string' && clienteId.length > 0, 'La orden debe tener un cliente asignado');
  invariante(Object.hasOwn(TIPOS_PRODUCTO, tipoProducto), `Tipo de producto inválido: "${tipoProducto}"`);
  invariante(typeof descripcion === 'string' && descripcion.trim().length > 0, 'La orden requiere una descripción');
  invariante(Number.isInteger(cantidad) && cantidad > 0, 'La cantidad debe ser un entero positivo', { cantidad });

  if (tipoProducto === TIPOS_PRODUCTO.SELLO) {
    invariante(especificacionSello?.modelo, 'Una orden de sello requiere la especificación del sello (modelo)');
  } else {
    invariante(especificacionSello == null, 'Solo las órdenes de tipo SELLO llevan especificación de sello');
  }

  const vistos = new Set();
  for (const m of materiales) {
    invariante(typeof m.materialId === 'string' && m.materialId.length > 0, 'Material sin identificador', m);
    invariante(typeof m.cantidad === 'number' && m.cantidad > 0, 'La cantidad de material debe ser positiva', m);
    invariante(!vistos.has(m.materialId), `Material repetido en la orden: ${m.materialId}`, m);
    vistos.add(m.materialId);
  }

  const registroInicial = crearRegistroAuditoria({
    secuencia: 1,
    desde: null,
    hacia: ESTADO_INICIAL,
    usuario,
    fecha,
    motivo: 'Orden de trabajo aprobada',
  });

  return congelarProfundo({
    id,
    codigo: codigo.trim(),
    pedidoId,
    clienteId,
    tipoProducto,
    descripcion: descripcion.trim(),
    cantidad,
    materiales: materiales.map(({ materialId, cantidad: c }) => ({ materialId, cantidad: c })),
    especificacionSello: especificacionSello ? { ...especificacionSello } : null,
    estado: ESTADO_INICIAL,
    version: 1,
    creadaEn: aIso(fecha),
    actualizadaEn: registroInicial.fecha,
    historial: [registroInicial],
  });
}

export function estaEmpaquetada(orden) {
  return orden.estado === ESTADOS_PRODUCCION.EMPAQUETADO;
}
