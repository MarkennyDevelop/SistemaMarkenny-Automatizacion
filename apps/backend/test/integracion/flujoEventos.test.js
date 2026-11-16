// Flujo completo entre módulos a través del EventBus real (sin HTTP ni BD).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeEventBus } from '../../src/shared/events/eventBus.js';
import { EVENTOS } from '../../src/shared/events/catalogo.js';
import { crearModuloProduccion, InMemoryOrdenRepository } from '../../src/modules/produccion/index.js';
import {
  crearModuloInventario,
  InMemoryMaterialRepository,
  InMemoryProductoTerminadoRepository,
} from '../../src/modules/inventario/index.js';
import { crearRelojFijo, crearIdsSecuenciales, USUARIOS, CLIENTE_ID } from '../helpers/fakes.js';

let bus, produccion, inventario, reloj, logger;

beforeEach(() => {
  reloj = crearRelojFijo();
  logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  bus = new NodeEventBus({ logger, reloj });
  const ids = crearIdsSecuenciales();
  produccion = crearModuloProduccion({ ordenRepository: new InMemoryOrdenRepository(), eventBus: bus, reloj, ids }).casosUso;
  inventario = crearModuloInventario({
    materialRepository: new InMemoryMaterialRepository(),
    productoTerminadoRepository: new InMemoryProductoTerminadoRepository(),
    eventBus: bus,
    reloj,
    ids,
    logger,
  }).casosUso;
});

async function material(codigo, stock, categoria = 'PAPEL') {
  const m = await inventario.crearMaterial({ codigo, nombre: codigo, categoria, unidad: 'u', stockMinimo: 0, usuario: USUARIOS.almacen });
  if (stock > 0) await inventario.registrarEntradaMaterial({ materialId: m.id, cantidad: stock, usuario: USUARIOS.almacen });
  return m.id;
}

const stockDe = async (id) => (await inventario.listarMateriales({})).find((m) => m.id === id).stockActual;

function escuchar(tipo) {
  const recibidos = [];
  bus.suscribir(tipo, (e) => recibidos.push(e.payload));
  return recibidos;
}

