// Stock específico de almacén: sellos y productos terminados pendientes de
// entrega al cliente. Código de dominio puro.
import { congelarProfundo, aIso } from '../../../shared/domain/inmutable.js';
import { crearUsuarioRef } from '../../../shared/domain/usuario.js';
import { InventarioInvalidoError, EntregaInvalidaError } from './errores.js';

export const TIPOS_PRODUCTO_TERMINADO = Object.freeze({ IMPRESO: 'IMPRESO', SELLO: 'SELLO' });

export const ESTADOS_EXISTENCIA = Object.freeze({
  PENDIENTE_ENTREGA: 'PENDIENTE_ENTREGA',
  ENTREGA_PARCIAL: 'ENTREGA_PARCIAL',
  ENTREGADO: 'ENTREGADO',
});

function estadoSegun(cantidad, cantidadEntregada) {
  if (cantidadEntregada === 0) return ESTADOS_EXISTENCIA.PENDIENTE_ENTREGA;
  if (cantidadEntregada < cantidad) return ESTADOS_EXISTENCIA.ENTREGA_PARCIAL;
  return ESTADOS_EXISTENCIA.ENTREGADO;
}

/** Ingreso al almacén de un lote terminado y empaquetado. */
export function crearExistenciaProductoTerminado({
  id,
  ordenId,
  codigoOrden,
  pedidoId = null,
  clienteId,
  tipoProducto,
  descripcion,
  cantidad,
  especificacionSello = null,
  ubicacion = null,
  usuario,
  fecha,
}) {
  if (!id || !ordenId || !clienteId || !descripcion?.trim() || !codigoOrden) {
    throw new InventarioInvalidoError('La existencia requiere id, orden, código de orden, cliente y descripción');
  }
  if (!Object.hasOwn(TIPOS_PRODUCTO_TERMINADO, tipoProducto)) {
    throw new InventarioInvalidoError(`Tipo de producto terminado inválido: "${tipoProducto}"`);
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new InventarioInvalidoError('La cantidad debe ser un entero positivo', { cantidad });
  }
  if (tipoProducto === TIPOS_PRODUCTO_TERMINADO.SELLO && !especificacionSello?.modelo) {
    throw new InventarioInvalidoError('Un sello en almacén requiere su especificación (modelo)');
  }
  return congelarProfundo({
    id,
    ordenId,
    codigoOrden,
    pedidoId,
    clienteId,
    tipoProducto,
    descripcion: descripcion.trim(),
    especificacionSello: tipoProducto === TIPOS_PRODUCTO_TERMINADO.SELLO ? { ...especificacionSello } : null,
    ubicacion,
    cantidad,
    cantidadEntregada: 0,
    estado: ESTADOS_EXISTENCIA.PENDIENTE_ENTREGA,
    ingresadoPor: crearUsuarioRef(usuario),
    ingresadoEn: aIso(fecha),
    entregas: [],
    version: 1,
  });
}

export function cantidadPendiente(existencia) {
  return existencia.cantidad - existencia.cantidadEntregada;
}

/** Registra una entrega (total o parcial) al cliente. */
export function registrarEntrega(existencia, { cantidad, recibidoPor = null, usuario, fecha }) {
  const pendiente = cantidadPendiente(existencia);
  if (pendiente === 0) {
    throw new EntregaInvalidaError('El producto ya fue entregado en su totalidad', { existenciaId: existencia.id });
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new EntregaInvalidaError('La cantidad a entregar debe ser un entero positivo', { cantidad });
  }
  if (cantidad > pendiente) {
    throw new EntregaInvalidaError(`No se pueden entregar ${cantidad} unidades; pendientes: ${pendiente}`, {
      cantidad,
      pendiente,
    });
  }
  const cantidadEntregada = existencia.cantidadEntregada + cantidad;
  return congelarProfundo({
    ...existencia,
    cantidadEntregada,
    estado: estadoSegun(existencia.cantidad, cantidadEntregada),
    entregas: [
      ...existencia.entregas,
      { cantidad, recibidoPor, usuario: crearUsuarioRef(usuario), fecha: aIso(fecha) },
    ],
    version: existencia.version + 1,
  });
}
