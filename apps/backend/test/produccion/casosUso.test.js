import { describe, it, expect, beforeEach } from 'vitest';
import { crearModuloProduccion, InMemoryOrdenRepository } from '../../src/modules/produccion/index.js';
import { EVENTOS } from '../../src/shared/events/catalogo.js';
import { ContratoInvalidoError } from '../../src/shared/application/validacion.js';
import { ConflictoConcurrenciaError, RecursoNoEncontradoError } from '../../src/shared/domain/errors.js';
import { TransicionNoPermitidaError } from '../../src/modules/produccion/domain/errores.js';
import {
  crearRelojFijo,
  crearIdsSecuenciales,
  crearEventBusEspia,
  USUARIOS,
  CLIENTE_ID,
  PEDIDO_ID,
} from '../helpers/fakes.js';

const PAPEL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TINTA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let reloj, eventBus, ordenRepository, cu;

beforeEach(() => {
  reloj = crearRelojFijo();
  eventBus = crearEventBusEspia();
  ordenRepository = new InMemoryOrdenRepository();
  ({ casosUso: cu } = crearModuloProduccion({ ordenRepository, eventBus, reloj, ids: crearIdsSecuenciales() }));
});

const aprobar = (extra = {}) =>
  cu.aprobarOrdenTrabajo({
    pedidoId: PEDIDO_ID,
    clienteId: CLIENTE_ID,
    tipoProducto: 'IMPRESO',
    descripcion: '5000 volantes media carta 4x4',
    cantidad: 5000,
    materiales: [
      { materialId: PAPEL, cantidad: 2600 },
      { materialId: TINTA, cantidad: 0.75 },
    ],
    usuario: USUARIOS.ventas,
    ...extra,
  });

async function mover(ordenId, ...destinos) {
  let r;
  for (const hacia of destinos) {
    reloj.avanzar();
    r = await cu.cambiarEstadoOrden({ ordenId, hacia, usuario: USUARIOS.calidad });
  }
  return r;
}

describe('aprobarOrdenTrabajo', () => {
  it('crea la orden EN_PROCESO, la persiste y devuelve el DTO', async () => {
    const dto = await aprobar();
    expect(dto).toMatchObject({
      codigo: 'OP-2026-000001',
      estado: 'EN_PROCESO',
      version: 1,
      transicionesPermitidas: ['EN_REVISION'],
      creadaEn: '2026-11-16T12:00:00.000Z',
    });
    expect(await ordenRepository.obtenerPorId(dto.id)).toMatchObject({ estado: 'EN_PROCESO' });
  });

  it('publica ORDEN_TRABAJO_APROBADA con los materiales a descontar', async () => {
    const dto = await aprobar();
    expect(eventBus.tipos()).toEqual([EVENTOS.ORDEN_TRABAJO_APROBADA, EVENTOS.ORDEN_ESTADO_CAMBIADO]);
    expect(eventBus.publicados[0].payload).toEqual({
      ordenId: dto.id,
      codigo: 'OP-2026-000001',
      pedidoId: PEDIDO_ID,
      clienteId: CLIENTE_ID,
      tipoProducto: 'IMPRESO',
      cantidad: 5000,
      materiales: [
        { materialId: PAPEL, cantidad: 2600 },
        { materialId: TINTA, cantidad: 0.75 },
      ],
      aprobadaPor: USUARIOS.ventas,
      aprobadaEn: '2026-11-16T12:00:00.000Z',
    });
  });

  it('valida el contrato de entrada con Zod y no persiste ni publica si es inválido', async () => {
    const err = await aprobar({ cantidad: -5, clienteId: 'no-uuid', extra: true }).catch((e) => e);
    expect(err).toBeInstanceOf(ContratoInvalidoError);
    expect(err.issues.map((i) => i.ruta).sort()).toEqual(['', 'cantidad', 'clienteId']);
    expect(await ordenRepository.listar()).toEqual([]);
    expect(eventBus.publicados).toEqual([]);
  });

  it('exige especificación para sellos (contrato)', async () => {
    await expect(aprobar({ tipoProducto: 'SELLO' })).rejects.toMatchObject({
      issues: [expect.objectContaining({ ruta: 'especificacionSello' })],
    });
  });

  it('genera códigos consecutivos', async () => {
    const a = await aprobar();
    const b = await aprobar();
    expect([a.codigo, b.codigo]).toEqual(['OP-2026-000001', 'OP-2026-000002']);
  });
});

