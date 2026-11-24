import { describe, expect, it } from 'vitest';
import { aDisponibilidad, aplicarMovimiento, calcularConsumoSustrato, configurarConsumo, crearMaterial, crearProductoTerminado, planificarDescuento, registrarEntrega, verificarStock } from '../../src/modules/inventario/domain/inventario.js';
import { ACTORES, crearIdsSecuenciales } from '../helpers.js';

const F = new Date('2026-11-20T12:00:00.000Z');
const ids = crearIdsSecuenciales('30000000');

function material(stock, id = ids.generar(), sku = `PAP-${id.slice(-4)}`) {
  const m = crearMaterial({ id, sku, nombre: 'Bond 75 g', categoria: 'PAPEL', subtipo: 'BOND', unidad: 'resma', stockMinimo: 5, fecha: F });
  return stock ? aplicarMovimiento(m, { id: ids.generar(), tipo: 'ENTRADA', cantidad: stock, motivo: 'Compra', actor: ACTORES.produccion, fecha: F }).material : m;
}

describe('materias primas', () => {
  it('no admite maquinaria ni categorías fuera de papel, vinil, lona y sello', () => {
    for (const categoria of ['MAQUINARIA', 'PLANCHAS', 'TINTAS', 'ALMACEN']) {
      expect(() => crearMaterial({ id: ids.generar(), sku: 'X', nombre: 'Plotter Mimaki', categoria, unidad: 'unidad', fecha: F })).toThrow(/materias primas/);
    }
    expect(() => crearMaterial({ id: ids.generar(), sku: 'P', nombre: 'Papel', categoria: 'PAPEL', unidad: 'resma', fecha: F })).toThrow(/tipo de papel/);
    expect(crearMaterial({ id: ids.generar(), sku: 'L', nombre: 'Lona', categoria: 'LONA', unidad: 'rollo', fecha: F }).subtipo).toBeNull();
  });

  it('la disponibilidad no expone costo, proveedor ni lote', () => {
    const d = aDisponibilidad(material(3));
    expect(Object.keys(d).sort()).toEqual([
      'categoria', 'disponible', 'id', 'mermaPorcentaje', 'nombre', 'rendimiento', 'stock', 'subtipo', 'unidad',
    ]);
    expect(d).toMatchObject({ subtipo: 'BOND', disponible: true });
    expect(aDisponibilidad(material(0)).disponible).toBe(false);
  });
});

describe('movimientos', () => {
  it('una salida mayor al stock se rechaza (no se trunca a cero)', () => {
    expect(() => aplicarMovimiento(material(10), { id: ids.generar(), tipo: 'SALIDA', cantidad: 11, motivo: 'x', actor: ACTORES.produccion, fecha: F })).toThrow(
      expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }),
    );
  });

  it('el movimiento guarda responsable y stock resultante redondeado a milésimas', () => {
    const r = aplicarMovimiento(material(10), { id: ids.generar(), tipo: 'AJUSTE', cantidad: 0.3354, motivo: ' Merma ', actor: ACTORES.produccion, fecha: F });
    expect(r.movimiento).toMatchObject({ tipo: 'AJUSTE', cantidad: 0.335, stockResultante: 9.665, usuario: 'Luis Pérez', motivo: 'Merma' });
    expect(r.material.version).toBe(3);
  });

  it('el descuento por orden es todo o nada', () => {
    const papel = material(100);
    const tinta = material(1);
    expect(() =>
      planificarDescuento([papel, tinta], [{ materialId: papel.id, cantidad: 10 }, { materialId: tinta.id, cantidad: 2 }], {
        ordenId: ids.generar(), codigo: 'OT-2026-0001', actor: ACTORES.vendedor, fecha: F, generarId: () => ids.generar(),
      }),
    ).toThrow(expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }));
  });
});

