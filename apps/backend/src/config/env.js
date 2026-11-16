// Configuración del proceso, validada con Zod al arrancar.
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Si no se define, el sistema usa adaptadores en memoria (solo desarrollo). */
  DATABASE_URL: z.string().url().optional(),
});

export function cargarConfig(env = process.env) {
  const r = EnvSchema.safeParse(env);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${detalle}`);
  }
  if (r.data.NODE_ENV === 'production' && !r.data.DATABASE_URL) {
    throw new Error('DATABASE_URL es obligatoria en producción');
  }
  return r.data;
}
