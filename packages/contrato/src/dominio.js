// Vocabulario y reglas de negocio compartidas por backend y frontend.
// Código puro: sin dependencias. Es la única fuente de verdad de los valores
// que viajan por la API (roles, fases, categorías...).

/** @typedef {'ADMIN' | 'VENDEDOR' | 'PRODUCCION'} Rol */
export const ROLES = Object.freeze(/** @type {const} */ (['ADMIN', 'VENDEDOR', 'PRODUCCION']));

/** Roles que el administrador puede crear desde "Empleados". */
export const ROLES_EMPLEADO = Object.freeze(/** @type {const} */ (['VENDEDOR', 'PRODUCCION']));

/* ------------------------------------------------------------------ */
/* Producción: 4 fases de control de calidad                           */
/* ------------------------------------------------------------------ */

/** @typedef {'EN_PROCESO' | 'EN_REVISION' | 'FINALIZADO' | 'EMPAQUETADO'} FaseProduccion */
export const FASES = Object.freeze(/** @type {const} */ (['EN_PROCESO', 'EN_REVISION', 'FINALIZADO', 'EMPAQUETADO']));

export const FASE_INICIAL = 'EN_PROCESO';

/**
 * Transiciones permitidas. Se avanza de una en una; la única vuelta atrás es
 * el rechazo de calidad EN_REVISION -> EN_PROCESO (retrabajo), que exige motivo.
 */
export const TRANSICIONES = Object.freeze({
  EN_PROCESO: Object.freeze(/** @type {const} */ (['EN_REVISION'])),
  EN_REVISION: Object.freeze(/** @type {const} */ (['FINALIZADO', 'EN_PROCESO'])),
  FINALIZADO: Object.freeze(/** @type {const} */ (['EMPAQUETADO'])),
  EMPAQUETADO: Object.freeze(/** @type {const} */ ([])),
});

/** @param {string} desde @param {string} hacia */
export function transicionPermitida(desde, hacia) {
  return Object.hasOwn(TRANSICIONES, desde) && TRANSICIONES[desde].includes(hacia);
}

/** Retrabajo: vuelve a planta y exige el motivo del rechazo. */
export function requiereMotivo(desde, hacia) {
  return desde === 'EN_REVISION' && hacia === 'EN_PROCESO';
}

/** Fase siguiente del camino normal, o `null` si la orden ya está empaquetada. */
export function siguienteFase(fase) {
  const indice = FASES.indexOf(fase);
  return indice >= 0 && indice < FASES.length - 1 ? FASES[indice + 1] : null;
}

/** Porcentaje de avance que se muestra en el tablero para cada fase. */
export const AVANCE_POR_FASE = Object.freeze({
  EN_PROCESO: 45,
  EN_REVISION: 85,
  FINALIZADO: 98,
  EMPAQUETADO: 100,
});

/** Fases que avisan al vendedor y al administrador. */
export const FASES_CON_AVISO = Object.freeze(/** @type {const} */ (['FINALIZADO', 'EMPAQUETADO']));

/**
 * Estado de entrega al cliente, independiente de las 4 fases de calidad.
 * NO_APLICA: aún no está empaquetada. PENDIENTE: en almacén sin entregar.
 * PARCIAL: se entregó una parte. ENTREGADO: se entregó todo.
 */
export const ESTADOS_ENTREGA = Object.freeze(/** @type {const} */ (['NO_APLICA', 'PENDIENTE', 'PARCIAL', 'ENTREGADO']));

/* ------------------------------------------------------------------ */
/* Ventas                                                              */
/* ------------------------------------------------------------------ */

export const TECNOLOGIAS = Object.freeze(/** @type {const} */ (['OFFSET', 'DIGITAL', 'GRAN_FORMATO', 'FLEXOGRAFIA']));
export const PRIORIDADES = Object.freeze(/** @type {const} */ (['BAJA', 'MEDIA', 'ALTA', 'URGENTE']));
export const CATEGORIAS_TRABAJO = Object.freeze(/** @type {const} */ (['PAPELERIA', 'GRAN_FORMATO', 'GENERAL']));
export const TIPOS_PAPELERIA = Object.freeze(/** @type {const} */ ([
  'FACTURA', 'TALONARIO', 'RECIPE', 'NOTA', 'ORDEN_COMPRA', 'RECIBO', 'CARTA', 'OTRO',
]));
export const TIPOS_GRAN_FORMATO = Object.freeze(/** @type {const} */ ([
  'PENDON', 'STICKER', 'VINIL', 'LONA', 'BACKING', 'ROTULO', 'OTRO',
]));
export const UNIDADES_DIMENSION = Object.freeze(/** @type {const} */ (['cm', 'm']));

/* ------------------------------------------------------------------ */
/* Inventario                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORIAS_INVENTARIO = Object.freeze(/** @type {const} */ ([
  'PAPEL', 'TINTAS', 'PLANCHAS', 'VINILOS', 'SELLOS', 'ALMACEN',
]));
export const UNIDADES_MEDIDA = Object.freeze(/** @type {const} */ ([
  'resma', 'pliego', 'kg', 'litro', 'unidad', 'rollo', 'caja',
]));
export const TIPOS_MOVIMIENTO = Object.freeze(/** @type {const} */ (['ENTRADA', 'SALIDA', 'AJUSTE', 'RESERVA']));

/**
 * Stock resultante de un movimiento: ENTRADA suma; SALIDA, RESERVA y AJUSTE
 * (merma o corrección por conteo) restan. Si el resultado es negativo el
 * servidor rechaza el movimiento: nunca se trunca a cero.
 */
export function stockTrasMovimiento(stock, tipo, cantidad) {
  return tipo === 'ENTRADA' ? stock + cantidad : stock - cantidad;
}

/** Productos guardados en almacén a la espera de entrega. */
export const TIPOS_PRODUCTO_TERMINADO = Object.freeze(/** @type {const} */ (['SELLO', 'PRODUCTO_TERMINADO']));

/* ------------------------------------------------------------------ */
/* Notificaciones                                                      */
/* ------------------------------------------------------------------ */

export const TIPOS_NOTIFICACION = Object.freeze(/** @type {const} */ (['PEDIDO_LISTO', 'FASE', 'STOCK', 'SISTEMA']));

/* ------------------------------------------------------------------ */
/* Errores                                                             */
/* ------------------------------------------------------------------ */

/** Códigos de error estables de la API y su estado HTTP. */
export const ERRORES = Object.freeze({
  CONTRATO_INVALIDO: 400,
  NO_AUTENTICADO: 401,
  CREDENCIALES_INVALIDAS: 401,
  SIN_PERMISO: 403,
  NO_ENCONTRADO: 404,
  ADMIN_YA_REGISTRADO: 409,
  EMAIL_DUPLICADO: 409,
  CODIGO_DUPLICADO: 409,
  TRANSICION_NO_PERMITIDA: 409,
  CONFLICTO_CONCURRENCIA: 409,
  STOCK_INSUFICIENTE: 409,
  ENTREGA_INVALIDA: 422,
  MOTIVO_REQUERIDO: 422,
  REGLA_NEGOCIO: 422,
  ERROR_INTERNO: 500,
});
