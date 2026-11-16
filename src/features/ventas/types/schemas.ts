import { z } from "zod";

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
  fechaEntrega: z
    .string()
    .min(1, "Indica la fecha de entrega")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Fecha inválida",
    }),
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
