import { describe, it, expect } from 'vitest';
import { crearMaterial, registrarEntrada, planificarDescuento, estaBajoMinimo } from '../../src/modules/inventario/domain/material.js';
import {
  crearExistenciaProductoTerminado,
  registrarEntrega,
  cantidadPendiente,
} from '../../src/modules/inventario/domain/productoTerminado.js';
import {
  StockInsuficienteError,
  MaterialesNoRegistradosError,
  EntregaInvalidaError,
  InventarioInvalidoError,
} from '../../src/modules/inventario/domain/errores.js';
import { USUARIOS, CLIENTE_ID, crearIdsSecuenciales } from '../helpers/fakes.js';

const F = new Date('2026-11-16T10:00:00.000Z');

function materialCon(stock, extra = {}) {
  const m = crearMaterial({ id: extra.id ?? 'm1', codigo: extra.codigo ?? 'PAP-BOND-75', nombre: 'Bond 75g', categoria: 'PAPEL', unidad: 'pliego', stockMinimo: 100, fecha: F });
  return stock > 0 ? registrarEntrada(m, { movimientoId: 'mv0', cantidad: stock, usuario: USUARIOS.almacen, fecha: F }).material : m;
}

describe('Material', () => {
  it('se crea con stock 0 y valida categoría', () => {
    expect(materialCon(0)).toMatchObject({ stockActual: 0, version: 1 });
    expect(() => crearMaterial({ id: 'x', codigo: 'X', nombre: 'X', categoria: 'MADERA', unidad: 'u', fecha: F })).toThrow(
      InventarioInvalidoError,
    );
  });

  it('registrarEntrada suma stock, incrementa versión y genera movimiento', () => {
    const { material, movimiento } = registrarEntrada(materialCon(10), {
      movimientoId: 'mv1', cantidad: 5.5, usuario: USUARIOS.almacen, fecha: F,
    });
    expect(material).toMatchObject({ stockActual: 15.5, version: 3 });
    expect(movimiento).toMatchObject({ tipo: 'ENTRADA', cantidad: 5.5, stockResultante: 15.5, usuario: USUARIOS.almacen });
  });

  it('evita errores de coma flotante', () => {
    let m = materialCon(0);
    for (let i = 0; i < 3; i++) m = registrarEntrada(m, { movimientoId: `x${i}`, cantidad: 0.1, usuario: USUARIOS.almacen, fecha: F }).material;
    expect(m.stockActual).toBe(0.3);
  });

  it('estaBajoMinimo', () => {
    expect(estaBajoMinimo(materialCon(100))).toBe(true);
    expect(estaBajoMinimo(materialCon(101))).toBe(false);
  });
});

describe('planificarDescuento', () => {
  const ctx = () => ({ referencia: { tipo: 'ORDEN_PRODUCCION', id: 'op1' }, usuario: USUARIOS.ventas, fecha: F, generarId: crearIdsSecuenciales().generar });

  it('descuenta todos los materiales y genera movimientos de SALIDA', () => {
    const papel = materialCon(1000);
    const tinta = materialCon(5, { id: 'm2', codigo: 'TIN-CYAN' });
    const plan = planificarDescuento([papel, tinta], [{ materialId: 'm1', cantidad: 300 }, { materialId: 'm2', cantidad: 1.25 }], ctx());
    expect(plan.cambios.map((c) => [c.material.id, c.material.stockActual, c.versionEsperada, c.material.version])).toEqual([
      ['m1', 700, 2, 3],
      ['m2', 3.75, 2, 3],
    ]);
    expect(plan.movimientos.every((m) => m.tipo === 'SALIDA' && m.referencia.id === 'op1')).toBe(true);
  });

  it('es todo o nada: si falta stock de uno, no descuenta ninguno', () => {
    const papel = materialCon(1000);
    const tinta = materialCon(1, { id: 'm2', codigo: 'TIN-CYAN' });
    const err = (() => {
      try { planificarDescuento([papel, tinta], [{ materialId: 'm1', cantidad: 10 }, { materialId: 'm2', cantidad: 2 }], ctx()); }
      catch (e) { return e; }
    })();
    expect(err).toBeInstanceOf(StockInsuficienteError);
    expect(err.detalles.faltantes).toEqual([{ materialId: 'm2', requerido: 2, disponible: 1 }]);
    expect(papel.stockActual).toBe(1000);
  });

  it('agrupa líneas repetidas del mismo material', () => {
    const plan = planificarDescuento([materialCon(10)], [{ materialId: 'm1', cantidad: 4 }, { materialId: 'm1', cantidad: 6 }], ctx());
    expect(plan.cambios[0].material.stockActual).toBe(0);
    expect(plan.movimientos).toHaveLength(1);
    expect(() => planificarDescuento([materialCon(10)], [{ materialId: 'm1', cantidad: 6 }, { materialId: 'm1', cantidad: 6 }], ctx())).toThrow(
      StockInsuficienteError,
    );
  });

  it('rechaza materiales no registrados', () => {
    expect(() => planificarDescuento([], [{ materialId: 'zz', cantidad: 1 }], ctx())).toThrow(MaterialesNoRegistradosError);
  });
});

describe('Stock específico: productos terminados y sellos', () => {
  const sello = (extra = {}) =>
    crearExistenciaProductoTerminado({
      id: 'e1', ordenId: 'op1', codigoOrden: 'OP-2026-000001', clienteId: CLIENTE_ID, tipoProducto: 'SELLO',
      descripcion: 'Sello automático empresa', cantidad: 3, especificacionSello: { modelo: 'Trodat 4912' },
      usuario: USUARIOS.almacen, fecha: F, ...extra,
    });

  it('ingresa como PENDIENTE_ENTREGA', () => {
    expect(sello()).toMatchObject({ estado: 'PENDIENTE_ENTREGA', cantidadEntregada: 0, especificacionSello: { modelo: 'Trodat 4912' } });
    expect(cantidadPendiente(sello())).toBe(3);
  });

  it('un sello requiere especificación', () => {
    expect(() => sello({ especificacionSello: null })).toThrow(InventarioInvalidoError);
  });

  it('entregas parciales y total', () => {
    let e = registrarEntrega(sello(), { cantidad: 1, recibidoPor: 'Carlos (cliente)', usuario: USUARIOS.almacen, fecha: F });
    expect(e).toMatchObject({ estado: 'ENTREGA_PARCIAL', cantidadEntregada: 1, version: 2 });
    e = registrarEntrega(e, { cantidad: 2, usuario: USUARIOS.almacen, fecha: F });
    expect(e).toMatchObject({ estado: 'ENTREGADO', cantidadEntregada: 3 });
    expect(e.entregas).toHaveLength(2);
    expect(() => registrarEntrega(e, { cantidad: 1, usuario: USUARIOS.almacen, fecha: F })).toThrow(/totalidad/);
  });

  it('no permite entregar más de lo pendiente', () => {
    expect(() => registrarEntrega(sello(), { cantidad: 4, usuario: USUARIOS.almacen, fecha: F })).toThrow(EntregaInvalidaError);
  });
});
