import { z } from "zod";
import {
  ACABADOS_GRAN_FORMATO,
  COLORES_TINTA,
  FORMATOS_PAPELERIA,
  LAMINADOS,
  LUGARES_ENGOMADO,
  ORIENTACIONES_PERFORACION,
  TAMANOS_PAPELERIA,
  TIPOS_DOCUMENTO,
  TIPOS_PAPEL,
} from "@markenny/contrato/dominio";
import { esAnteriorAHoy, parseFecha } from "@/lib/fechas";

/** Fecha "AAAA-MM-DD" válida y no anterior a hoy (común a todas las fichas). */
const fechaEntregaSchema = z
  .string()
  .min(1, "Indica la fecha de entrega")
  .refine((value) => !Number.isNaN(parseFecha(value).getTime()), {
    message: "Fecha inválida",
  })
  .refine((value) => !esAnteriorAHoy(value), {
    message: "La fecha de entrega no puede ser anterior a hoy",
  });

export const ordenTrabajoSchema = z.object({
  clienteId: z.string().min(1, "Selecciona el cliente de la orden"),
  producto: z
    .string()
    .trim()
    .min(3, "Describe el producto (mínimo 3 caracteres)")
    .max(120, "Máximo 120 caracteres"),
  descripcion: z
    .string()
    .trim()
    .max(280, "Máximo 280 caracteres")
    .optional()
    .or(z.literal("")),
  tecnologia: z.enum(["OFFSET", "DIGITAL", "GRAN_FORMATO", "FLEXOGRAFIA"]),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]),
  /** Asignación de taller opcional: vacío = "Sin asignar". */
  maquina: z.string().trim().max(80),
  cantidad: z
    .number({ error: "Indica una cantidad válida" })
    .int("Debe ser un número entero")
    .min(1, "La cantidad debe ser mayor a cero")
    .max(1_000_000, "Cantidad fuera de rango"),
  anchoMm: z
    .number({ error: "Indica el ancho en mm" })
    .min(10, "Mínimo 10 mm")
    .max(3000, "Máximo 3000 mm"),
  altoMm: z
    .number({ error: "Indica el alto en mm" })
    .min(10, "Mínimo 10 mm")
    .max(3000, "Máximo 3000 mm"),
  sustratoId: z.string().min(1, "Selecciona el sustrato"),
  tintasTiro: z.number().int().min(0).max(8),
  tintasRetiro: z.number().int().min(0).max(8),
  tintasPantone: z.array(z.string()),
  acabados: z.array(z.string()),
  fechaEntrega: fechaEntregaSchema,
  observaciones: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type OrdenTrabajoFormValues = z.infer<typeof ordenTrabajoSchema>;

export const ORDEN_TRABAJO_DEFAULTS: Partial<OrdenTrabajoFormValues> = {
  clienteId: "",
  producto: "",
  descripcion: "",
  tecnologia: "OFFSET",
  prioridad: "MEDIA",
  maquina: "",
  cantidad: 1000,
  anchoMm: 210,
  altoMm: 297,
  sustratoId: "couche-150",
  tintasTiro: 4,
  tintasRetiro: 0,
  tintasPantone: [],
  acabados: [],
  fechaEntrega: "",
  observaciones: "",
};

/* ------------------------------------------------------------------ */
/* Ficha técnica: papelería corporativa (formato físico de Markenny)   */
/* ------------------------------------------------------------------ */

const textoOpcional = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).optional().or(z.literal(""));

const enteroOpcional = (mensaje: string) =>
  z
    .number({ error: mensaje })
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .optional()
    .or(z.nan().transform(() => undefined));

/**
 * Campos exactos de la Orden de Trabajo impresa: tipo de trabajo (NE., RM.,
 * F., Otro), Talonario/Block, doble cara, partes 1–4 u Otros, numeración N°,
 * perforación, engomado, laminado, color de tinta, papel con gramaje, tamaño,
 * observaciones y fecha de entrega. Ningún campo opcional viene marcado de
 * antemano: el vendedor marca lo que pide el cliente.
 */
