import { describe, it, expect, vi } from 'vitest';
import { NodeEventBus } from '../../src/shared/events/eventBus.js';
import { ContratoInvalidoError } from '../../src/shared/application/validacion.js';
import { EVENTOS } from '../../src/shared/events/catalogo.js';

describe('NodeEventBus', () => {
  it('despacha de forma asíncrona: el emisor no espera a los manejadores', async () => {
    const bus = new NodeEventBus();
    const orden = [];
    bus.suscribir('x', () => orden.push('manejador'));
    bus.publicar('x', {});
    orden.push('emisor');
    await bus.esperarInactividad();
    expect(orden).toEqual(['emisor', 'manejador']);
  });

  it('aísla fallos: un manejador que falla no afecta a los demás ni al emisor', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const bus = new NodeEventBus({ logger });
    const ok = vi.fn();
    bus.suscribir('x', async () => { throw new Error('boom'); });
    bus.suscribir('x', ok);
    expect(() => bus.publicar('x', { a: 1 })).not.toThrow();
    await bus.esperarInactividad();
    expect(ok).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('entrega un sobre con id, tipo, payload y fecha', async () => {
    const bus = new NodeEventBus({ reloj: { ahora: () => new Date('2026-01-01T00:00:00Z') } });
    const recibido = vi.fn();
    bus.suscribir('x', recibido);
    bus.publicar('x', { a: 1 });
    await bus.esperarInactividad();
    expect(recibido.mock.calls[0][0]).toMatchObject({ tipo: 'x', payload: { a: 1 }, ocurridoEn: '2026-01-01T00:00:00.000Z' });
  });

  it('valida el payload de eventos del catálogo al publicar', () => {
    const bus = new NodeEventBus();
    expect(() => bus.publicar(EVENTOS.ORDEN_TRABAJO_APROBADA, { ordenId: 'x' })).toThrow(ContratoInvalidoError);
  });

  it('esperarInactividad incluye eventos encadenados', async () => {
    const bus = new NodeEventBus();
    const fin = vi.fn();
    bus.suscribir('a', () => bus.publicar('b', {}));
    bus.suscribir('b', fin);
    bus.publicar('a', {});
    await bus.esperarInactividad();
    expect(fin).toHaveBeenCalledOnce();
  });

  it('suscribir devuelve una función para desuscribirse', async () => {
    const bus = new NodeEventBus();
    const h = vi.fn();
    const off = bus.suscribir('x', h);
    off();
    bus.publicar('x', {});
    await bus.esperarInactividad();
    expect(h).not.toHaveBeenCalled();
  });
});
