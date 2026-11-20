// Esquema Zod del actor autenticado que los casos de uso reciben del adaptador HTTP.
import { z } from 'zod';
import { RolSchema } from '@markenny/contrato';

export const ActorSchema = z
  .object({ id: z.string().uuid(), nombre: z.string().min(1), rol: RolSchema })
  .strict();

/** Actor de auditoría a partir del usuario de la sesión (`req.usuario`). */
export const actorDe = (usuario) => ({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol });
