import { z } from "zod";

export const movimientoSchema = z.object({
  materialId: z.string().min(1, "Selecciona un material"),
  tipo: z.enum(["ENTRADA", "SALIDA", "AJUSTE", "RESERVA"]),
  cantidad: z
    .number({ invalid_type_error: "Indica una cantidad" })
    .positive("La cantidad debe ser mayor a cero"),
  motivo: z.string().trim().min(3, "Describe el motivo del movimiento").max(160),
  usuario: z.string().trim().min(3, "Indica el responsable"),
});

export type MovimientoFormValues = z.infer<typeof movimientoSchema>;
