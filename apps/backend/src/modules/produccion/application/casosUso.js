// Casos de uso del módulo de Producción (órdenes de trabajo y control de calidad).
import { z } from 'zod';
import {
  FiltroOrdenesSchema,
  NuevaNotaSchema,
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
  agregarNota,
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
 * @property {(ordenId: string, nota: object) => Promise<void>} agregarNota  Solo inserción.
 * @property {(id: string) => Promise<object|null>} obtenerPorId
 * @property {(filtro: object) => Promise<object[]>} listar  Más recientes primero.
 * @property {() => Promise<Map<string, { activas: number, saldo: number }>>} resumenPorCliente
 * @property {(ids: string[]) => Promise<Map<string, string>>} fasesDe  Fase actual de cada orden
 */
export const ORDEN_REPOSITORY_PORT = Object.freeze([
  'siguienteCodigo', 'crear', 'actualizar', 'actualizarEstadoEntrega', 'agregarNota', 'obtenerPorId', 'listar',
  'resumenPorCliente', 'fasesDe',
]);

/** Proyección del agregado al DTO del contrato. */
export function aOrdenDTO(o) {
  return {
    id: o.id,
    codigo: o.codigo,
    clienteId: o.clienteId,
    clienteNombre: o.clienteNombre,
    clienteTelefono: o.clienteTelefono ?? null,
    producto: o.producto,
    descripcion: o.descripcion,
    tecnologia: o.tecnologia,
    categoriaTrabajo: o.categoriaTrabajo,
    productoTerminado: o.productoTerminado,
    prioridad: o.prioridad,
    materialId: o.materialId ?? null,
    consumoSustrato: o.consumoSustrato ?? null,
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
    fechaFinalizado: o.fechaFinalizado ?? null,
    fechaEntrega: o.fechaEntrega,
    version: o.version,
    historial: o.historial.map((e) => ({ ...e })),
    notas: (o.notas ?? []).map((n) => ({ ...n })),
  };
}

/**
 * @param {{ ordenes: any, eventBus: any, reloj: any, ids: any,
 *   obtenerCliente: (id: string) => Promise<object|null> }} deps
 *   `obtenerCliente` es la interfaz pública de Ventas.
 */
/**
 * @param {object} deps
 * @param {{
 *   calcular: (p: { materialId: string, especificaciones: object, cantidad: number }) =>
 *     Promise<{ materialId: string, nombre: string, unidad: string, m2: number, cantidad: number | null }>,
 *   descontar: (p: { ordenId: string, codigo: string, materiales: { materialId: string, cantidad: number }[], actor: object }) =>
 *     Promise<object[]>,
 * }} deps.sustratos  Interfaz pública de Inventario.
 * @param {<T>(fn: () => Promise<T>) => Promise<T>} deps.unidadDeTrabajo
 *   Ejecuta `fn` en una sola transacción (todo o nada).
 */
export function crearCasosUsoProduccion({ ordenes, eventBus, reloj, ids, obtenerCliente, sustratos, unidadDeTrabajo }) {
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
      // safeExtend: NuevaOrdenSchema tiene validaciones propias que deben conservarse.
      entrada: NuevaOrdenSchema.safeExtend({ actor: ActorSchema }),
      salida: OrdenTrabajoSchema,
      /**
       * Con sustrato del almacén (gran formato):
       *  1. calcula el consumo y verifica el stock (sin efectos): si no
       *     alcanza, 409 STOCK_INSUFICIENTE y no se crea nada;
       *  2. en UNA transacción: toma el código de OT, guarda la orden y
       *     descuenta el sustrato. Si otra venta se llevó el stock entre el
       *     paso 1 y el 2, el descuento falla y se deshace todo (orden,
       *     código y movimientos).
       * Si el material no tiene rendimiento, la orden se crea sin descontar
       * y se avisa a Producción y Administración.
       */
      async ejecutar({ actor, materialId, ...datos }) {
        const cliente = await obtenerCliente(datos.clienteId);
        if (!cliente) throw new RecursoNoEncontradoError('Cliente', datos.clienteId);

        const fecha = reloj.ahora();
        let calculo = null;
        const orden = await unidadDeTrabajo(async () => {
          // Antes de tomar el código de OT: si no alcanza, no se gasta un número.
          calculo = materialId
            ? await sustratos.calcular({ materialId, especificaciones: datos.especificaciones ?? {}, cantidad: datos.cantidad })
            : null;
          const nueva = crearOrdenTrabajo({
            id: ids.generar(),
            eventoId: ids.generar(),
            codigo: await ordenes.siguienteCodigo(fecha.getFullYear()),
            cliente,
            actor,
            datos,
            fecha,
            consumo: calculo ? { materialId, cantidad: calculo.cantidad } : null,
          });
          await ordenes.crear(nueva);
          if (calculo?.cantidad) {
            await sustratos.descontar({
              ordenId: nueva.id,
              codigo: nueva.codigo,
              materiales: [{ materialId, cantidad: calculo.cantidad }],
              actor,
            });
          }
          return nueva;
        });

        if (calculo && calculo.cantidad === null) {
          eventBus.publicar(EVENTOS.DESCUENTO_MATERIALES_FALLIDO, {
            ordenId: orden.id,
            codigoError: 'SIN_RENDIMIENTO',
            mensaje:
              `${orden.codigo}: «${calculo.nombre}» no tiene rendimiento (m² por ${calculo.unidad}) configurado en Inventario; ` +
              `no se descontaron ${calculo.m2.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m² del almacén.`,
            detalles: { materialId, m2: calculo.m2 },
          });
        }

        // Se publica solo después de guardar.
        eventBus.publicar(EVENTOS.ORDEN_CREADA, {
          ordenId: orden.id,
          codigo: orden.codigo,
          producto: orden.producto,
          clienteNombre: orden.clienteNombre,
          vendedorId: orden.vendedorId,
          // El sustrato ya se descontó arriba (de forma síncrona, para poder
          // bloquear la orden); el evento no vuelve a descontar.
          materiales: [],
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
            productoTerminado: nueva.productoTerminado,
            cantidad: nueva.cantidad,
            actor,
            fecha: nueva.historial.at(-1).fecha,
          });
        }
        return aOrdenDTO(nueva);
      },
    }),

    /**
     * Observación o solicitud de revisión/retrabajo. El vendedor solo anota en
     * sus órdenes; Producción y Administración deciden el cambio de fase.
     */
    agregarNota: casoDeUso({
      nombre: 'produccion.agregarNota',
      entrada: NuevaNotaSchema.extend({ id: z.string().uuid(), actor: ActorSchema }),
      salida: OrdenTrabajoSchema,
      async ejecutar({ id, mensaje, solicitaRetrabajo, actor }) {
        const orden = await cargarVisible(id, actor);
        const r = agregarNota(orden, { id: ids.generar(), mensaje, solicitaRetrabajo, actor, fecha: reloj.ahora() });
        await ordenes.agregarNota(orden.id, r.nota);
        eventBus.publicar(EVENTOS.NOTA_AGREGADA, {
          ordenId: orden.id,
          codigo: orden.codigo,
          producto: orden.producto,
          clienteNombre: orden.clienteNombre,
          vendedorId: orden.vendedorId,
          fase: orden.fase,
          mensaje: r.nota.mensaje,
          solicitaRetrabajo: r.nota.solicitaRetrabajo,
          actor,
          fecha: r.nota.fecha,
        });
        return aOrdenDTO(r.orden);
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
    fasesDeOrdenes: (ids) => ordenes.fasesDe(ids),
  };
}
