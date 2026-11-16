// Identificación del usuario actor en las peticiones HTTP.
//
// PROVISIONAL: mientras no exista el módulo de autenticación, el usuario se
// toma de las cabeceras `x-usuario-id`, `x-usuario-nombre` y `x-usuario-rol`.
// Al integrar autenticación (JWT/sesión) solo cambia este archivo: los casos
// de uso ya reciben `usuario` como dato explícito para la auditoría.
import fp from 'fastify-plugin';

function leerCabecera(req, nombre) {
  const v = req.headers[nombre];
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && s.trim() ? s.trim() : undefined;
}

export const usuarioPlugin = fp(async function usuarioPlugin(fastify) {
  fastify.decorateRequest('usuario', null);
  fastify.addHook('onRequest', async (req) => {
    const id = leerCabecera(req, 'x-usuario-id');
    if (!id) return;
    const usuario = { id };
    const nombre = leerCabecera(req, 'x-usuario-nombre');
    const rol = leerCabecera(req, 'x-usuario-rol');
    if (nombre) usuario.nombre = nombre;
    if (rol) usuario.rol = rol;
    req.usuario = usuario;
  });
});

/** preHandler para rutas que modifican datos: exige usuario identificado. */
export async function requiereUsuario(req, reply) {
  if (!req.usuario) {
    return reply.code(401).send({ error: 'NO_AUTENTICADO', mensaje: 'Se requiere un usuario identificado' });
  }
}