export const papeleriaSchema = z
  .object({
    clienteId: z.string().min(1, "Selecciona el cliente"),
    nombreDocumento: z
      .string()
      .trim()
      .min(3, "Indica el nombre del documento (mínimo 3 caracteres)")
      .max(120, "Máximo 120 caracteres"),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO, { error: "Marca el tipo de trabajo" }),
    tipoDocumentoOtro: textoOpcional(60),
    formato: z.enum(FORMATOS_PAPELERIA, { error: "Marca Talonario o Block" }),
    dobleCara: z.boolean(),
    cantidad: z
      .number({ error: "Indica la cantidad" })
      .int("Debe ser un número entero")
      .min(1, "La cantidad debe ser mayor a cero")
      .max(200_000, "Cantidad fuera de rango"),
    partes: z
      .number({ error: "Indica las partes" })
      .int("Debe ser un número entero")
      .min(1, "Mínimo 1 parte")
      .max(10, "Máximo 10 partes"),
    usaNumeracion: z.boolean(),
    numeracionPrefijo: textoOpcional(12),
    numeracionDesde: enteroOpcional("Indica el número inicial"),
    numeracionHasta: enteroOpcional("Indica el número final"),
    perforacion: z.boolean(),
    perforacionOrientacion: z.enum(ORIENTACIONES_PERFORACION).optional(),
    engomado: z.enum(LUGARES_ENGOMADO).optional(),
    laminado: z.enum(LAMINADOS).optional(),
    coloresTinta: z.array(z.enum(COLORES_TINTA)).min(1, "Marca al menos un color de tinta"),
    pantone: textoOpcional(40),
    colorTintaOtro: textoOpcional(40),
    tipoPapel: z.enum([...TIPOS_PAPEL, "OTRO"], { error: "Marca el papel" }),
    tipoPapelOtro: textoOpcional(60),
    gramaje: z
      .number({ error: "Indica el gramaje" })
      .min(30, "Mínimo 30 g")
      .max(400, "Máximo 400 g")
      .optional()
      .or(z.nan().transform(() => undefined)),
    tamano: z.enum(TAMANOS_PAPELERIA, { error: "Marca el tamaño" }),
    tamanoOtro: textoOpcional(40),
    fechaEntrega: fechaEntregaSchema,
    observaciones: textoOpcional(500),
  })
  .superRefine((values, ctx) => {
    const exigir = (condicion: boolean, path: string, message: string) => {
      if (condicion) ctx.addIssue({ code: "custom", path: [path], message });
    };
    exigir(values.tipoDocumento === "OTRO" && !values.tipoDocumentoOtro, "tipoDocumentoOtro", "Indica qué documento es");
    exigir(values.tipoPapel === "OTRO" && !values.tipoPapelOtro, "tipoPapelOtro", "Indica qué papel");
    exigir(values.tamano === "OTRO" && !values.tamanoOtro, "tamanoOtro", "Indica el tamaño");
    exigir(values.coloresTinta.includes("PANTONE") && !values.pantone, "pantone", "Indica la referencia Pantone");
    exigir(values.coloresTinta.includes("OTRO") && !values.colorTintaOtro, "colorTintaOtro", "Indica el color");
    exigir(values.perforacion && !values.perforacionOrientacion, "perforacionOrientacion", "Marca Horizontal o Vertical");
    if (values.usaNumeracion) {
      exigir(values.numeracionDesde === undefined, "numeracionDesde", "Indica el número inicial");
      exigir(values.numeracionHasta === undefined, "numeracionHasta", "Indica el número final");
      exigir(
        values.numeracionDesde !== undefined &&
          values.numeracionHasta !== undefined &&
          values.numeracionHasta < values.numeracionDesde,
        "numeracionHasta",
        "El número final debe ser mayor o igual al inicial",
      );
    }
  });

export type PapeleriaFormInput = z.input<typeof papeleriaSchema>;
export type PapeleriaFormValues = z.output<typeof papeleriaSchema>;

/** Formulario en blanco: nada viene marcado de antemano. */
export const PAPELERIA_DEFAULTS: Partial<PapeleriaFormInput> = {
  clienteId: "",
  nombreDocumento: "",
  tipoDocumentoOtro: "",
  dobleCara: false,
  cantidad: 1,
  partes: 1,
  usaNumeracion: false,
  numeracionPrefijo: "00-",
  perforacion: false,
  coloresTinta: [],
  pantone: "",
  colorTintaOtro: "",
  tipoPapelOtro: "",
  tamanoOtro: "",
  fechaEntrega: "",
  observaciones: "",
};

