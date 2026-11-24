// Comunicación entre módulos por el EventBus y flujo SSE.
import { describe, expect, it } from 'vitest';
import { COOKIE_SESION } from '@markenny/contrato';
import { construirApp } from '../../src/app.js';
import { EVENTOS } from '../../src/shared/events/catalogo.js';
import { ACTORES, hasherRapido } from '../helpers.js';

async function appConDatos() {
  const app = await construirApp({ config: { LOG_LEVEL: 'silent' }, overrides: { hasher: hasherRapido } });
  const pedir = async (cookie, method, url, payload) => {
    const r = await app.inject({ method, url: `/api/v1${url}`, payload, headers: cookie ? { cookie } : {} });
    return { r, cuerpo: r.body ? r.json() : null };
  };
  const { r } = await pedir(null, 'POST', '/auth/setup-admin', {
    nombre: 'Kenny Hernández', email: 'admin@markenny.com', telefono: '04246512044', password: 'Markenny2026',
  });
  const cookie = `${COOKIE_SESION}=${r.cookies[0].value}`;
  return { app, cookie, pedir: (...a) => pedir(cookie, ...a) };
}

describe('descuento de materias primas al crear una orden (EventBus)', () => {
  it('descuenta todo o nada, es idempotente y avisa si falta stock', async () => {
    const { app, pedir } = await appConDatos();
    const material = async (sku, stock) => {
      const { cuerpo } = await pedir('POST', '/inventario/materiales', { sku, nombre: sku, categoria: 'PAPEL', subtipo: 'BOND', unidad: 'resma' });
      await pedir('POST', '/inventario/movimientos', { materialId: cuerpo.id, tipo: 'ENTRADA', cantidad: stock, motivo: 'Carga inicial' });
      return cuerpo.id;
    };
    const papel = await material('PAP-BOND-75', 100);
    const ordenId = '50000000-0000-4000-8000-000000000001';
    const evento = (materiales) => ({
      ordenId, codigo: 'OT-2026-0009', producto: 'Volantes', clienteNombre: 'Cliente', vendedorId: ACTORES.vendedor.id,
      materiales, actor: ACTORES.vendedor, fecha: '2026-11-20T12:00:00.000Z',
    });

    app.eventBus.publicar(EVENTOS.ORDEN_CREADA, evento([{ materialId: papel, cantidad: 30 }]));
    await app.eventBus.esperarInactividad();
    app.eventBus.publicar(EVENTOS.ORDEN_CREADA, evento([{ materialId: papel, cantidad: 30 }])); // repetido
    await app.eventBus.esperarInactividad();
    let [m] = (await pedir('GET', '/inventario/materiales')).cuerpo;
    expect(m.stock).toBe(70);

    app.eventBus.publicar(EVENTOS.ORDEN_CREADA, {
      ...evento([{ materialId: papel, cantidad: 500 }]),
      ordenId: '50000000-0000-4000-8000-000000000002',
    });
    await app.eventBus.esperarInactividad();
    [m] = (await pedir('GET', '/inventario/materiales')).cuerpo;
    expect(m.stock).toBe(70);
    const avisos = (await pedir('GET', '/notificaciones')).cuerpo;
    expect(avisos.map((a) => a.tipo)).toContain('STOCK');
    await app.close();
  });
});

describe('tiempo real (SSE)', () => {
  it('emite orden.actualizada al cambiar de fase y exige sesión', async () => {
    const { app, cookie, pedir } = await appConDatos();
    const { cuerpo: cliente } = await pedir('POST', '/clientes', {
      nombre: 'Cliente SSE', rif: 'J-12345678-9', contacto: 'Ana', telefono: '0212-5550000', email: 'a@b.com', ciudad: 'Caracas',
    });
    const { cuerpo: orden } = await pedir('POST', '/ordenes', {
      clienteId: cliente.id, producto: 'Pendón', tecnologia: 'GRAN_FORMATO', categoriaTrabajo: 'GRAN_FORMATO', prioridad: 'MEDIA',
      maquina: 'Mimaki JV300', cantidad: 2, sustrato: 'Lona', tintas: [], acabados: [], montoTotal: 10,
      fechaEntrega: '2026-11-27T16:00:00.000Z',
    });
    const direccion = await app.listen({ port: 0, host: '127.0.0.1' });

    expect((await fetch(`${direccion}/api/v1/produccion/eventos`)).status).toBe(401);

    const controlador = new AbortController();
    const res = await fetch(`${direccion}/api/v1/produccion/eventos`, { headers: { cookie }, signal: controlador.signal });
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const lector = res.body.getReader();
    await lector.read(); // ": conectado"

    await pedir('POST', `/ordenes/${orden.id}/transiciones`, { fase: 'EN_REVISION' });
    const { value } = await lector.read();
    const texto = new TextDecoder().decode(value);
    expect(texto).toContain('event: orden.actualizada');
    const datos = JSON.parse(texto.split('data: ')[1]);
    expect(datos).toMatchObject({ ordenId: orden.id, fase: 'EN_REVISION', anterior: 'EN_PROCESO', version: 2, usuario: 'Kenny Hernández' });

    controlador.abort();
    await app.close();
  });
});
