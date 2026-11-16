// Fases obligatorias de control de calidad en planta y su grafo de transiciones.
// Código de dominio puro.

export const ESTADOS_PRODUCCION = Object.freeze({
  EN_PROCESO: 'EN_PROCESO',
  EN_REVISION: 'EN_REVISION',
  FINALIZADO: 'FINALIZADO',
  EMPAQUETADO: 'EMPAQUETADO',
});

const { EN_PROCESO, EN_REVISION, FINALIZADO, EMPAQUETADO } = ESTADOS_PRODUCCION;

/** Secuencia lineal obligatoria (camino feliz). */
export const FLUJO_PRODUCCION = Object.freeze([EN_PROCESO, EN_REVISION, FINALIZADO, EMPAQUETADO]);

export const ESTADO_INICIAL = EN_PROCESO;

/**
 * Transiciones permitidas. Cualquier par no listado es ilegal.
 *  - Solo se avanza a la fase inmediatamente siguiente (no se pueden saltar etapas).
 *  - Única transición hacia atrás: EN_REVISION -> EN_PROCESO, cuando la
 *    revisión de calidad rechaza el trabajo (retrabajo). Exige motivo.
 *  - EMPAQUETADO es terminal.
 */
export const TRANSICIONES_PERMITIDAS = Object.freeze({
  [EN_PROCESO]: Object.freeze([EN_REVISION]),
  [EN_REVISION]: Object.freeze([FINALIZADO, EN_PROCESO]),
  [FINALIZADO]: Object.freeze([EMPAQUETADO]),
  [EMPAQUETADO]: Object.freeze([]),
});

/** Transiciones que obligan a registrar un motivo en la auditoría. */
export const TRANSICIONES_CON_MOTIVO = Object.freeze([`${EN_REVISION}->${EN_PROCESO}`]);

export const ESTADOS_TERMINALES = Object.freeze(
  Object.keys(TRANSICIONES_PERMITIDAS).filter((e) => TRANSICIONES_PERMITIDAS[e].length === 0),
);

export function esEstadoValido(estado) {
  return Object.hasOwn(TRANSICIONES_PERMITIDAS, estado);
}
