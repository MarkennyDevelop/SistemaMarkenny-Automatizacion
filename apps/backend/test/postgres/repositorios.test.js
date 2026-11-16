// Pruebas de contrato de los repositorios: la MISMA batería se ejecuta contra
// el adaptador en memoria y contra PostgreSQL. Las de PostgreSQL solo corren si
// se define TEST_DATABASE_URL (BD desechable: se recrea el esquema `public`).
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { crearPool } from '../../src/shared/db/pool.js';
import { migrar } from '../../src/shared/db/migrate.js';
import { ConflictoConcurrenciaError } from '../../src/shared/domain/errors.js';
import { crearOrdenProduccion } from '../../src/modules/produccion/domain/ordenProduccion.js';
import { transicionar } from '../../src/modules/produccion/domain/ordenStateMachine.js';
import { crearMaterial, registrarEntrada, planificarDescuento } from '../../src/modules/inventario/domain/material.js';
import { crearExistenciaProductoTerminado, registrarEntrega } from '../../src/modules/inventario/domain/productoTerminado.js';
import { InMemoryOrdenRepository, PostgresOrdenRepository } from '../../src/modules/produccion/index.js';
import {
  InMemoryMaterialRepository,
  InMemoryProductoTerminadoRepository,
  PostgresMaterialRepository,
  PostgresProductoTerminadoRepository,
} from '../../src/modules/inventario/index.js';
import { crearIdsSecuenciales, USUARIOS, CLIENTE_ID } from '../helpers/fakes.js';

const URL = process.env.TEST_DATABASE_URL;
const F = new Date('2026-11-16T08:00:00.123Z');
const en = (min) => new Date(F.getTime() + min * 60_000);

function suiteContrato(nombre, fabricar) {
  describe(`Contrato de repositorios: ${nombre}`, () => {
    let repos, ids;
    beforeEach(async () => {
      repos = await fabricar();
      ids = crearIdsSecuenciales('cccccccc');
    });

    const nuevaOrden = (extra = {}) =>
      crearOrdenProduccion({
        id: ids.generar(), codigo: `OP-2026-${ids.generar().slice(-6)}`, clienteId: CLIENTE_ID, tipoProducto: 'IMPRESO',
        descripcion: 'Afiches', cantidad: 100, materiales: [{ materialId: ids.generar(), cantidad: 1.5 }],
        usuario: USUARIOS.ventas, fecha: F, ...extra,
      });

    it('orden: crear y leer preserva el agregado y su auditoría', async () => {
      const orden = nuevaOrden();
      await repos.orden.crear(orden);
      expect(await repos.orden.obtenerPorId(orden.id)).toEqual(orden);
      expect(await repos.orden.obtenerPorId(ids.generar())).toBeNull();
    });

    it('orden: actualizar añade auditoría y aplica bloqueo optimista', async () => {
      const orden = nuevaOrden();
      await repos.orden.crear(orden);
      const v2 = transicionar(orden, { hacia: 'EN_REVISION', usuario: USUARIOS.operador, fecha: en(5) });
      await repos.orden.actualizar(v2, 1);
      const v3 = transicionar(v2, { hacia: 'EN_PROCESO', usuario: USUARIOS.calidad, fecha: en(9), motivo: 'Color fuera de tolerancia' });
      await repos.orden.actualizar(v3, 2);
      expect(await repos.orden.obtenerPorId(orden.id)).toEqual(v3);
      await expect(repos.orden.actualizar(v2, 1)).rejects.toBeInstanceOf(ConflictoConcurrenciaError);
    });

    it('orden: listar filtra por estado y genera códigos únicos', async () => {
      const a = nuevaOrden();
      await repos.orden.crear(a);
      await repos.orden.crear(nuevaOrden());
      await repos.orden.actualizar(transicionar(a, { hacia: 'EN_REVISION', usuario: USUARIOS.operador, fecha: en(1) }), 1);
      expect((await repos.orden.listar({ estado: 'EN_REVISION' })).map((o) => o.id)).toEqual([a.id]);
      const c1 = await repos.orden.siguienteCodigo(2026);
      const c2 = await repos.orden.siguienteCodigo(2026);
      expect(c1).toMatch(/^OP-2026-\d{6}$/);
      expect(c1).not.toBe(c2);
    });

    it('material: movimientos atómicos con versión e idempotencia por referencia', async () => {
      const m = crearMaterial({ id: ids.generar(), codigo: 'PAP-1', nombre: 'Bond', categoria: 'PAPEL', unidad: 'pliego', stockMinimo: 10, fecha: F });
      await repos.material.crear(m);
      const entrada = registrarEntrada(m, { movimientoId: ids.generar(), cantidad: 100.25, usuario: USUARIOS.almacen, fecha: F });
      await repos.material.aplicarMovimientos({ cambios: [{ material: entrada.material, versionEsperada: 1 }], movimientos: [entrada.movimiento] });

      const ordenId = ids.generar();
      const plan = planificarDescuento([entrada.material], [{ materialId: m.id, cantidad: 40 }], {
        referencia: { tipo: 'ORDEN_PRODUCCION', id: ordenId }, usuario: USUARIOS.ventas, fecha: en(1), generarId: () => ids.generar(),
      });
      expect(await repos.material.existenMovimientosDeReferencia('ORDEN_PRODUCCION', ordenId)).toBe(false);
      await repos.material.aplicarMovimientos(plan);
      expect(await repos.material.existenMovimientosDeReferencia('ORDEN_PRODUCCION', ordenId)).toBe(true);
      expect(await repos.material.obtenerPorId(m.id)).toEqual(plan.cambios[0].material);

      // Reaplicar el mismo plan (versión obsoleta) falla sin cambios.
      await expect(repos.material.aplicarMovimientos(plan)).rejects.toBeInstanceOf(ConflictoConcurrenciaError);
      expect((await repos.material.obtenerPorId(m.id)).stockActual).toBe(60.25);
      expect((await repos.material.listarMovimientos(m.id)).map((x) => x.tipo)).toEqual(['SALIDA', 'ENTRADA']);
      expect(await repos.material.obtenerVarios([m.id, ids.generar()])).toHaveLength(1);
      await expect(repos.material.crear({ ...m, id: ids.generar() })).rejects.toMatchObject({ codigo: 'CODIGO_DUPLICADO' });
    });

    it('producto terminado: pendientes, entrega y unicidad por orden', async () => {
      const e = crearExistenciaProductoTerminado({
        id: ids.generar(), ordenId: ids.generar(), codigoOrden: 'OP-2026-000009', clienteId: CLIENTE_ID, tipoProducto: 'SELLO',
        descripcion: 'Sello fechador', cantidad: 2, especificacionSello: { modelo: 'Trodat 4810' }, usuario: USUARIOS.almacen, fecha: F,
      });
      await repos.pt.crear(e);
      expect(await repos.pt.obtenerPorOrdenId(e.ordenId)).toEqual(e);
      expect(await repos.pt.listarPendientes({ tipoProducto: 'SELLO', clienteId: CLIENTE_ID })).toEqual([e]);
      await expect(repos.pt.crear({ ...e, id: ids.generar() })).rejects.toBeInstanceOf(ConflictoConcurrenciaError);

      const entregado = registrarEntrega(e, { cantidad: 2, usuario: USUARIOS.almacen, fecha: en(60) });
      await repos.pt.actualizar(entregado, 1);
      expect(await repos.pt.obtenerPorId(e.id)).toEqual(entregado);
      expect(await repos.pt.listarPendientes({})).toEqual([]);
      await expect(repos.pt.actualizar(entregado, 1)).rejects.toBeInstanceOf(ConflictoConcurrenciaError);
    });
  });
}

