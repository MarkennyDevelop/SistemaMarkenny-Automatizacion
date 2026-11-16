// Validación de contratos de entrada/salida de casos de uso con Zod.

export class ContratoInvalidoError extends Error {
  constructor(contrato, issues) {
    super(`Datos inválidos para "${contrato}"`);
    this.name = 'ContratoInvalidoError';
    this.codigo = 'CONTRATO_INVALIDO';
    this.contrato = contrato;
    this.issues = issues.map((i) => ({ ruta: i.path.join('.'), mensaje: i.message, codigo: i.code }));
  }
}

/**
 * Parsea `datos` con el esquema Zod; lanza ContratoInvalidoError si no cumple.
 * @template {import('zod').ZodTypeAny} S
 * @param {S} esquema
 * @param {unknown} datos
 * @param {string} contrato nombre legible del contrato (para errores)
 * @returns {import('zod').infer<S>}
 */
export function validarContrato(esquema, datos, contrato) {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new ContratoInvalidoError(contrato, r.error.issues);
  return r.data;
}

/**
 * Envuelve un caso de uso: valida la entrada y la salida contra sus contratos.
 * La validación de salida evita filtrar datos internos y detecta regresiones.
 */
export function casoDeUso({ nombre, entrada, salida, ejecutar }) {
  const fn = async (datos) => {
    const comando = validarContrato(entrada, datos, `${nombre}:entrada`);
    const resultado = await ejecutar(comando);
    return salida ? validarContrato(salida, resultado, `${nombre}:salida`) : resultado;
  };
  Object.defineProperty(fn, 'name', { value: nombre });
  return fn;
}
