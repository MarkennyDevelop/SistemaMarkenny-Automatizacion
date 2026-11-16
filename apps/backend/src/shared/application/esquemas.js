// Esquemas Zod reutilizables entre módulos.
import { z } from 'zod';

export const UsuarioRefSchema = z
  .object({
    id: z.string().trim().min(1, 'usuario.id es obligatorio'),
    nombre: z.string().trim().min(1).optional(),
    rol: z.string().trim().min(1).optional(),
  })
  .strict();

export const IdSchema = z.string().uuid();

export const FechaIsoSchema = z.string().datetime({ offset: true });
