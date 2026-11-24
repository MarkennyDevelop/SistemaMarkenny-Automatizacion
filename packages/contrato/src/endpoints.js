// Tabla de endpoints de la API v1. Es el contrato ejecutable:
//  - el backend registra cada ruta y valida con estos esquemas;
//  - el cliente HTTP del frontend genera un método por endpoint;
//  - `scripts/generar-openapi.js` produce la documentación OpenAPI.
//
// `roles`: quién puede llamar. `null` = público (sin sesión).
// `params` / `query` / `body`: esquemas de entrada. `respuesta`: esquema de la
// respuesta exitosa (`null` = 204 sin cuerpo).
import { z } from 'zod';
import * as e from './esquemas.js';

export const PREFIJO_API = '/api/v1';

/** Nombre de la cookie de sesión (httpOnly, SameSite=Lax, Secure en producción). */
export const COOKIE_SESION = 'markenny_sesion';

const TODOS = ['ADMIN', 'VENDEDOR', 'PRODUCCION'];
const ADMIN = ['ADMIN'];
const VENTAS = ['ADMIN', 'VENDEDOR'];
const PLANTA = ['ADMIN', 'PRODUCCION'];

/**
 * @typedef {Object} Endpoint
 * @property {'GET'|'POST'|'PATCH'|'DELETE'} metodo
 * @property {string} ruta            Relativa a PREFIJO_API, con `:param`.
 * @property {string[] | null} roles
 * @property {string} resumen
 * @property {string} [descripcion]
 * @property {import('zod').ZodTypeAny} [params]
 * @property {import('zod').ZodTypeAny} [query]
 * @property {import('zod').ZodTypeAny} [body]
 * @property {import('zod').ZodTypeAny | null} respuesta
 * @property {number} [estadoExito]   Por defecto 200 (204 si respuesta es null).
 * @property {string[]} errores        Códigos de error esperables (ver ERRORES).
 */

