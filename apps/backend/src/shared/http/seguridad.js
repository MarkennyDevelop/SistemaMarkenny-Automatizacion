// Protecciones HTTP para despliegue web.
//
//  - Cabeceras de seguridad (helmet): sin sniffing de tipos, sin incrustar la
//    API en iframes, HSTS en producción, CSP restrictiva (la API solo sirve JSON).
//  - Límite de peticiones por IP y uno estricto para login e instalación
//    (fuerza bruta de contraseñas).
//  - CSRF: la cookie ya es SameSite=Lax; además se rechazan peticiones que
//    cambian datos si el navegador indica que vienen de otro sitio.
//  - 404 con el formato de error del contrato, sin revelar rutas internas.
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { PREFIJO_API } from '@markenny/contrato';

const METODOS_QUE_CAMBIAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Límites estrictos por ruta (método + ruta completa); los aplica `registrarApi`. */
export const LIMITES_ESTRICTOS = Object.freeze({
  [`POST ${PREFIJO_API}/auth/login`]: { max: 10, timeWindow: '15 minutes' },
  [`POST ${PREFIJO_API}/auth/setup-admin`]: { max: 5, timeWindow: '15 minutes' },
  [`POST ${PREFIJO_API}/usuarios/:id/password`]: { max: 10, timeWindow: '15 minutes' },
});

/**
 * ¿La petición viene de un origen permitido?
 * - Sin cabecera Origin (curl, apps nativas, navegadores antiguos en GET) se
 *   decide con Sec-Fetch-Site: si el navegador dice "cross-site", se rechaza.
 * - Con Origin: debe coincidir con el host de la petición (mismo origen, como
 *   con el proxy de Vite) o estar en la lista ORIGENES_PERMITIDOS.
 */
export function origenPermitido(headers, permitidos = []) {
  const origen = headers.origin;
  if (!origen) return headers['sec-fetch-site'] !== 'cross-site';
  if (origen === 'null') return false;
  try {
    const { host } = new URL(origen);
    return host === headers.host || permitidos.includes(origen);
  } catch {
    return false;
  }
}

/**
 * @param {{ produccion: boolean, origenesPermitidos: string[], limiteGlobal?: number }} opciones
 */
export const seguridadPlugin = fp(async function seguridadPlugin(fastify, { produccion, origenesPermitidos, limiteGlobal = 600 }) {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    hsts: produccion ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  });

  await fastify.register(rateLimit, {
    global: true,
    max: limiteGlobal,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, contexto) => ({
      statusCode: 429,
      error: 'DEMASIADOS_INTENTOS',
      mensaje: `Demasiadas peticiones. Intenta de nuevo en ${Math.ceil(contexto.ttl / 1000)} s.`,
    }),
  });

  fastify.addHook('onRequest', async (req, reply) => {
    if (METODOS_QUE_CAMBIAN.has(req.method) && !origenPermitido(req.headers, origenesPermitidos)) {
      return reply.code(403).send({ error: 'ORIGEN_NO_PERMITIDO', mensaje: 'Petición rechazada: origen no permitido' });
    }
  });

  fastify.setNotFoundHandler((_req, reply) =>
    reply.code(404).send({ error: 'NO_ENCONTRADO', mensaje: 'Recurso no encontrado' }),
  );
});