describe('productos terminados', () => {
  const p = () => crearProductoTerminado({ id: ids.generar(), tipo: 'TALONARIO', descripcion: 'Facturas', cantidad: 3, fecha: F });

  it('entregas parciales y total', () => {
    let x = registrarEntrega(p(), { id: ids.generar(), cantidad: 1, recibidoPor: 'Cliente', actor: ACTORES.produccion, fecha: F });
    expect(x).toMatchObject({ estadoEntrega: 'PARCIAL', cantidadEntregada: 1 });
    x = registrarEntrega(x, { id: ids.generar(), cantidad: 2, actor: ACTORES.produccion, fecha: F });
    expect(x.estadoEntrega).toBe('ENTREGADO');
    expect(() => registrarEntrega(x, { id: ids.generar(), cantidad: 1, actor: ACTORES.produccion, fecha: F })).toThrow(
      expect.objectContaining({ codigo: 'ENTREGA_INVALIDA' }),
    );
  });

  it('no se entrega más de lo pendiente', () => {
    expect(() => registrarEntrega(p(), { id: ids.generar(), cantidad: 4, actor: ACTORES.produccion, fecha: F })).toThrow(/Solo quedan 3/);
  });
});

describe('consumo de sustrato (gran formato)', () => {
  const vinil = (extra = {}) =>
    crearMaterial({ id: ids.generar(), sku: `VIN-${ids.generar().slice(-4)}`, nombre: 'Vinil clear', categoria: 'VINIL', unidad: 'rollo', fecha: F, ...extra });

  it('convierte m² a rollos con el rendimiento y la merma del material', () => {
    const m = vinil({ rendimiento: 61, mermaPorcentaje: 10 });
    // 20 stickers de 30 × 45 cm = 2,7 m²; +10 % = 2,97 m²; ÷ 61 = 0,0487 → 0,049 rollo
    const c = calcularConsumoSustrato(m, { especificaciones: { ancho: 30, alto: 45, unidadDimension: 'cm' }, cantidad: 20 });
    expect(c.m2).toBeCloseTo(2.7);
    expect(c.cantidad).toBe(0.049);
  });

  it('sin rendimiento configurado no calcula cantidad (la orden se crea y se avisa)', () => {
    const c = calcularConsumoSustrato(vinil(), { especificaciones: { ancho: 1, alto: 2, unidadDimension: 'm' }, cantidad: 1 });
    expect(c).toEqual({ m2: 2, cantidad: null });
  });

  it('rechaza sustratos que no son vinil o lona y órdenes sin medidas', () => {
    expect(() => calcularConsumoSustrato(material(5), { especificaciones: { ancho: 1, alto: 1, unidadDimension: 'm' }, cantidad: 1 })).toThrow(/no es un vinil/);
    expect(() => calcularConsumoSustrato(vinil({ rendimiento: 61 }), { especificaciones: {}, cantidad: 1 })).toThrow(/ancho, alto y unidad/);
  });

  it('el rendimiento solo aplica a viniles y lonas; la merma va de 0 a 100 %', () => {
    expect(() => crearMaterial({ id: ids.generar(), sku: 'S', nombre: 'Sello', categoria: 'SELLO', unidad: 'unidad', rendimiento: 5, fecha: F })).toThrow(/viniles y lonas/);
    expect(() => configurarConsumo(vinil(), { rendimiento: 61, mermaPorcentaje: 120, fecha: F })).toThrow(/merma/);
    const c = configurarConsumo(vinil(), { rendimiento: 80, mermaPorcentaje: 3, fecha: F });
    expect(c).toMatchObject({ rendimiento: 80, mermaPorcentaje: 3, version: 2 });
  });

  it('el mensaje de stock insuficiente dice qué material, cuánto se necesita y cuánto hay', () => {
    const m = aplicarMovimiento(vinil({ rendimiento: 61 }), { id: ids.generar(), tipo: 'ENTRADA', cantidad: 0.04, motivo: 'Compra', actor: ACTORES.produccion, fecha: F }).material;
    expect(() => verificarStock([m], [{ materialId: m.id, cantidad: 0.049 }])).toThrow(/«Vinil clear»: la orden necesita 0,049 rollo y hay 0,04/);
  });
});
