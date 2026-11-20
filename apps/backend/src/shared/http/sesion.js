// Sesión por cookie httpOnly. Resuelve el usuario de cada petición y deja
// `req.usuario` (o null). La validación del token vive en el módulo auth.
import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import { COOKIE_SESION } from '@markenny/contrato';

/**
 * @param {{ resolverSesion: (token: string) => Promise<object|null>, cookieSegura: boolean, duracionHoras: number }} opciones
 */
export const sesionPlugin = fp(async function sesionPlugin(fastify, { resolverSesion, cookieSegura, duracionHoras }) {
  await fastify.register(cookie);
  fastify.decorateRequest('usuario', null);
  fastify.decorateRequest('tokenSesion', null);

  fastify.addHook('onRequest', async (req) => {
    const token = req.cookies?.[COOKIE_SESION];
    if (!token) return;
    req.tokenSesion = token;
    req.usuario = await resolverSesion(token);
  });

  const opcionesCookie = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSegura,
  };

  fastify.decorateReply('abrirSesion', function abrirSesion(token) {
    return this.setCookie(COOKIE_SESION, token, { ...opcionesCookie, maxAge: duracionHoras * 3600 });
  });
  fastify.decorateReply('cerrarSesion', function cerrarSesion() {
    return this.clearCookie(COOKIE_SESION, opcionesCookie);
  });
});
