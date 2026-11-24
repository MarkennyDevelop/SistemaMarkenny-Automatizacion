// Construye la especificación OpenAPI 3.1 a partir de la tabla de endpoints.
// No hay documentación escrita a mano que pueda desincronizarse del código.
import { z } from 'zod';
import { ENDPOINTS, PREFIJO_API, COOKIE_SESION, SSE_PRODUCCION } from './endpoints.js';
import { ERRORES } from './dominio.js';
import { ErrorApiSchema } from './esquemas.js';

/**
 * JSON Schema 2020-12 (el dialecto de OpenAPI 3.1) con el generador nativo de
 * Zod 4. `io` elige la forma de entrada (peticiones) o de salida (respuestas).
 */
function esquema(zod, modo = 'output') {
  const { $schema: _dialecto, ...json } = z.toJSONSchema(zod, { io: modo, unrepresentable: 'any' });
  return json;
}

function parametros(zod, ubicacion) {
  if (!zod) return [];
  const json = esquema(zod, 'input');
  return Object.entries(json.properties ?? {}).map(([nombre, schema]) => ({
    name: nombre,
    in: ubicacion,
    required: ubicacion === 'path' || (json.required ?? []).includes(nombre),
    schema,
  }));
}

export function generarOpenApi() {
  const paths = {};
  for (const [operationId, ep] of Object.entries(ENDPOINTS)) {
    const ruta = PREFIJO_API + ep.ruta.replace(/:([A-Za-z]+)/g, '{$1}');
    const exito = ep.estadoExito ?? (ep.respuesta ? 200 : 204);
    const respuestas = {
      [exito]: ep.respuesta
        ? { description: 'OK', content: { 'application/json': { schema: esquema(ep.respuesta) } } }
        : { description: 'Sin contenido' },
    };
    for (const codigo of ep.errores) {
      const http = ERRORES[codigo];
      const previo = respuestas[http];
      respuestas[http] = {
        description: previo ? `${previo.description}, ${codigo}` : codigo,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
      };
    }
    paths[ruta] ??= {};
    paths[ruta][ep.metodo.toLowerCase()] = {
      operationId,
      summary: ep.resumen,
      ...(ep.descripcion ? { description: ep.descripcion } : {}),
      tags: [ep.ruta.split('/')[1]],
      security: ep.roles ? [{ cookieSesion: [] }] : [],
      'x-roles': ep.roles ?? 'público',
      parameters: [...parametros(ep.params, 'path'), ...parametros(ep.query, 'query')],
      ...(ep.body
        ? { requestBody: { required: true, content: { 'application/json': { schema: esquema(ep.body, 'input') } } } }
        : {}),
      responses: respuestas,
    };
  }

  paths[PREFIJO_API + SSE_PRODUCCION.ruta] = {
    get: {
      operationId: 'eventosProduccion',
      summary: 'Flujo en tiempo real de cambios de fase (Server-Sent Events)',
      description: `Cada mensaje tiene \`event: ${SSE_PRODUCCION.evento}\`. Un Vendedor solo recibe sus órdenes.`,
      tags: ['produccion'],
      security: [{ cookieSesion: [] }],
      'x-roles': SSE_PRODUCCION.roles,
      responses: {
        200: { description: 'Flujo SSE', content: { 'text/event-stream': { schema: esquema(SSE_PRODUCCION.datos) } } },
      },
    },
  };

  return {
    openapi: '3.1.0',
    info: {
      title: 'Markenny Print MIS — API',
      version: '1.0.0',
      description:
        'Contrato entre el frontend (React) y el backend (Fastify). Generado desde @markenny/contrato; no editar a mano.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Desarrollo' }],
    components: {
      securitySchemes: { cookieSesion: { type: 'apiKey', in: 'cookie', name: COOKIE_SESION } },
      schemas: { ErrorApi: esquema(ErrorApiSchema) },
    },
    paths,
  };
}
