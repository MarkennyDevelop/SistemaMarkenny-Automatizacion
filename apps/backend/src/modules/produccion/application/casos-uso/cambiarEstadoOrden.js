// Caso de uso: transicionar una orden por las fases de control de calidad.
import { casoDeUso } from '../../../../shared/application/validacion.js';
import { RecursoNoEncontradoError, ConflictoConcurrenciaError } from '../../../../shared/domain/errors.js';
import { EVENTOS } from '../../../../shared/events/catalogo.js';
import { transicionar } from '../../domain/ordenStateMachine.js';
import { estaEmpaquetada } from '../../domain/ordenProduccion.js';
import { CambiarEstadoOrdenSchema, OrdenProduccionDTOSchema } from '../../schemas/ordenSchemas.js';
import { aOrdenDTO } from './mapeo.js';

export function crearCambiarEstadoOrden({ ordenRepository, eventBus, reloj }) {
  return casoDeUso({
    nombre: 'produccion.cambiarEstadoOrden',
    entrada: CambiarEstadoOrdenSchema,
    salida: OrdenProduccionDTOSchema,
    async ejecutar({ ordenId, hacia, usuario, motivo, versionEsperada }) {
      const orden = await ordenRepository.obtenerPorId(ordenId);
      if (!orden) throw new RecursoNoEncontradoError('OrdenProduccion', ordenId);
      if (versionEsperada !== undefined && versionEsperada !== orden.version) {
        throw new ConflictoConcurrenciaError('OrdenProduccion', ordenId);
      }

      const nueva = transicionar(orden, { hacia, usuario, motivo, fecha: reloj.ahora() });
      await ordenRepository.actualizar(nueva, orden.version);

      const registro = nueva.historial.at(-1);
      eventBus.publicar(EVENTOS.ORDEN_ESTADO_CAMBIADO, {
        ordenId: nueva.id,
        codigo: nueva.codigo,
        desde: registro.desde,
        hacia: registro.hacia,
        usuario: registro.usuario,
        fecha: registro.fecha,
        motivo: registro.motivo,
      });

      if (estaEmpaquetada(nueva)) {
        eventBus.publicar(EVENTOS.ORDEN_EMPAQUETADA, {
          ordenId: nueva.id,
          codigo: nueva.codigo,
          pedidoId: nueva.pedidoId,
          clienteId: nueva.clienteId,
          tipoProducto: nueva.tipoProducto,
          descripcion: nueva.descripcion,
          cantidad: nueva.cantidad,
          especificacionSello: nueva.especificacionSello,
          usuario: registro.usuario,
          fecha: registro.fecha,
        });
      }

      return aOrdenDTO(nueva);
    },
  });
}
