import { describe, expect, it } from 'vitest';
import { aplicarMovimiento, crearMaterial, crearProductoTerminado, planificarDescuento, registrarEntrega } from '../../src/modules/inventario/domain/inventario.js';
import { ACTORES, crearIdsSecuenciales } from '../helpers.js';

const F = new Date('2026-11-20T12:00:00.000Z');
const ids = crearIdsSecuenciales('30000000');

function material(stock, id = ids.generar(), sku = `PAP-${id.slice(-4)}`) {
  const m = crearMaterial({ id, sku, nombre: 'Bond 75 g', categoria: 'PAPEL', unidad: 'resma', stockMinimo: 5, fecha: F });
  return stock ? aplicarMovimiento(m, { id: ids.generar(), tipo: 'ENTRADA', cantidad: stock, motivo: 'Compra', actor: ACTORES.produccion, fecha: F }).material : m;
}

describe('movimientos', () => {
  it('una salida mayor al stock se rechaza (no se trunca a cero)', () => {
    expect(() => aplicarMovimiento(material(10), { id: ids.generar(), tipo: 'SALIDA', cantidad: 11, motivo: 'x', actor: ACTORES.produccion, fecha: F })).toThrow(
      expect.objectContaining({ codigo: 'STOCK_INSUFICIENTE' }),
    );
  });

  it('el movimiento guarda responsable y stock resultante redondeado', () => {
    const r = aplicarMovimiento(material(10), { id: ids.generar(), tipo: 'AJUSTE', cantidad: 0.335, motivo: ' Merma ', actor: ACTORES.produccion, fecha: F });
    expect(r.movimiento).toMatchObject({ tipo: 'AJUSTE', cantidad: 0.34, stockResultante: 9.66, usuario: 'Luis Pérez', motivo: 'Merma' });
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
  const p = () => crearProductoTerminado({ id: ids.generar(), descripcion: 'Facturas', cantidad: 3, fecha: F });

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
