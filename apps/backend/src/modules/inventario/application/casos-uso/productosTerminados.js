// Casos de uso del stock específico: sellos y productos terminados en almacén
// pendientes de entrega.
import { z } from 'zod';
import { casoDeUso } from '../../../../shared/application/validacion.js';
import { RecursoNoEncontradoError } from '../../../../shared/domain/errors.js';
import {
  crearExistenciaProductoTerminado,
  registrarEntrega,
  cantidadPendiente,
} from '../../domain/productoTerminado.js';
import {
  RegistrarIngresoProductoTerminadoSchema,
  RegistrarEntregaSchema,
  ListarPendientesSchema,
  ExistenciaDTOSchema,
} from '../../schemas/inventarioSchemas.js';

const aExistenciaDTO = (e) => ({
  ...e,
  especificacionSello: e.especificacionSello ? { ...e.especificacionSello } : null,
  ingresadoPor: { ...e.ingresadoPor },
  entregas: e.entregas.map((x) => ({ ...x, usuario: { ...x.usuario } })),
  cantidadPendiente: cantidadPendiente(e),
});

/** Ingresa al almacén el lote de una orden empaquetada. Idempotente por orden. */
export function crearRegistrarIngresoProductoTerminado({ productoTerminadoRepository, reloj, ids }) {
  return casoDeUso({
    nombre: 'inventario.registrarIngresoProductoTerminado',
    entrada: RegistrarIngresoProductoTerminadoSchema,
    salida: ExistenciaDTOSchema,
    async ejecutar(cmd) {
      const existente = await productoTerminadoRepository.obtenerPorOrdenId(cmd.ordenId);
      if (existente) return aExistenciaDTO(existente);
      const existencia = crearExistenciaProductoTerminado({ ...cmd, id: ids.generar(), fecha: reloj.ahora() });
      await productoTerminadoRepository.crear(existencia);
      return aExistenciaDTO(existencia);
    },
  });
}

export function crearRegistrarEntregaProductoTerminado({ productoTerminadoRepository, reloj }) {
  return casoDeUso({
    nombre: 'inventario.registrarEntregaProductoTerminado',
    entrada: RegistrarEntregaSchema,
    salida: ExistenciaDTOSchema,
    async ejecutar({ existenciaId, cantidad, recibidoPor, usuario }) {
      const existencia = await productoTerminadoRepository.obtenerPorId(existenciaId);
      if (!existencia) throw new RecursoNoEncontradoError('ExistenciaProductoTerminado', existenciaId);
      const nueva = registrarEntrega(existencia, { cantidad, recibidoPor, usuario, fecha: reloj.ahora() });
      await productoTerminadoRepository.actualizar(nueva, existencia.version);
      return aExistenciaDTO(nueva);
    },
  });
}

export function crearListarPendientesEntrega({ productoTerminadoRepository }) {
  return casoDeUso({
    nombre: 'inventario.listarPendientesEntrega',
    entrada: ListarPendientesSchema,
    salida: z.array(ExistenciaDTOSchema),
    async ejecutar(filtro) {
      return (await productoTerminadoRepository.listarPendientes(filtro)).map(aExistenciaDTO);
    },
  });
}