describe('cambiarEstadoOrden', () => {
  it('avanza por las 4 fases y registra la auditoría con usuario y fecha', async () => {
    const { id } = await aprobar();
    const final = await mover(id, 'EN_REVISION', 'FINALIZADO', 'EMPAQUETADO');
    expect(final.estado).toBe('EMPAQUETADO');
    expect(final.transicionesPermitidas).toEqual([]);
    expect(final.historial.map((r) => [r.hacia, r.usuario.id, r.fecha])).toEqual([
      ['EN_PROCESO', 'u-ventas-1', '2026-11-16T12:00:00.000Z'],
      ['EN_REVISION', 'u-calidad-1', '2026-11-16T12:01:00.000Z'],
      ['FINALIZADO', 'u-calidad-1', '2026-11-16T12:02:00.000Z'],
      ['EMPAQUETADO', 'u-calidad-1', '2026-11-16T12:03:00.000Z'],
    ]);
  });

  it('publica ORDEN_EMPAQUETADA solo al llegar a EMPAQUETADO', async () => {
    const { id } = await aprobar();
    await mover(id, 'EN_REVISION', 'FINALIZADO');
    expect(eventBus.tipos()).not.toContain(EVENTOS.ORDEN_EMPAQUETADA);
    await mover(id, 'EMPAQUETADO');
    const ev = eventBus.publicados.find((e) => e.tipo === EVENTOS.ORDEN_EMPAQUETADA);
    expect(ev.payload).toMatchObject({ ordenId: id, cantidad: 5000, usuario: USUARIOS.calidad });
  });

  it('rechaza saltos de etapa sin persistir ni publicar nada', async () => {
    const { id } = await aprobar();
    const publicadosAntes = eventBus.publicados.length;
    await expect(cu.cambiarEstadoOrden({ ordenId: id, hacia: 'FINALIZADO', usuario: USUARIOS.calidad })).rejects.toBeInstanceOf(
      TransicionNoPermitidaError,
    );
    expect((await ordenRepository.obtenerPorId(id)).estado).toBe('EN_PROCESO');
    expect(eventBus.publicados).toHaveLength(publicadosAntes);
  });

  it('rechaza estados fuera del catálogo en el contrato', async () => {
    const { id } = await aprobar();
    await expect(cu.cambiarEstadoOrden({ ordenId: id, hacia: 'DESPACHO', usuario: USUARIOS.calidad })).rejects.toBeInstanceOf(
      ContratoInvalidoError,
    );
  });

  it('detecta conflictos de concurrencia con versionEsperada', async () => {
    const { id } = await aprobar();
    await mover(id, 'EN_REVISION'); // versión 2
    await expect(
      cu.cambiarEstadoOrden({ ordenId: id, hacia: 'FINALIZADO', usuario: USUARIOS.calidad, versionEsperada: 1 }),
    ).rejects.toBeInstanceOf(ConflictoConcurrenciaError);
  });

  it('el repositorio rechaza escrituras con versión obsoleta (dos operarios a la vez)', async () => {
    const { id } = await aprobar();
    const vieja = await ordenRepository.obtenerPorId(id);
    await mover(id, 'EN_REVISION');
    await expect(ordenRepository.actualizar({ ...vieja, version: 2 }, 1)).rejects.toBeInstanceOf(ConflictoConcurrenciaError);
  });

  it('falla con NO_ENCONTRADO si la orden no existe', async () => {
    await expect(
      cu.cambiarEstadoOrden({ ordenId: CLIENTE_ID, hacia: 'EN_REVISION', usuario: USUARIOS.calidad }),
    ).rejects.toBeInstanceOf(RecursoNoEncontradoError);
  });
});

describe('consultas', () => {
  it('consultarHistorialOrden devuelve la bitácora de auditoría', async () => {
    const { id, codigo } = await aprobar();
    await mover(id, 'EN_REVISION');
    reloj.avanzar();
    await cu.cambiarEstadoOrden({ ordenId: id, hacia: 'EN_PROCESO', usuario: USUARIOS.calidad, motivo: 'Corte desalineado' });

    const h = await cu.consultarHistorialOrden({ ordenId: id });
    expect(h).toMatchObject({ ordenId: id, codigo, estadoActual: 'EN_PROCESO' });
    expect(h.historial.at(-1)).toMatchObject({ desde: 'EN_REVISION', hacia: 'EN_PROCESO', motivo: 'Corte desalineado' });
  });

  it('listarOrdenes filtra por estado', async () => {
    const a = await aprobar();
    await aprobar();
    await mover(a.id, 'EN_REVISION');
    const enRevision = await cu.listarOrdenes({ estado: 'EN_REVISION' });
    expect(enRevision.map((o) => o.id)).toEqual([a.id]);
    expect(await cu.listarOrdenes({})).toHaveLength(2);
  });
});
