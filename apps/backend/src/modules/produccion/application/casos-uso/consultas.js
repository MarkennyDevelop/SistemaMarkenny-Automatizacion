// Casos de uso de lectura del módulo de Producción.
import { casoDeUso } from '../../../../shared/application/validacion.js';
import { RecursoNoEncontradoError } from '../../../../shared/domain/errors.js';
import { z } from 'zod';
import {
  ConsultarOrdenSchema,
  ListarOrdenesSchema,
  OrdenProduccionDTOSchema,
  HistorialOrdenDTOSchema,
} from '../../schemas/ordenSchemas.js';
import { aOrdenDTO } from './mapeo.js';

export function crearConsultarOrden({ ordenRepository }) {
  return casoDeUso({
    nombre: 'produccion.consultarOrden',
    entrada: ConsultarOrdenSchema,
    salida: OrdenProduccionDTOSchema,
    async ejecutar({ ordenId }) {
      const orden = await ordenRepository.obtenerPorId(ordenId);
      if (!orden) throw new RecursoNoEncontradoError('OrdenProduccion', ordenId);
      return aOrdenDTO(orden);
    },
  });
}

export function crearListarOrdenes({ ordenRepository }) {
  return casoDeUso({
    nombre: 'produccion.listarOrdenes',
    entrada: ListarOrdenesSchema,
    salida: z.array(OrdenProduccionDTOSchema),
    async ejecutar(filtro) {
      const ordenes = await ordenRepository.listar(filtro);
      return ordenes.map(aOrdenDTO);
    },
  });
}

/** Auditoría: quién movió la orden, de qué estado a cuál y cuándo. */
export function crearConsultarHistorialOrden({ ordenRepository }) {
  return casoDeUso({
    nombre: 'produccion.consultarHistorialOrden',
    entrada: ConsultarOrdenSchema,
    salida: HistorialOrdenDTOSchema,
    async ejecutar({ ordenId }) {
      const orden = await ordenRepository.obtenerPorId(ordenId);
      if (!orden) throw new RecursoNoEncontradoError('OrdenProduccion', ordenId);
      return {
        ordenId: orden.id,
        codigo: orden.codigo,
        estadoActual: orden.estado,
        historial: orden.historial.map((r) => ({ ...r, usuario: { ...r.usuario } })),
      };
    },
  });
}
