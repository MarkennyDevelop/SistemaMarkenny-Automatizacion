// Protección contra fuerza bruta en el login.
import { describe, expect, it } from 'vitest';
import { construirApp } from '../../src/app.js';
import { hasherRapido } from '../helpers.js';

describe('límite de intentos', () => {
  it('bloquea el login tras 10 intentos en 15 minutos por IP (429)', async () => {
    const app = await construirApp({ config: { LOG_LEVEL: 'silent' }, overrides: { hasher: hasherRapido } });
    const intentar = () =>
      app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'nadie@markenny.com', password: 'x' } });
    const estados = [];
    for (let i = 0; i < 11; i += 1) estados.push((await intentar()).statusCode);
    expect(estados.slice(0, 10).every((e) => e === 401)).toBe(true);
    const bloqueado = await intentar();
    expect(bloqueado.statusCode).toBe(429);
    expect(bloqueado.json().error).toBe('DEMASIADOS_INTENTOS');
    expect(bloqueado.headers['retry-after']).toBeDefined();
    // Las demás rutas siguen respondiendo.
    expect((await app.inject({ method: 'GET', url: '/api/v1/auth/estado' })).statusCode).toBe(200);
    await app.close();
  });
});