/* ------------------------------------------------------------------ */
/* Ficha técnica: gran formato y adhesivos                             */
/* ------------------------------------------------------------------ */

export const granFormatoSchema = z.object({
  clienteId: z.string().min(1, "Selecciona el cliente"),
  tipoGranFormato: z.enum([
    "PENDON",
    "STICKER",
    "VINIL",
    "LONA",
    "BACKING",
    "ROTULO",
    "OTRO",
  ]),
  producto: z
    .string()
    .trim()
    .min(3, "Describe la pieza (mínimo 3 caracteres)")
    .max(120, "Máximo 120 caracteres"),
  descripcion: z
    .string()
    .trim()
    .max(280, "Máximo 280 caracteres")
    .optional()
    .or(z.literal("")),
  cantidad: z
    .number({ error: "Indica la cantidad" })
    .int("Debe ser un número entero")
    .min(1, "La cantidad debe ser mayor a cero")
    .max(10_000, "Cantidad fuera de rango"),
  ancho: z
    .number({ error: "Indica el ancho" })
    .min(0.1, "Mínimo 0,1")
    .max(100, "Máximo 100"),
  alto: z
    .number({ error: "Indica el alto" })
    .min(0.1, "Mínimo 0,1")
    .max(100, "Máximo 100"),
  unidadDimension: z.enum(["cm", "m"]),
  sustratoId: z.string().min(1, "Selecciona el sustrato"),
  resolucionDpi: z
    .number({ error: "Indica la resolución" })
    .int()
    .min(72, "Mínimo 72 dpi")
    .max(1440, "Máximo 1440 dpi"),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]),
  /** Solo "Laminado mate", "Laminado brillante" y "Corte con plotter". */
  acabados: z.array(z.enum(ACABADOS_GRAN_FORMATO)),
  fechaEntrega: fechaEntregaSchema,
  observaciones: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type GranFormatoFormValues = z.infer<typeof granFormatoSchema>;

export const GRAN_FORMATO_DEFAULTS: Partial<GranFormatoFormValues> = {
  clienteId: "",
  tipoGranFormato: "PENDON",
  producto: "",
  descripcion: "",
  cantidad: 10,
  ancho: 1,
  alto: 2,
  unidadDimension: "m",
  sustratoId: "",
  resolucionDpi: 720,
  prioridad: "MEDIA",
  acabados: [],
  fechaEntrega: "",
  observaciones: "",
};

export const cotizacionSchema = z.object({
  tecnologia: z.enum(["OFFSET", "DIGITAL", "GRAN_FORMATO"]),
  tiraje: z
    .number({ error: "Indica el tiraje" })
    .int()
    .min(1, "El tiraje debe ser mayor a cero"),
  anchoMm: z.number().min(10, "Mínimo 10 mm").max(3000, "Máximo 3000 mm"),
  altoMm: z.number().min(10, "Mínimo 10 mm").max(3000, "Máximo 3000 mm"),
  tintasTiro: z.number().int().min(0).max(8),
  tintasRetiro: z.number().int().min(0).max(8),
  sustratoId: z.string().min(1, "Selecciona un sustrato"),
  acabados: z.array(z.string()),
  margen: z.number().min(10, "Mínimo 10%").max(80, "Máximo 80%"),
});

export type CotizacionFormValues = z.infer<typeof cotizacionSchema>;

export const clienteSchema = z.object({
  nombre: z.string().trim().min(3, "Razón social requerida"),
  rif: z
    .string()
    .trim()
    .min(8, "RIF requerido")
    .regex(/^[VJEGP]-?\d{6,9}-?\d?$/i, "Formato de RIF inválido (J-12345678-9)"),
  contacto: z.string().trim().min(3, "Nombre del contacto requerido"),
  telefono: z.string().trim().min(10, "Teléfono requerido"),
  email: z.string().trim().email("Correo inválido"),
  ciudad: z.string().min(1, "Selecciona una ciudad"),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;

export const COTIZACION_DEFAULTS: CotizacionFormValues = {
  tecnologia: "OFFSET",
  tiraje: 1000,
  anchoMm: 210,
  altoMm: 297,
  tintasTiro: 4,
  tintasRetiro: 0,
  sustratoId: "couche-150",
  acabados: [],
  margen: 35,
};
