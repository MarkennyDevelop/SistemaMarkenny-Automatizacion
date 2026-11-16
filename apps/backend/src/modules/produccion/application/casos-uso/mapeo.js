import { transicionesDesde } from '../../domain/ordenStateMachine.js';

/** Proyección del agregado hacia el DTO público. */
export function aOrdenDTO(orden) {
  return {
    id: orden.id,
    codigo: orden.codigo,
    pedidoId: orden.pedidoId,
    clienteId: orden.clienteId,
    tipoProducto: orden.tipoProducto,
    descripcion: orden.descripcion,
    cantidad: orden.cantidad,
    materiales: orden.materiales.map((m) => ({ ...m })),
    especificacionSello: orden.especificacionSello ? { ...orden.especificacionSello } : null,
    estado: orden.estado,
    transicionesPermitidas: [...transicionesDesde(orden.estado)],
    version: orden.version,
    creadaEn: orden.creadaEn,
    actualizadaEn: orden.actualizadaEn,
    historial: orden.historial.map((r) => ({ ...r, usuario: { ...r.usuario } })),
  };
}
