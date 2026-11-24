// Casos de uso del módulo de Inventario.
import { z } from 'zod';
import {
  ConfiguracionConsumoSchema,
  DisponibilidadSchema,
  FiltroMaterialesSchema,
  FiltroMovimientosSchema,
  FiltroProductosTerminadosSchema,
  MaterialSchema,
  MovimientoSchema,
  NuevaEntregaSchema,
  NuevoMaterialSchema,
  NuevoMovimientoSchema,
  ProductoTerminadoSchema,
} from '@markenny/contrato';
import { casoDeUso } from '../../../shared/application/validacion.js';
import { ActorSchema } from '../../../shared/application/actor.js';
import { ConflictoConcurrenciaError, RecursoNoEncontradoError } from '../../../shared/domain/errors.js';
import { EVENTOS } from '../../../shared/events/catalogo.js';
import {
  aDisponibilidad,
  aplicarMovimiento,
  crearMaterial,
  crearProductoTerminado,
  planificarDescuento,
  verificarStock,
  registrarEntrega,
  calcularConsumoSustrato,
  configurarConsumo,
} from '../domain/inventario.js';

/**
 * @typedef {Object} MaterialRepositoryPort
 * @property {(filtro: { categoria?: string, q?: string }) => Promise<object[]>} listar
 * @property {(id: string) => Promise<object|null>} obtenerPorId
 * @property {(ids: string[]) => Promise<object[]>} obtenerVarios
 * @property {(material: object) => Promise<void>} crear  CODIGO_DUPLICADO si el SKU existe.
 * @property {(op: { cambios: { material: object, versionEsperada: number }[], movimientos: object[] }) => Promise<void>} aplicarMovimientos
 *   Atómico: guarda stocks y movimientos o nada. ConflictoConcurrenciaError si alguna versión cambió.
 * @property {(ordenId: string) => Promise<boolean>} existenSalidasDeOrden
 * @property {(filtro: { materialId?: string, limite: number }) => Promise<object[]>} listarMovimientos
 *
 * @typedef {Object} ProductoTerminadoRepositoryPort
 * @property {(id: string) => Promise<object|null>} obtenerPorId
 * @property {(ordenId: string) => Promise<object|null>} obtenerPorOrden
 * @property {(producto: object) => Promise<void>} crear
 * @property {(producto: object, versionEsperada: number) => Promise<void>} registrarEntrega  Guarda la última entrega.
 * @property {(filtro: { tipo?: string, soloPendientes: boolean }) => Promise<object[]>} listar
 */
export const MATERIAL_REPOSITORY_PORT = Object.freeze([
  'listar', 'obtenerPorId', 'obtenerVarios', 'crear', 'guardarConfiguracion', 'aplicarMovimientos',
  'existenSalidasDeOrden', 'listarMovimientos',
]);
export const PRODUCTO_REPOSITORY_PORT = Object.freeze(['obtenerPorId', 'obtenerPorOrden', 'crear', 'registrarEntrega', 'listar']);

const MAX_REINTENTOS = 3;

/** Reintenta ante conflictos de concurrencia optimista (dos movimientos a la vez). */
async function conReintentos(fn) {
  for (let intento = 1; ; intento += 1) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof ConflictoConcurrenciaError) || intento >= MAX_REINTENTOS) throw err;
    }
  }
}

const aMaterialDTO = ({ version: _v, ...m }) => ({ ...m });
const aProductoDTO = ({ version: _v, ...p }) => ({
  ...p,
  cantidadPendiente: p.cantidad - p.cantidadEntregada,
  entregas: p.entregas.map(({ id: _id, ...e }) => ({ ...e })),
});

