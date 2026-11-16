// Utilidades de inmutabilidad para entidades de dominio. Código puro.

/** Congela recursivamente objetos y arreglos planos. */
export function congelarProfundo(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.freeze(valor);
    for (const v of Object.values(valor)) congelarProfundo(v);
  }
  return valor;
}

/** Convierte un Date válido a ISO-8601; lanza si no es una fecha válida. */
export function aIso(fecha, campo = 'fecha') {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new TypeError(`${campo} debe ser un Date válido`);
  }
  return fecha.toISOString();
}
