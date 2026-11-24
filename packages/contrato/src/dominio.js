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
 * Transiciones permitidas. Se avanza de una en una. La única vuelta atrás es
 * el retrabajo hacia EN_PROCESO: desde EN_REVISION (calidad rechaza) o desde
 * FINALIZADO (se detecta un defecto o daño antes de empaquetar). El retrabajo
 * exige motivo y solo lo autorizan Producción o Administración; la orden debe
 * volver a pasar por revisión antes de finalizar otra vez.
 */
export const TRANSICIONES = Object.freeze({
  EN_PROCESO: Object.freeze(/** @type {const} */ (['EN_REVISION'])),
  EN_REVISION: Object.freeze(/** @type {const} */ (['FINALIZADO', 'EN_PROCESO'])),
  FINALIZADO: Object.freeze(/** @type {const} */ (['EMPAQUETADO', 'EN_PROCESO'])),
  EMPAQUETADO: Object.freeze(/** @type {const} */ ([])),
});

/** @param {string} desde @param {string} hacia */
export function transicionPermitida(desde, hacia) {
  return Object.hasOwn(TRANSICIONES, desde) && TRANSICIONES[desde].includes(hacia);
}

/** Retrabajo: la orden vuelve a EN_PROCESO desde una fase posterior. */
export function esRetrabajo(desde, hacia) {
  return hacia === 'EN_PROCESO' && (desde === 'EN_REVISION' || desde === 'FINALIZADO');
}

/** Todo retrabajo exige el motivo (defecto, daño o rechazo de calidad). */
export function requiereMotivo(desde, hacia) {
  return esRetrabajo(desde, hacia);
}

/** Roles que pueden cambiar la fase de una orden (avanzar o devolver a retrabajo). */
export const ROLES_CAMBIO_FASE = Object.freeze(/** @type {const} */ (['PRODUCCION', 'ADMIN']));

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
export const TIPOS_GRAN_FORMATO = Object.freeze(/** @type {const} */ ([
  'PENDON', 'STICKER', 'VINIL', 'LONA', 'BACKING', 'ROTULO', 'OTRO',
]));
export const UNIDADES_DIMENSION = Object.freeze(/** @type {const} */ (['cm', 'm']));

/** Datos fiscales impresos en la orden de trabajo. */
export const EMPRESA = Object.freeze({
  nombre: 'MARKENNY, C.A.',
  rif: 'J-50106023-1',
  domicilioFiscal: 'Calle Las Mercedes, local nro S/N, sector Los Tamarindos, Nº 32, Valencia, Carabobo, zona postal 2003',
  email: 'markennyca@gmail.com',
  telefono: '0424-417.91.20',
  instagram: '@markennyca',
});

/* ---- Formato físico de la Orden de Trabajo de papelería corporativa ---- */

/** Tipo de trabajo: NE. (nota de entrega), RM. (récipe médico), F. (factura), tarjetas de presentación u otro. */
export const TIPOS_DOCUMENTO = Object.freeze(/** @type {const} */ (['NE', 'RM', 'F', 'TARJETAS', 'OTRO']));
/** Presentación: talonario o block. */
export const FORMATOS_PAPELERIA = Object.freeze(/** @type {const} */ (['TALONARIO', 'BLOCK']));
/** Vista del trabajo (orientación de la hoja). */
export const ORIENTACIONES = Object.freeze(/** @type {const} */ (['HORIZONTAL', 'VERTICAL']));
export const LUGARES_ENGOMADO = Object.freeze(/** @type {const} */ (['ARRIBA', 'ABAJO', 'DERECHA', 'IZQUIERDA']));
export const LAMINADOS = Object.freeze(/** @type {const} */ (['BRILLANTE', 'MATE']));
/** Color de tinta (columna "Pantone" del formato). */
export const COLORES_TINTA = Object.freeze(/** @type {const} */ (['NEGRO', 'AZUL', 'VERDE', 'ROJO', 'A_COLOR', 'OTRO']));
/** Papeles que Markenny maneja en almacén (subtipo de los materiales PAPEL). */
export const TIPOS_PAPEL = Object.freeze(/** @type {const} */ (['QUIMICO', 'BOND', 'GLASSE', 'BRISTOL', 'OPALINA', 'FOTOGRAFICO']));
export const TAMANOS_PAPELERIA = Object.freeze(/** @type {const} */ (['CUARTO_CARTA', 'MEDIA_CARTA', 'CARTA', 'TABLOIDE', 'OTRO']));

