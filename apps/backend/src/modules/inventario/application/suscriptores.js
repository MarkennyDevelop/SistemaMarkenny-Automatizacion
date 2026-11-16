// Manejadores de eventos de integración consumidos por el módulo de Inventario.
import { EVENTOS, PAYLOADS } from '../../../shared/events/catalogo.js';
import { DomainError } from '../../../shared/domain/errors.js';

/**
 * Conecta los casos de uso de Inventario a los eventos de Producción.
 * @returns {() => void} función para desuscribir todo (apagado ordenado / pruebas).
 */
export function registrarSuscriptoresInventario({ eventBus, casosUso, logger }) {
  const desuscribir = [
    // Orden aprobada -> descontar materias primas.
    eventBus.suscribir(EVENTOS.ORDEN_TRABAJO_APROBADA, async ({ payload }) => {
      const datos = PAYLOADS[EVENTOS.ORDEN_TRABAJO_APROBADA].parse(payload);
      try {
        await casosUso.descontarMaterialesOrden({
          ordenId: datos.ordenId,
          materiales: datos.materiales,
          usuario: datos.aprobadaPor,
        });
      } catch (err) {
        if (!(err instanceof DomainError)) throw err; // errores técnicos: los registra el bus
        logger.warn({ ordenId: datos.ordenId, codigo: err.codigo }, 'No se pudieron descontar materiales');
        eventBus.publicar(EVENTOS.DESCUENTO_MATERIALES_FALLIDO, {
          ordenId: datos.ordenId,
          codigoError: err.codigo,
          mensaje: err.message,
          detalles: err.detalles,
        });
      }
    }),

    // Orden empaquetada -> ingresa al almacén como pendiente de entrega.
    eventBus.suscribir(EVENTOS.ORDEN_EMPAQUETADA, async ({ payload }) => {
      const datos = PAYLOADS[EVENTOS.ORDEN_EMPAQUETADA].parse(payload);
      await casosUso.registrarIngresoProductoTerminado({
        ordenId: datos.ordenId,
        codigoOrden: datos.codigo,
        pedidoId: datos.pedidoId,
        clienteId: datos.clienteId,
        tipoProducto: datos.tipoProducto,
        descripcion: datos.descripcion,
        cantidad: datos.cantidad,
        especificacionSello: datos.especificacionSello,
        usuario: datos.usuario,
      });
    }),
  ];
  return () => desuscribir.forEach((d) => d());
}
