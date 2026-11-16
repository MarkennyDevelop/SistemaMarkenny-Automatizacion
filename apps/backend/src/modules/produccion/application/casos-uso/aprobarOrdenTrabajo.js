// Caso de uso: aprobar una orden de trabajo e iniciar su producción.
//
// Crea la OrdenProduccion en EN_PROCESO (con su primer registro de auditoría),
// la persiste y publica — de forma asíncrona por el EventBus — el evento que
// el módulo de Inventario consume para descontar materias primas.
import { casoDeUso } from '../../../../shared/application/validacion.js';
import { EVENTOS } from '../../../../shared/events/catalogo.js';
import { crearOrdenProduccion } from '../../domain/ordenProduccion.js';
import { AprobarOrdenTrabajoSchema, OrdenProduccionDTOSchema } from '../../schemas/ordenSchemas.js';
import { aOrdenDTO } from './mapeo.js';

export function crearAprobarOrdenTrabajo({ ordenRepository, eventBus, reloj, ids }) {
  return casoDeUso({
    nombre: 'produccion.aprobarOrdenTrabajo',
    entrada: AprobarOrdenTrabajoSchema,
    salida: OrdenProduccionDTOSchema,
    async ejecutar(cmd) {
      const fecha = reloj.ahora();
      const orden = crearOrdenProduccion({
        ...cmd,
        id: ids.generar(),
        codigo: await ordenRepository.siguienteCodigo(fecha.getUTCFullYear()),
        fecha,
      });

      await ordenRepository.crear(orden);

      // Publicar solo después de persistir con éxito.
      const registro = orden.historial[0];
      eventBus.publicar(EVENTOS.ORDEN_TRABAJO_APROBADA, {
        ordenId: orden.id,
        codigo: orden.codigo,
        pedidoId: orden.pedidoId,
        clienteId: orden.clienteId,
        tipoProducto: orden.tipoProducto,
        cantidad: orden.cantidad,
        materiales: orden.materiales,
        aprobadaPor: registro.usuario,
        aprobadaEn: registro.fecha,
      });
      eventBus.publicar(EVENTOS.ORDEN_ESTADO_CAMBIADO, {
        ordenId: orden.id,
        codigo: orden.codigo,
        desde: registro.desde,
        hacia: registro.hacia,
        usuario: registro.usuario,
        fecha: registro.fecha,
        motivo: registro.motivo,
      });

      return aOrdenDTO(orden);
    },
  });
}
