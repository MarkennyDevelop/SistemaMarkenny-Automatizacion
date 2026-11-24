// Almacén de producto terminado: solo órdenes EMPAQUETADAS pendientes de entrega.
import { describe, expect, it } from 'vitest';
import { crearCasosUsoInventario } from '../../src/modules/inventario/application/casosUso.js';
import { crearProductoTerminado, registrarEntrega } from '../../src/modules/inventario/domain/inventario.js';
import {
  MaterialRepositoryMemoria,
  ProductoTerminadoRepositoryMemoria,
} from '../../src/modules/inventario/infra/repositorios.js';
import { ACTORES, crearIdsSecuenciales, crearRelojFijo } from '../helpers.js';

const FECHA = new Date('2026-11-20T12:00:00.000Z');
const orden = (n) => `50000000-0000-4000-8000-00000000000${n}`;

async function escenario() {
  const productos = new ProductoTerminadoRepositoryMemoria();
  const fases = new Map([
    [orden(1), 'EMPAQUETADO'],
    [orden(2), 'FINALIZADO'], // inconsistencia simulada: no debe listarse
    [orden(3), 'EMPAQUETADO'],
  ]);
  const casosUso = crearCasosUsoInventario({
    materiales: new MaterialRepositoryMemoria(),
    productos,
    eventBus: { publicar() {}, suscribir: () => () => {} },
    reloj: crearRelojFijo(),
    ids: crearIdsSecuenciales('60000000'),
    fasesDeOrdenes: async (ids) => new Map(ids.filter((id) => fases.has(id)).map((id) => [id, fases.get(id)])),
  });
  const producto = (id, ordenId, extra = {}) =>
    crearProductoTerminado({
      id, tipo: 'TALONARIO', ordenId, codigoOrden: ordenId ? 'OT-2026-0001' : null,
      descripcion: 'Talonarios', cantidad: 10, fecha: FECHA, ...extra,
    });
  await productos.crear(producto('70000000-0000-4000-8000-000000000001', orden(1)));
  await productos.crear(producto('70000000-0000-4000-8000-000000000002', orden(2)));
  await productos.crear(producto('70000000-0000-4000-8000-000000000004', null)); // sin orden
  const entregado = producto('70000000-0000-4000-8000-000000000003', orden(3));
  await productos.crear(entregado);
  await productos.registrarEntrega(
    registrarEntrega(entregado, { id: '80000000-0000-4000-8000-000000000001', cantidad: 10, recibidoPor: 'Cliente', actor: ACTORES.produccion, fecha: FECHA }),
    entregado.version,
  );
  return casosUso;
}

describe('listarProductosTerminados', () => {
  it('solo lista órdenes EMPAQUETADAS pendientes de entrega', async () => {
    const casosUso = await escenario();
    const lista = await casosUso.listarProductosTerminados({});
    expect(lista.map((p) => p.ordenId)).toEqual([orden(1)]);
  });

  it('el historial (soloPendientes=false) incluye entregadas, pero nunca fases previas ni registros sin orden', async () => {
    const casosUso = await escenario();
    const lista = await casosUso.listarProductosTerminados({ soloPendientes: false });
    expect(lista.map((p) => p.ordenId).sort()).toEqual([orden(1), orden(3)]);
  });
});