export const ENDPOINTS = Object.freeze({
  /* ---------------------------- Autenticación --------------------------- */
  estadoInstalacion: {
    metodo: 'GET',
    ruta: '/auth/estado',
    roles: null,
    resumen: 'Indica si ya existe el administrador maestro',
    respuesta: e.EstadoInstalacionSchema,
    errores: [],
  },
  registrarAdministrador: {
    metodo: 'POST',
    ruta: '/auth/setup-admin',
    roles: null,
    resumen: 'Registro único del administrador maestro',
    descripcion: 'Solo funciona mientras no exista ningún administrador; inicia la sesión.',
    body: e.SetupAdminSchema,
    respuesta: e.UsuarioPublicoSchema,
    estadoExito: 201,
    errores: ['CONTRATO_INVALIDO', 'ADMIN_YA_REGISTRADO', 'EMAIL_DUPLICADO', 'DEMASIADOS_INTENTOS'],
  },
  login: {
    metodo: 'POST',
    ruta: '/auth/login',
    roles: null,
    resumen: 'Inicia sesión y emite la cookie de sesión',
    descripcion: 'Correo inexistente, contraseña errónea o cuenta inactiva responden igual.',
    body: e.LoginSchema,
    respuesta: e.UsuarioPublicoSchema,
    errores: ['CONTRATO_INVALIDO', 'CREDENCIALES_INVALIDAS', 'DEMASIADOS_INTENTOS'],
  },
  logout: {
    metodo: 'POST',
    ruta: '/auth/logout',
    roles: TODOS,
    resumen: 'Cierra la sesión actual',
    respuesta: null,
    errores: ['NO_AUTENTICADO'],
  },
  sesionActual: {
    metodo: 'GET',
    ruta: '/auth/sesion',
    roles: TODOS,
    resumen: 'Usuario de la sesión actual',
    respuesta: e.UsuarioPublicoSchema,
    errores: ['NO_AUTENTICADO'],
  },

  /* ------------------------------ Empleados ----------------------------- */
  listarUsuarios: {
    metodo: 'GET',
    ruta: '/usuarios',
    roles: ADMIN,
    resumen: 'Lista todas las cuentas',
    respuesta: z.array(e.UsuarioPublicoSchema),
    errores: ['NO_AUTENTICADO', 'SIN_PERMISO'],
  },
  crearEmpleado: {
    metodo: 'POST',
    ruta: '/usuarios',
    roles: ADMIN,
    resumen: 'Crea una cuenta de Vendedor o Producción',
    body: e.CrearEmpleadoSchema,
    respuesta: e.UsuarioPublicoSchema,
    estadoExito: 201,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO', 'EMAIL_DUPLICADO'],
  },
  cambiarEstadoUsuario: {
    metodo: 'PATCH',
    ruta: '/usuarios/:id/estado',
    roles: ADMIN,
    resumen: 'Activa o desactiva una cuenta',
    descripcion: 'No se puede desactivar la propia cuenta ni al último administrador activo.',
    params: e.ParamsIdSchema,
    body: e.CambiarEstadoUsuarioSchema,
    respuesta: e.UsuarioPublicoSchema,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO', 'NO_ENCONTRADO', 'REGLA_NEGOCIO'],
  },
  restablecerPassword: {
    metodo: 'POST',
    ruta: '/usuarios/:id/password',
    roles: ADMIN,
    resumen: 'Asigna una nueva contraseña y cierra las sesiones de ese usuario',
    params: e.ParamsIdSchema,
    body: e.RestablecerPasswordSchema,
    respuesta: null,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO', 'NO_ENCONTRADO'],
  },

  /* ------------------------------- Clientes ----------------------------- */
  listarClientes: {
    metodo: 'GET',
    ruta: '/clientes',
    roles: VENTAS,
    resumen: 'Cartera de clientes',
    respuesta: z.array(e.ClienteSchema),
    errores: ['NO_AUTENTICADO', 'SIN_PERMISO'],
  },
  crearCliente: {
    metodo: 'POST',
    ruta: '/clientes',
    roles: VENTAS,
    resumen: 'Registra un cliente',
    body: e.NuevoClienteSchema,
    respuesta: e.ClienteSchema,
    estadoExito: 201,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO', 'CODIGO_DUPLICADO'],
  },

  /* ------------------------- Órdenes de trabajo ------------------------- */
  listarOrdenes: {
    metodo: 'GET',
    ruta: '/ordenes',
    roles: TODOS,
    resumen: 'Órdenes de trabajo',
    descripcion: 'Un Vendedor solo recibe las órdenes que él creó; Admin y Producción, todas.',
    query: e.FiltroOrdenesSchema,
    respuesta: z.array(e.OrdenTrabajoSchema),
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO'],
  },
  obtenerOrden: {
    metodo: 'GET',
    ruta: '/ordenes/:id',
    roles: TODOS,
    resumen: 'Detalle de una orden con su historial auditado',
    descripcion: 'Un Vendedor recibe 404 si la orden no es suya.',
    params: e.ParamsIdSchema,
    respuesta: e.OrdenTrabajoSchema,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'NO_ENCONTRADO'],
  },
  crearOrden: {
    metodo: 'POST',
    ruta: '/ordenes',
    roles: VENTAS,
    resumen: 'Crea una orden de trabajo y la envía a planta (EN_PROCESO)',
    descripcion:
      'Notifica a Producción y Admin. Publica el evento interno de orden aprobada (descuento de materiales).',
    body: e.NuevaOrdenSchema,
    respuesta: e.OrdenTrabajoSchema,
    estadoExito: 201,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO', 'NO_ENCONTRADO'],
  },
  cambiarFaseOrden: {
    metodo: 'POST',
    ruta: '/ordenes/:id/transiciones',
    roles: PLANTA,
    resumen: 'Avanza (o devuelve a retrabajo) una orden en el control de calidad',
    descripcion:
      'Solo se avanza a la fase siguiente. El retrabajo (EN_REVISION o FINALIZADO -> EN_PROCESO) exige nota ' +
      'con el motivo y solo lo autorizan Producción y Administración; el Vendedor recibe 403 y debe usar ' +
      '/ordenes/:id/notas para solicitarlo. Al llegar a FINALIZADO o EMPAQUETADO se notifica al vendedor; ' +
      'EMPAQUETADO ingresa el producto al almacén.',
    params: e.ParamsIdSchema,
    body: e.TransicionSchema,
    respuesta: e.OrdenTrabajoSchema,
    errores: [
      'CONTRATO_INVALIDO',
      'NO_AUTENTICADO',
      'SIN_PERMISO',
      'NO_ENCONTRADO',
      'TRANSICION_NO_PERMITIDA',
      'MOTIVO_REQUERIDO',
      'CONFLICTO_CONCURRENCIA',
    ],
  },

  agregarNotaOrden: {
    metodo: 'POST',
    ruta: '/ordenes/:id/notas',
    roles: TODOS,
    resumen: 'Deja una observación en la orden o solicita revisión/retrabajo',
    descripcion:
      'Queda en la orden (solo inserción) y notifica a Producción y Administración. Un Vendedor solo puede ' +
      'anotar en sus órdenes; con solicitaRetrabajo=true pide que Producción autorice el retorno a EN_PROCESO.',
    params: e.ParamsIdSchema,
    body: e.NuevaNotaSchema,
    respuesta: e.OrdenTrabajoSchema,
    estadoExito: 201,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'NO_ENCONTRADO'],
  },

  /* ------------------------------ Inventario ---------------------------- */
  disponibilidadInventario: {
    metodo: 'GET',
    ruta: '/inventario/disponibilidad',
    roles: TODOS,
    resumen: 'Insumos disponibles para las fichas de orden de trabajo',
    descripcion: 'Solo nombre, categoría, tipo de papel y existencia: sin costos, proveedores ni lotes.',
    respuesta: z.array(e.DisponibilidadSchema),
    errores: ['NO_AUTENTICADO'],
  },
  listarMateriales: {
    metodo: 'GET',
    ruta: '/inventario/materiales',
    roles: PLANTA,
    resumen: 'Existencias de materiales',
    query: e.FiltroMaterialesSchema,
    respuesta: z.array(e.MaterialSchema),
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO'],
  },
  crearMaterial: {
    metodo: 'POST',
    ruta: '/inventario/materiales',
    roles: ADMIN,
    resumen: 'Registra un material (stock inicial 0; se carga con una ENTRADA)',
    body: e.NuevoMaterialSchema,
    respuesta: e.MaterialSchema,
    estadoExito: 201,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO', 'CODIGO_DUPLICADO'],
  },
  listarMovimientos: {
    metodo: 'GET',
    ruta: '/inventario/movimientos',
    roles: PLANTA,
    resumen: 'Movimientos auditados, del más reciente al más antiguo',
    query: e.FiltroMovimientosSchema,
    respuesta: z.array(e.MovimientoSchema),
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO'],
  },
  registrarMovimiento: {
    metodo: 'POST',
    ruta: '/inventario/movimientos',
    roles: PLANTA,
    resumen: 'Registra una entrada, salida, ajuste o reserva',
    descripcion: 'El responsable es el usuario de la sesión. Rechaza movimientos que dejen stock negativo.',
    body: e.NuevoMovimientoSchema,
    respuesta: e.MovimientoSchema,
    estadoExito: 201,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO', 'NO_ENCONTRADO', 'STOCK_INSUFICIENTE'],
  },
  listarProductosTerminados: {
    metodo: 'GET',
    ruta: '/inventario/productos-terminados',
    roles: PLANTA,
    resumen: 'Producto terminado: órdenes EMPAQUETADAS en almacén pendientes de entrega',
    query: e.FiltroProductosTerminadosSchema,
    respuesta: z.array(e.ProductoTerminadoSchema),
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO'],
  },
  registrarEntrega: {
    metodo: 'POST',
    ruta: '/inventario/productos-terminados/:id/entregas',
    roles: PLANTA,
    resumen: 'Entrega total o parcial al cliente',
    descripcion: 'Al completar la entrega, la orden asociada pasa a estadoEntrega ENTREGADO.',
    params: e.ParamsIdSchema,
    body: e.NuevaEntregaSchema,
    respuesta: e.ProductoTerminadoSchema,
    estadoExito: 201,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'SIN_PERMISO', 'NO_ENCONTRADO', 'ENTREGA_INVALIDA'],
  },

  /* ---------------------------- Notificaciones -------------------------- */
  listarNotificaciones: {
    metodo: 'GET',
    ruta: '/notificaciones',
    roles: TODOS,
    resumen: 'Notificaciones dirigidas al rol del usuario de la sesión',
    respuesta: z.array(e.NotificacionSchema),
    errores: ['NO_AUTENTICADO'],
  },
  marcarNotificacionLeida: {
    metodo: 'POST',
    ruta: '/notificaciones/:id/leida',
    roles: TODOS,
    resumen: 'Marca una notificación como leída por el usuario de la sesión',
    params: e.ParamsIdSchema,
    respuesta: e.NotificacionSchema,
    errores: ['CONTRATO_INVALIDO', 'NO_AUTENTICADO', 'NO_ENCONTRADO'],
  },
  marcarNotificacionesLeidas: {
    metodo: 'POST',
    ruta: '/notificaciones/leidas',
    roles: TODOS,
    resumen: 'Marca como leídas todas las notificaciones del usuario',
    respuesta: e.ResultadoMarcarLeidasSchema,
    errores: ['NO_AUTENTICADO'],
  },
});

/**
 * Flujo de eventos en tiempo real (Server-Sent Events). No pasa por la tabla
 * anterior porque no es petición/respuesta JSON.
 *
 * `GET /api/v1/produccion/eventos` (roles: todos; un Vendedor solo recibe sus
 * órdenes). Cada mensaje: `event: orden.actualizada` y `data:` con
 * `EventoOrdenActualizadaSchema`. El cliente debe invalidar su caché de órdenes.
 */
export const SSE_PRODUCCION = Object.freeze({
  ruta: '/produccion/eventos',
  evento: 'orden.actualizada',
  roles: TODOS,
  datos: e.EventoOrdenActualizadaSchema,
});

/** Ruta completa de un endpoint con sus parámetros sustituidos. */
export function construirRuta(endpoint, params = {}) {
  return (
    PREFIJO_API +
    endpoint.ruta.replace(/:([A-Za-z]+)/g, (_, nombre) => {
      if (params[nombre] === undefined) throw new Error(`Falta el parámetro "${nombre}" para ${endpoint.ruta}`);
      return encodeURIComponent(String(params[nombre]));
    })
  );
}
