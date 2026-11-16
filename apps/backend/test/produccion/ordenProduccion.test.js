import { describe, it, expect } from 'vitest';
import { crearOrdenProduccion } from '../../src/modules/produccion/domain/ordenProduccion.js';
import { OrdenInvalidaError } from '../../src/modules/produccion/domain/errores.js';
import { USUARIOS, CLIENTE_ID } from '../helpers/fakes.js';

const FECHA = new Date('2026-11-16T08:00:00.000Z');
const MAT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const base = (extra = {}) => ({
  id: 'orden-1',
  codigo: 'OP-2026-000001',
  clienteId: CLIENTE_ID,
  tipoProducto: 'IMPRESO',
  descripcion: 'Talonarios',
  cantidad: 50,
  usuario: USUARIOS.ventas,
  fecha: FECHA,
  ...extra,
});

describe('crearOrdenProduccion', () => {
  it('nace EN_PROCESO, versión 1, con el registro de auditoría de aprobación', () => {
    const orden = crearOrdenProduccion(base({ materiales: [{ materialId: MAT_A, cantidad: 2.5 }] }));
    expect(orden.estado).toBe('EN_PROCESO');
    expect(orden.version).toBe(1);
    expect(orden.creadaEn).toBe('2026-11-16T08:00:00.000Z');
    expect(orden.historial).toEqual([
      {
        secuencia: 1,
        desde: null,
        hacia: 'EN_PROCESO',
        usuario: USUARIOS.ventas,
        fecha: '2026-11-16T08:00:00.000Z',
        motivo: 'Orden de trabajo aprobada',
      },
    ]);
    expect(Object.isFrozen(orden)).toBe(true);
    expect(Object.isFrozen(orden.materiales[0])).toBe(true);
  });

  it('una orden de SELLO requiere especificación de sello', () => {
    expect(() => crearOrdenProduccion(base({ tipoProducto: 'SELLO' }))).toThrow(OrdenInvalidaError);
    const sello = crearOrdenProduccion(
      base({ tipoProducto: 'SELLO', especificacionSello: { modelo: 'Trodat 4912', colorTinta: 'azul' } }),
    );
    expect(sello.especificacionSello).toEqual({ modelo: 'Trodat 4912', colorTinta: 'azul' });
  });

  it('una orden IMPRESO no admite especificación de sello', () => {
    expect(() => crearOrdenProduccion(base({ especificacionSello: { modelo: 'X' } }))).toThrow(/Solo las órdenes de tipo SELLO/);
  });

  it.each([
    ['sin cliente', { clienteId: '' }],
    ['tipo inválido', { tipoProducto: 'LIBRO' }],
    ['cantidad cero', { cantidad: 0 }],
    ['cantidad decimal', { cantidad: 1.5 }],
    ['descripción vacía', { descripcion: '  ' }],
    ['material repetido', { materiales: [{ materialId: MAT_A, cantidad: 1 }, { materialId: MAT_A, cantidad: 2 }] }],
    ['material con cantidad no positiva', { materiales: [{ materialId: MAT_A, cantidad: 0 }] }],
  ])('rechaza orden inválida: %s', (_caso, extra) => {
    expect(() => crearOrdenProduccion(base(extra))).toThrow(OrdenInvalidaError);
  });

  it('requiere usuario aprobador para la auditoría', () => {
    expect(() => crearOrdenProduccion(base({ usuario: undefined }))).toThrow(
      expect.objectContaining({ codigo: 'USUARIO_REQUERIDO' }),
    );
  });
});