suiteContrato('memoria', async () => ({
  orden: new InMemoryOrdenRepository(),
  material: new InMemoryMaterialRepository(),
  pt: new InMemoryProductoTerminadoRepository(),
}));

describe.skipIf(!URL)('PostgreSQL', () => {
  let pool;
  beforeAll(() => {
    pool = crearPool({ connectionString: URL });
  });
  afterAll(() => pool?.end());

  // La auditoría no admite DELETE/TRUNCATE: cada prueba parte de un esquema nuevo.
  const reiniciarEsquema = async () => {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await migrar(pool, { logger: {} });
  };

  suiteContrato('postgres', async () => {
    await reiniciarEsquema();
    return {
      orden: new PostgresOrdenRepository(pool),
      material: new PostgresMaterialRepository(pool),
      pt: new PostgresProductoTerminadoRepository(pool),
    };
  });

  it('la auditoría de transiciones es de solo inserción (UPDATE, DELETE y TRUNCATE bloqueados)', async () => {
    await reiniciarEsquema();
    const orden = crearOrdenProduccion({
      id: crearIdsSecuenciales('dddddddd').generar(), codigo: 'OP-2026-999999', clienteId: CLIENTE_ID,
      tipoProducto: 'IMPRESO', descripcion: 'Prueba', cantidad: 1, usuario: USUARIOS.ventas, fecha: F,
    });
    await new PostgresOrdenRepository(pool).crear(orden);
    for (const sql of [
      "UPDATE produccion_auditoria_transiciones SET usuario_id = 'otro'",
      'DELETE FROM produccion_auditoria_transiciones',
      'TRUNCATE produccion_auditoria_transiciones',
    ]) {
      await expect(pool.query(sql), sql).rejects.toThrow(/solo inserción/);
    }
    const { rows } = await pool.query('SELECT usuario_id FROM produccion_auditoria_transiciones');
    expect(rows).toEqual([{ usuario_id: USUARIOS.ventas.id }]);
  });
});
