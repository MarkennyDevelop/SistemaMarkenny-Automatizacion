// Casos de uso del módulo de Producción (órdenes de trabajo y control de calidad).
import { z } from 'zod';
import {
  FiltroOrdenesSchema,
  NuevaOrdenSchema,
  OrdenTrabajoSchema,
  TransicionSchema,
} from '@markenny/contrato';
import { AVANCE_POR_FASE } from '@markenny/contrato/dominio';
import { casoDeUso } from '../../../shared/application/validacion.js';
import { ActorSchema } from '../../../shared/application/actor.js';
import {
  ConflictoConcurrenciaError,
  RecursoNoEncontradoError,
} from '../../../shared/domain/errors.js';
import { EVENTOS } from '../../../shared/events/catalogo.js';
import {
  crearOrdenTrabajo,
  puedeVer,
  registrarEstadoEntrega,
  transicionar,
} from '../domain/ordenTrabajo.js';

/**
 * @typedef {Object} OrdenRepositoryPort
 * @property {(anio: number) => Promise<string>} siguienteCodigo  `OT-AAAA-NNNN`, consecutivo por año.
 * @property {(orden: object) => Promise<void>} crear
 * @property {(orden: object, versionEsperada: number) => Promise<void>} actualizar
 *   Guarda fase/estado y los eventos nuevos del historial. ConflictoConcurrenciaError si la versión cambió.
 * @property {(id: string, estadoEntrega: string) => Promise<void>} actualizarEstadoEntrega
 * @property {(id: string) => Promise<object|null>} obtenerPorId
 * @property {(filtro: object) => Promise<object[]>} listar  Más recientes primero.
 * @property {() => Promise<Map<string, { activas: number, saldo: number }>>} resumenPorCliente
 */
export const ORDEN_REPOSITORY_PORT = Object.freeze([
  'siguienteCodigo', 'crear', 'actualizar', 'actualizarEstadoEntrega', 'obtenerPorId', 'listar', 'resumenPorCliente',
]);

/** Proyección del agregado al DTO del contrato. */
export function aOrdenDTO(o) {
  return {
    id: o.id,
    codigo: o.codigo,
    clienteId: o.clienteId,
    clienteNombre: o.clienteNombre,
    producto: o.producto,
    descripcion: o.descripcion,
    tecnologia: o.tecnologia,
    categoriaTrabajo: o.categoriaTrabajo,
    prioridad: o.prioridad,
    maquina: o.maquina,
    operador: o.operador,
    cantidad: o.cantidad,
    sustrato: o.sustrato,
    tintas: [...o.tintas],
    acabados: [...o.acabados],
    especificaciones: { ...o.especificaciones },
    montoTotal: o.montoTotal,
    fase: o.fase,
    avance: AVANCE_POR_FASE[o.fase],
    estadoEntrega: o.estadoEntrega,
    vendedorId: o.vendedorId,
    vendedor: o.vendedor,
    fechaCreacion: o.fechaCreacion,
    fechaEntrega: o.fechaEntrega,
    version: o.version,
    historial: o.historial.map((e) => ({ ...e })),
  };
}

/**
 * @param {{ ordenes: any, eventBus: any, reloj: any, ids: any,
 *   obtenerCliente: (id: string) => Promise<object|null> }} deps
 *   `obtenerCliente` es la interfaz pública de Ventas.
 */
