import { z } from "zod";
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
  maquina: z.string().min(1, "Selecciona la máquina asignada"),
  cantidad: z
    .number({ invalid_type_error: "Indica una cantidad válida" })
    .int("Debe ser un número entero")
    .min(1, "La cantidad debe ser mayor a cero")
    .max(1_000_000, "Cantidad fuera de rango"),
  anchoMm: z
    .number({ invalid_type_error: "Indica el ancho en mm" })
    .min(10, "Mínimo 10 mm")
    .max(3000, "Máximo 3000 mm"),
  altoMm: z
    .number({ invalid_type_error: "Indica el alto en mm" })
    .min(10, "Mínimo 10 mm")
    .max(3000, "Máximo 3000 mm"),
  sustratoId: z.string().min(1, "Selecciona el sustrato"),
  tintasTiro: z.number().int().min(0).max(8),
  tintasRetiro: z.number().int().min(0).max(8),
  tintasPantone: z.array(z.string()).default([]),
  acabados: z.array(z.string()).default([]),
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
  maquina: "Heidelberg SM 52",
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
/* Ficha técnica: papelería corporativa                                */
/* ------------------------------------------------------------------ */

export const papeleriaSchema = z
  .object({
    clienteId: z.string().min(1, "Selecciona el cliente"),
    tipoPapeleria: z.enum([
      "FACTURA",
      "TALONARIO",
      "RECIPE",
      "NOTA",
      "ORDEN_COMPRA",
      "RECIBO",
      "CARTA",
      "OTRO",
    ]),
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
    cantidad: z
      .number({ invalid_type_error: "Indica la cantidad" })
      .int("Debe ser un número entero")
      .min(1, "La cantidad debe ser mayor a cero")
      .max(200_000, "Cantidad fuera de rango"),
    partes: z
      .number({ invalid_type_error: "Indica las partes" })
      .int("Debe ser un número entero")
      .min(1, "Mínimo 1 parte")
      .max(6, "Máximo 6 partes"),
    usaNumeracion: z.boolean(),
    // Opcionales en el esquema: solo se exigen si "usaNumeracion" está activo
    // (ver superRefine). Antes, un campo vacío y deshabilitado bloqueaba el
    // envío con un error que el usuario no podía ver ni corregir.
    numeracionDesde: z
      .number({ invalid_type_error: "Indica el número inicial" })
      .int("Debe ser un número entero")
      .min(0, "No puede ser negativo")
      .optional()
      .or(z.nan().transform(() => undefined)),
    numeracionHasta: z
      .number({ invalid_type_error: "Indica el número final" })
      .int("Debe ser un número entero")
      .min(0, "No puede ser negativo")
      .optional()
      .or(z.nan().transform(() => undefined)),
    numeracionPrefijo: z
      .string()
      .trim()
      .max(12, "Máximo 12 caracteres")
      .optional()
      .or(z.literal("")),
    tecnologia: z.enum(["OFFSET", "DIGITAL"]),
    prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]),
    maquina: z.string().min(1, "Selecciona la máquina"),
    anchoMm: z.number().min(40, "Mínimo 40 mm").max(1000, "Máximo 1000 mm"),
    altoMm: z.number().min(40, "Mínimo 40 mm").max(1000, "Máximo 1000 mm"),
    sustratoId: z.string().min(1, "Selecciona el papel"),
    tintasTiro: z.number().int().min(0).max(6),
    tintasPantone: z.array(z.string()).default([]),
    acabados: z.array(z.string()).default([]),
    fechaEntrega: fechaEntregaSchema,
    observaciones: z
      .string()
      .trim()
      .max(500, "Máximo 500 caracteres")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (!values.usaNumeracion) return;
    if (values.numeracionDesde === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numeracionDesde"],
        message: "Indica el número inicial",
      });
    }
    if (values.numeracionHasta === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numeracionHasta"],
        message: "Indica el número final",
      });
    }
    if (
      values.numeracionDesde !== undefined &&
      values.numeracionHasta !== undefined &&
      values.numeracionHasta < values.numeracionDesde
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numeracionHasta"],
        message: "El número final debe ser mayor o igual al inicial",
      });
    }
  });

export type PapeleriaFormValues = z.infer<typeof papeleriaSchema>;

export const PAPELERIA_DEFAULTS: Partial<PapeleriaFormValues> = {
  clienteId: "",
  tipoPapeleria: "FACTURA",
  producto: "",
  descripcion: "",
  cantidad: 1000,
  partes: 2,
  usaNumeracion: true,
  numeracionDesde: 1,
  numeracionHasta: 1000,
  numeracionPrefijo: "",
  tecnologia: "OFFSET",
  prioridad: "MEDIA",
  maquina: "Heidelberg SM 52",
  anchoMm: 210,
  altoMm: 140,
  sustratoId: "bond-75",
  tintasTiro: 2,
  tintasPantone: [],
  acabados: ["numerado", "engrapado", "perforado"],
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
    .number({ invalid_type_error: "Indica la cantidad" })
    .int("Debe ser un número entero")
    .min(1, "La cantidad debe ser mayor a cero")
    .max(10_000, "Cantidad fuera de rango"),
  ancho: z
    .number({ invalid_type_error: "Indica el ancho" })
    .min(0.1, "Mínimo 0,1")
    .max(100, "Máximo 100"),
  alto: z
    .number({ invalid_type_error: "Indica el alto" })
    .min(0.1, "Mínimo 0,1")
    .max(100, "Máximo 100"),
  unidadDimension: z.enum(["cm", "m"]),
  sustratoId: z.string().min(1, "Selecciona el sustrato"),
  resolucionDpi: z
    .number({ invalid_type_error: "Indica la resolución" })
    .int()
    .min(72, "Mínimo 72 dpi")
    .max(1440, "Máximo 1440 dpi"),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]),
  maquina: z.string().min(1, "Selecciona la máquina"),
  acabados: z.array(z.string()).default([]),
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
  sustratoId: "lona-front",
  resolucionDpi: 720,
  prioridad: "MEDIA",
  maquina: "Mimaki JV300",
  acabados: ["ojales", "refuerzo"],
  fechaEntrega: "",
  observaciones: "",
};

export const cotizacionSchema = z.object({
  tecnologia: z.enum(["OFFSET", "DIGITAL", "GRAN_FORMATO"]),
  tiraje: z
    .number({ invalid_type_error: "Indica el tiraje" })
    .int()
    .min(1, "El tiraje debe ser mayor a cero"),
  anchoMm: z.number().min(10, "Mínimo 10 mm").max(3000, "Máximo 3000 mm"),
  altoMm: z.number().min(10, "Mínimo 10 mm").max(3000, "Máximo 3000 mm"),
  tintasTiro: z.number().int().min(0).max(8),
  tintasRetiro: z.number().int().min(0).max(8),
  sustratoId: z.string().min(1, "Selecciona un sustrato"),
  acabados: z.array(z.string()).default([]),
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