export function crearCasosUsoInventario({ materiales, productos, eventBus, reloj, ids, fasesDeOrdenes }) {
  return {
    listarMateriales: casoDeUso({
      nombre: 'inventario.listarMateriales',
      entrada: FiltroMaterialesSchema,
      salida: z.array(MaterialSchema),
      ejecutar: async (filtro) => (await materiales.listar(filtro)).map(aMaterialDTO),
    }),

    /** Insumos con existencia para las fichas de orden (cualquier rol). */
    disponibilidad: casoDeUso({
      nombre: 'inventario.disponibilidad',
      entrada: z.object({}).strict(),
      salida: z.array(DisponibilidadSchema),
      ejecutar: async () => (await materiales.listar({})).map(aDisponibilidad),
    }),

    crearMaterial: casoDeUso({
      nombre: 'inventario.crearMaterial',
      entrada: NuevoMaterialSchema,
      salida: MaterialSchema,
      async ejecutar(datos) {
        const material = crearMaterial({ ...datos, id: ids.generar(), fecha: reloj.ahora() });
        await materiales.crear(material);
        return aMaterialDTO(material);
      },
    }),

    /** Rendimiento (m² por unidad) y merma de un vinil o lona. */
    configurarConsumoMaterial: casoDeUso({
      nombre: 'inventario.configurarConsumoMaterial',
      entrada: ConfiguracionConsumoSchema.extend({ id: z.string().uuid() }),
      salida: MaterialSchema,
      async ejecutar({ id, rendimiento, mermaPorcentaje }) {
        return conReintentos(async () => {
          const material = await materiales.obtenerPorId(id);
          if (!material) throw new RecursoNoEncontradoError('Material', id);
          const actualizado = configurarConsumo(material, { rendimiento, mermaPorcentaje, fecha: reloj.ahora() });
          await materiales.guardarConfiguracion(actualizado, material.version);
          return aMaterialDTO(actualizado);
        });
      },
    }),

    /**
     * Interfaz para Producción: cuánto consume una orden de gran formato del
     * sustrato elegido. No modifica nada, pero rechaza con STOCK_INSUFICIENTE
     * si hoy no alcanza (así no se reserva un código de OT en vano).
     * @returns {Promise<{ materialId: string, nombre: string, unidad: string, m2: number, cantidad: number | null }>}
     */
    calcularConsumoSustrato: async ({ materialId, especificaciones, cantidad }) => {
      const material = await materiales.obtenerPorId(materialId);
      if (!material) throw new RecursoNoEncontradoError('Material', materialId);
      const consumo = calcularConsumoSustrato(material, { especificaciones, cantidad });
      if (consumo.cantidad !== null) {
        // Validación sin efectos: misma regla y mensaje que el descuento real.
        verificarStock([material], [{ materialId, cantidad: consumo.cantidad }]);
      }
      return { materialId, nombre: material.nombre, unidad: material.unidad, ...consumo };
    },

    listarMovimientos: casoDeUso({
      nombre: 'inventario.listarMovimientos',
      entrada: FiltroMovimientosSchema,
      salida: z.array(MovimientoSchema),
      ejecutar: (filtro) => materiales.listarMovimientos(filtro),
    }),

    registrarMovimiento: casoDeUso({
      nombre: 'inventario.registrarMovimiento',
      entrada: NuevoMovimientoSchema.extend({ actor: ActorSchema }),
      salida: MovimientoSchema,
      async ejecutar({ materialId, actor, ...datos }) {
        return conReintentos(async () => {
          const material = await materiales.obtenerPorId(materialId);
          if (!material) throw new RecursoNoEncontradoError('Material', materialId);
          const r = aplicarMovimiento(material, { ...datos, id: ids.generar(), actor, fecha: reloj.ahora() });
          await materiales.aplicarMovimientos({
            cambios: [{ material: r.material, versionEsperada: material.version }],
            movimientos: [r.movimiento],
          });
          return r.movimiento;
        });
      },
    }),

    /**
     * Reacción a ORDEN_CREADA: descuenta las materias primas de la orden.
     * Idempotente (si el evento se repite no descuenta dos veces) y todo o nada.
     */
    descontarMaterialesOrden: async ({ ordenId, codigo, materiales: requeridos, actor }) => {
      if (requeridos.length === 0) return [];
      const movimientos = await conReintentos(async () => {
        if (await materiales.existenSalidasDeOrden(ordenId)) return [];
        const actuales = await materiales.obtenerVarios([...new Set(requeridos.map((r) => r.materialId))]);
        const plan = planificarDescuento(actuales, requeridos, {
          ordenId,
          codigo,
          actor,
          fecha: reloj.ahora(),
          generarId: () => ids.generar(),
        });
        await materiales.aplicarMovimientos(plan);
        return plan.movimientos;
      });
      if (movimientos.length) {
        eventBus.publicar(EVENTOS.MATERIALES_DESCONTADOS, {
          ordenId,
          movimientos: movimientos.map(({ materialId, cantidad, stockResultante }) => ({ materialId, cantidad, stockResultante })),
        });
      }
      return movimientos;
    },

    /** Reacción a ORDEN_EMPAQUETADA: el pedido entra al almacén pendiente de entrega. Idempotente. */
    ingresarProductoTerminado: async ({ ordenId, codigo, clienteId, clienteNombre, producto, productoTerminado, cantidad }) => {
      if (await productos.obtenerPorOrden(ordenId)) return null;
      const nuevo = crearProductoTerminado({
        id: ids.generar(),
        tipo: productoTerminado,
        ordenId,
        codigoOrden: codigo,
        clienteId,
        clienteNombre,
        descripcion: producto,
        cantidad,
        fecha: reloj.ahora(),
      });
      await productos.crear(nuevo);
      return nuevo;
    },

    listarProductosTerminados: casoDeUso({
      nombre: 'inventario.listarProductosTerminados',
      entrada: FiltroProductosTerminadosSchema,
      salida: z.array(ProductoTerminadoSchema),
      // Producto terminado = orden EMPAQUETADA en almacén y sin entregar.
      // Se verifica la fase real de cada orden en Producción: nada en
      // EN_PROCESO, EN_REVISION o FINALIZADO aparece aquí, ni registros
      // sin orden de trabajo.
      async ejecutar(filtro) {
        const lista = await productos.listar(filtro);
        const fases = await fasesDeOrdenes(lista.flatMap((p) => (p.ordenId ? [p.ordenId] : [])));
        return lista.filter((p) => p.ordenId && fases.get(p.ordenId) === 'EMPAQUETADO').map(aProductoDTO);
      },
    }),

    registrarEntrega: casoDeUso({
      nombre: 'inventario.registrarEntrega',
      entrada: NuevaEntregaSchema.extend({ id: z.string().uuid(), actor: ActorSchema }),
      salida: ProductoTerminadoSchema,
      async ejecutar({ id, cantidad, recibidoPor, actor }) {
        const producto = await productos.obtenerPorId(id);
        if (!producto) throw new RecursoNoEncontradoError('Producto en almacén', id);
        const actualizado = registrarEntrega(producto, {
          id: ids.generar(),
          cantidad,
          recibidoPor,
          actor,
          fecha: reloj.ahora(),
        });
        await productos.registrarEntrega(actualizado, producto.version);
        eventBus.publicar(EVENTOS.PRODUCTO_ENTREGADO, {
          productoId: actualizado.id,
          ordenId: actualizado.ordenId,
          estadoEntrega: actualizado.estadoEntrega,
          fecha: actualizado.entregas.at(-1).fecha,
        });
        return aProductoDTO(actualizado);
      },
    }),
  };
}