describe('Aprobación de orden -> descuento de materias primas', () => {
  it('descuenta papel y tinta de forma asíncrona tras aprobar la orden', async () => {
    const papel = await material('PAP-COUCHE-150', 5000);
    const tinta = await material('TIN-NEGRO', 10, 'TINTA');
    const descontados = escuchar(EVENTOS.MATERIALES_DESCONTADOS);

    const orden = await produccion.aprobarOrdenTrabajo({
      clienteId: CLIENTE_ID,
      tipoProducto: 'IMPRESO',
      descripcion: 'Catálogo 16 págs',
      cantidad: 1000,
      materiales: [
        { materialId: papel, cantidad: 2150 },
        { materialId: tinta, cantidad: 1.2 },
      ],
      usuario: USUARIOS.ventas,
    });

    // Asíncrono: justo después de aprobar, el inventario aún no se ha tocado.
    expect(await stockDe(papel)).toBe(5000);

    await bus.esperarInactividad();
    expect(await stockDe(papel)).toBe(2850);
    expect(await stockDe(tinta)).toBe(8.8);
    expect(descontados).toEqual([
      {
        ordenId: orden.id,
        movimientos: [
          { materialId: papel, cantidad: 2150, stockResultante: 2850 },
          { materialId: tinta, cantidad: 1.2, stockResultante: 8.8 },
        ],
      },
    ]);
    const movs = await inventario.listarMovimientosMaterial({ materialId: papel });
    expect(movs[0]).toMatchObject({ tipo: 'SALIDA', referencia: { tipo: 'ORDEN_PRODUCCION', id: orden.id }, usuario: USUARIOS.ventas });
  });

  it('si falta stock no descuenta nada y publica DESCUENTO_MATERIALES_FALLIDO', async () => {
    const papel = await material('PAP-BOND', 100);
    const tinta = await material('TIN-CYAN', 0.5, 'TINTA');
    const fallidos = escuchar(EVENTOS.DESCUENTO_MATERIALES_FALLIDO);

    const orden = await produccion.aprobarOrdenTrabajo({
      clienteId: CLIENTE_ID,
      tipoProducto: 'IMPRESO',
      descripcion: 'Facturas',
      cantidad: 50,
      materiales: [
        { materialId: papel, cantidad: 60 },
        { materialId: tinta, cantidad: 1 },
      ],
      usuario: USUARIOS.ventas,
    });
    await bus.esperarInactividad();

    expect(await stockDe(papel)).toBe(100);
    expect(await stockDe(tinta)).toBe(0.5);
    expect(fallidos).toEqual([
      expect.objectContaining({ ordenId: orden.id, codigoError: 'STOCK_INSUFICIENTE' }),
    ]);
    // La orden de producción sigue existiendo: la planta decide cómo proceder.
    expect((await produccion.consultarOrden({ ordenId: orden.id })).estado).toBe('EN_PROCESO');
  });

  it('es idempotente ante la re-entrega del evento', async () => {
    const papel = await material('PAP-KRAFT', 1000);
    await produccion.aprobarOrdenTrabajo({
      clienteId: CLIENTE_ID, tipoProducto: 'IMPRESO', descripcion: 'Bolsas', cantidad: 10,
      materiales: [{ materialId: papel, cantidad: 100 }], usuario: USUARIOS.ventas,
    });
    await bus.esperarInactividad();
    const ordenId = (await produccion.listarOrdenes({}))[0].id;

    const r = await inventario.descontarMaterialesOrden({ ordenId, materiales: [{ materialId: papel, cantidad: 100 }], usuario: USUARIOS.ventas });
    expect(r.yaProcesado).toBe(true);
    expect(await stockDe(papel)).toBe(900);
  });
});

describe('Orden empaquetada -> stock de producto terminado pendiente de entrega', () => {
  it('un sello empaquetado queda en almacén pendiente de entrega y se entrega', async () => {
    const orden = await produccion.aprobarOrdenTrabajo({
      clienteId: CLIENTE_ID,
      tipoProducto: 'SELLO',
      descripcion: 'Sello automático "Markenny C.A."',
      cantidad: 2,
      especificacionSello: { modelo: 'Trodat 4913', colorTinta: 'azul' },
      usuario: USUARIOS.ventas,
    });
    for (const hacia of ['EN_REVISION', 'FINALIZADO']) {
      reloj.avanzar();
      await produccion.cambiarEstadoOrden({ ordenId: orden.id, hacia, usuario: USUARIOS.calidad });
    }
    await bus.esperarInactividad();
    expect(await inventario.listarPendientesEntrega({})).toEqual([]);

    reloj.avanzar();
    await produccion.cambiarEstadoOrden({ ordenId: orden.id, hacia: 'EMPAQUETADO', usuario: USUARIOS.almacen });
    await bus.esperarInactividad();

    const sellos = await inventario.listarPendientesEntrega({ tipoProducto: 'SELLO' });
    expect(sellos).toHaveLength(1);
    expect(sellos[0]).toMatchObject({
      ordenId: orden.id,
      codigoOrden: orden.codigo,
      estado: 'PENDIENTE_ENTREGA',
      cantidadPendiente: 2,
      especificacionSello: { modelo: 'Trodat 4913', colorTinta: 'azul' },
      ingresadoPor: USUARIOS.almacen,
    });
    expect(await inventario.listarPendientesEntrega({ tipoProducto: 'IMPRESO' })).toEqual([]);

    const entregado = await inventario.registrarEntregaProductoTerminado({
      existenciaId: sellos[0].id, cantidad: 2, recibidoPor: 'Cliente en mostrador', usuario: USUARIOS.almacen,
    });
    expect(entregado.estado).toBe('ENTREGADO');
    expect(await inventario.listarPendientesEntrega({})).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