/**
 * Único acabado de pendones, stickers y viniles. El acabado mate o brillante
 * no se pide aparte: viene en el sustrato elegido del almacén (vinil mate,
 * vinil adhesivo blanco brillante, ...), así no se duplica en la ficha y el
 * descuento de inventario corresponde al material real.
 */
export const ACABADOS_GRAN_FORMATO = Object.freeze(/** @type {const} */ (['Corte con plotter']));

/* ------------------------------------------------------------------ */
/* Inventario                                                          */
/* ------------------------------------------------------------------ */

/**
 * Materias primas de Markenny. El inventario NO registra maquinaria ni
 * equipos (impresoras, plotters...): solo insumos que se consumen.
 */
export const CATEGORIAS_INVENTARIO = Object.freeze(/** @type {const} */ (['PAPEL', 'VINIL', 'LONA', 'SELLO']));
export const UNIDADES_MEDIDA = Object.freeze(/** @type {const} */ (['resma', 'pliego', 'unidad', 'rollo', 'metro', 'caja']));
export const TIPOS_MOVIMIENTO = Object.freeze(/** @type {const} */ (['ENTRADA', 'SALIDA', 'AJUSTE', 'RESERVA']));

/**
 * Stock resultante de un movimiento: ENTRADA suma; SALIDA, RESERVA y AJUSTE
 * (merma o corrección por conteo) restan. Si el resultado es negativo el
 * servidor rechaza el movimiento: nunca se trunca a cero.
 */
export function stockTrasMovimiento(stock, tipo, cantidad) {
  return tipo === 'ENTRADA' ? stock + cantidad : stock - cantidad;
}

/** Productos terminados que se fabrican con esos insumos y esperan entrega en almacén. */
export const TIPOS_PRODUCTO_TERMINADO = Object.freeze(/** @type {const} */ ([
  'PLIEGO_STICKERS', 'TALONARIO', 'BLOCK', 'TARJETAS_PRESENTACION', 'SELLO_PERSONALIZADO', 'PENDON', 'VINIL_ROTULACION',
]));

/**
 * Producto terminado que resulta de una orden cuando la ficha no lo indica:
 * papelería -> talonario o block; pendones y stickers según la pieza.
 */
export function productoTerminadoDe(categoriaTrabajo, especificaciones = {}) {
  if (categoriaTrabajo === 'PAPELERIA') {
    if (especificaciones.tipoDocumento === 'TARJETAS') return 'TARJETAS_PRESENTACION';
    return especificaciones.formato === 'BLOCK' ? 'BLOCK' : 'TALONARIO';
  }
  if (categoriaTrabajo === 'GRAN_FORMATO') {
    if (especificaciones.tipoGranFormato === 'STICKER') return 'PLIEGO_STICKERS';
    if (especificaciones.tipoGranFormato === 'PENDON' || especificaciones.tipoGranFormato === 'LONA') return 'PENDON';
    return 'VINIL_ROTULACION';
  }
  return 'TALONARIO';
}

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
  /** Petición de cambio desde otro sitio (protección CSRF). */
  ORIGEN_NO_PERMITIDO: 403,
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
  /** Límite de intentos (p. ej. login por fuerza bruta). */
  DEMASIADOS_INTENTOS: 429,
  ERROR_INTERNO: 500,
});