export function crearCasosUsoProduccion({ ordenes, eventBus, reloj, ids, obtenerCliente }) {
  function publicarActualizada(orden, actor) {
    const evento = orden.historial.at(-1);
    eventBus.publicar(EVENTOS.ORDEN_ACTUALIZADA, {
      ordenId: orden.id,
      codigo: orden.codigo,
      producto: orden.producto,
      clienteNombre: orden.clienteNombre,
      vendedorId: orden.vendedorId,
      fase: orden.fase,
      anterior: evento.anterior,
      version: orden.version,
      actor,
      fecha: evento.fecha,
    });
  }

  async function cargarVisible(id, actor) {
    const orden = await ordenes.obtenerPorId(id);
    // Para un vendedor, la orden de otro "no existe": no se revela que existe.
    if (!orden || !puedeVer(orden, actor)) throw new RecursoNoEncontradoError('Orden de trabajo', id);
    return orden;
  }

  return {
    crearOrden: casoDeUso({
      nombre: 'produccion.crearOrden',
      entrada: NuevaOrdenSchema.extend({
        actor: ActorSchema,
        /** Materias primas a descontar; hoy las fichas del frontend no las envían. */
        materiales: z.array(z.object({ materialId: z.string().uuid(), cantidad: z.number().positive() })).default([]),
      }),
      salida: OrdenTrabajoSchema,
      async ejecutar({ actor, materiales, ...datos }) {
        const cliente = await obtenerCliente(datos.clienteId);
        if (!cliente) throw new RecursoNoEncontradoError('Cliente', datos.clienteId);
        const fecha = reloj.ahora();
        const orden = crearOrdenTrabajo({
          id: ids.generar(),
          eventoId: ids.generar(),
          codigo: await ordenes.siguienteCodigo(fecha.getFullYear()),
          cliente,
          actor,
          datos,
          fecha,
        });
        await ordenes.crear(orden);

        // Se publica solo después de guardar.
        eventBus.publicar(EVENTOS.ORDEN_CREADA, {
          ordenId: orden.id,
          codigo: orden.codigo,
          producto: orden.producto,
          clienteNombre: orden.clienteNombre,
          vendedorId: orden.vendedorId,
          materiales,
          actor,
          fecha: orden.fechaCreacion,
        });
        publicarActualizada(orden, actor);
        return aOrdenDTO(orden);
      },
    }),

    listarOrdenes: casoDeUso({
      nombre: 'produccion.listarOrdenes',
      entrada: FiltroOrdenesSchema.extend({ actor: ActorSchema }),
      salida: z.array(OrdenTrabajoSchema),
      async ejecutar({ actor, ...filtro }) {
        const lista = await ordenes.listar({
          ...filtro,
          vendedorId: actor.rol === 'VENDEDOR' ? actor.id : undefined,
        });
        return lista.map(aOrdenDTO);
      },
    }),

    obtenerOrden: casoDeUso({
      nombre: 'produccion.obtenerOrden',
      entrada: z.object({ id: z.string().uuid(), actor: ActorSchema }).strict(),
      salida: OrdenTrabajoSchema,
      ejecutar: async ({ id, actor }) => aOrdenDTO(await cargarVisible(id, actor)),
    }),

    cambiarFase: casoDeUso({
      nombre: 'produccion.cambiarFase',
      entrada: TransicionSchema.extend({ id: z.string().uuid(), actor: ActorSchema }),
      salida: OrdenTrabajoSchema,
      async ejecutar({ id, fase, nota, versionEsperada, actor }) {
        const orden = await cargarVisible(id, actor);
        if (versionEsperada !== undefined && versionEsperada !== orden.version) {
          throw new ConflictoConcurrenciaError('La orden', id);
        }
        const nueva = transicionar(orden, { hacia: fase, actor, nota, fecha: reloj.ahora(), eventoId: ids.generar() });
        await ordenes.actualizar(nueva, orden.version);

        publicarActualizada(nueva, actor);
        if (nueva.fase === 'EMPAQUETADO') {
          eventBus.publicar(EVENTOS.ORDEN_EMPAQUETADA, {
            ordenId: nueva.id,
            codigo: nueva.codigo,
            clienteId: nueva.clienteId,
            clienteNombre: nueva.clienteNombre,
            producto: nueva.producto,
            cantidad: nueva.cantidad,
            actor,
            fecha: nueva.historial.at(-1).fecha,
          });
        }
        return aOrdenDTO(nueva);
      },
    }),

    /** Reacción al evento PRODUCTO_ENTREGADO de Inventario. */
    async actualizarEstadoEntrega({ ordenId, estadoEntrega }) {
      const orden = await ordenes.obtenerPorId(ordenId);
      if (!orden) return;
      const nueva = registrarEstadoEntrega(orden, estadoEntrega);
      await ordenes.actualizarEstadoEntrega(nueva.id, nueva.estadoEntrega);
    },

    /** Interfaz pública para Ventas: órdenes activas y monto pendiente por cliente. */
    resumenPorCliente: () => ordenes.resumenPorCliente(),
  };
}
