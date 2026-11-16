// Pruebas del adaptador HTTP (Fastify inject, sin red ni base de datos).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { construirApp } from '../../src/app.js';
import { crearRelojFijo, CLIENTE_ID } from '../helpers/fakes.js';

const H = { 'x-usuario-id': 'u-42', 'x-usuario-nombre': 'María', 'x-usuario-rol': 'SUPERVISOR' };
let app, reloj;

beforeEach(async () => {
  reloj = crearRelojFijo();
  app = await construirApp({ config: { LOG_LEVEL: 'silent' }, overrides: { reloj } });
});
afterEach(() => app.close());

const crearOrden = (body = {}, headers = H) =>
  app.inject({
    method: 'POST',
    url: '/v1/produccion/ordenes',
    headers,
    payload: { clienteId: CLIENTE_ID, tipoProducto: 'IMPRESO', descripcion: 'Tarjetas de presentación', cantidad: 500, ...body },
  });

const transicion = (id, payload, headers = H) =>
  app.inject({ method: 'POST', url: `/v1/produccion/ordenes/${id}/transiciones`, headers, payload });

describe('API de Producción', () => {
  it('GET /salud', async () => {
    const r = await app.inject('/salud');
    expect(r.json()).toEqual({ estado: 'ok', persistencia: 'memoria' });
  });

  it('401 si no hay usuario identificado en operaciones de escritura', async () => {
    const r = await crearOrden({}, {});
    expect(r.statusCode).toBe(401);
  });

  it('400 con detalle si el contrato Zod no se cumple', async () => {
    const r = await crearOrden({ cantidad: 'mil' });
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ error: 'CONTRATO_INVALIDO', detalles: [expect.objectContaining({ ruta: 'cantidad' })] });
  });

  it('flujo completo: crear, transicionar, rechazar salto ilegal y consultar auditoría', async () => {
    const creada = await crearOrden();
    expect(creada.statusCode).toBe(201);
    const { id } = creada.json();

    const salto = await transicion(id, { hacia: 'EMPAQUETADO' });
    expect(salto.statusCode).toBe(409);
    expect(salto.json().error).toBe('TRANSICION_NO_PERMITIDA');

    reloj.avanzar();
    const ok = await transicion(id, { hacia: 'EN_REVISION', versionEsperada: 1 });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ estado: 'EN_REVISION', version: 2 });

    const obsoleta = await transicion(id, { hacia: 'FINALIZADO', versionEsperada: 1 });
    expect(obsoleta.statusCode).toBe(409);
    expect(obsoleta.json().error).toBe('CONFLICTO_CONCURRENCIA');

    const sinMotivo = await transicion(id, { hacia: 'EN_PROCESO' });
    expect(sinMotivo.statusCode).toBe(422);
    expect(sinMotivo.json().error).toBe('MOTIVO_REQUERIDO');

    const historial = (await app.inject(`/v1/produccion/ordenes/${id}/historial`)).json();
    expect(historial.historial.at(-1)).toEqual({
      secuencia: 2,
      desde: 'EN_PROCESO',
      hacia: 'EN_REVISION',
      usuario: { id: 'u-42', nombre: 'María', rol: 'SUPERVISOR' },
      fecha: '2026-11-16T12:01:00.000Z',
      motivo: null,
    });
  });

  it('el usuario de la cabecera prevalece sobre uno enviado en el cuerpo', async () => {
    const r = await crearOrden({ usuario: { id: 'impostor' } });
    expect(r.json().historial[0].usuario.id).toBe('u-42');
  });

  it('404 para órdenes inexistentes y 400 para ids mal formados', async () => {
    expect((await app.inject(`/v1/produccion/ordenes/${CLIENTE_ID}`)).statusCode).toBe(404);
    expect((await app.inject('/v1/produccion/ordenes/abc')).statusCode).toBe(400);
  });
});

describe('API de Inventario', () => {
  it('crear material, registrar entrada, consumo por orden y consulta de pendientes', async () => {
    const mat = await app.inject({
      method: 'POST', url: '/v1/inventario/materiales', headers: H,
      payload: { codigo: 'TIN-PANTONE-485', nombre: 'Pantone 485 C', categoria: 'TINTA', unidad: 'kg', stockMinimo: 1 },
    });
    expect(mat.statusCode).toBe(201);
    const materialId = mat.json().id;

    const entrada = await app.inject({ method: 'POST', url: `/v1/inventario/materiales/${materialId}/entradas`, headers: H, payload: { cantidad: 4 } });
    expect(entrada.json()).toMatchObject({ stockActual: 4, bajoMinimo: false });

    await crearOrden({ materiales: [{ materialId, cantidad: 3.5 }] });
    await app.eventBus.esperarInactividad();

    const [m] = (await app.inject('/v1/inventario/materiales?categoria=TINTA')).json();
    expect(m).toMatchObject({ stockActual: 0.5, bajoMinimo: true });

    const pendientes = await app.inject('/v1/inventario/productos-terminados/pendientes?tipoProducto=SELLO');
    expect(pendientes.statusCode).toBe(200);
    expect(pendientes.json()).toEqual([]);
  });
});
