// Configuración del proceso, validada con Zod al arrancar.
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Si no se define, el sistema usa repositorios en memoria (solo desarrollo). */
  DATABASE_URL: z.string().url().optional(),
  /** Horas de validez de una sesión. */
  SESION_HORAS: z.coerce.number().int().min(1).max(720).default(12),
  /** Cookie solo por HTTPS. Por defecto, activada en producción. */
  COOKIE_SEGURA: z.enum(['true', 'false']).optional(),
  /**
   * Orígenes extra que pueden enviar cambios (p. ej. el dominio del frontend si
   * se publica en otro dominio que la API). Lista separada por comas.
   */
  ORIGENES_PERMITIDOS: z.string().optional(),
  /**
   * Confiar en X-Forwarded-* solo si hay un proxy inverso propio (Nginx,
   * Caddy...) delante. Por defecto no: evita que un cliente falsee su IP o
   * protocolo (y así saltarse el límite de intentos).
   */
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  /** Peticiones por minuto e IP para toda la API. */
  LIMITE_PETICIONES_MINUTO: z.coerce.number().int().min(10).max(100_000).default(600),
});

/**
 * Carga `apps/backend/.env` si existe (Node ≥ 20.12, sin dependencias). Las
 * variables ya definidas en el sistema tienen prioridad.
 */
export function cargarArchivoEnv(ruta = new URL('../../.env', import.meta.url)) {
  try {
    process.loadEnvFile?.(ruta);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

export function cargarConfig(env = process.env) {
  const r = EnvSchema.safeParse(env);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${detalle}`);
  }
  const config = r.data;
  if (config.NODE_ENV === 'production' && !config.DATABASE_URL) {
    throw new Error('DATABASE_URL es obligatoria en producción');
  }
  return {
    ...config,
    COOKIE_SEGURA: config.COOKIE_SEGURA ? config.COOKIE_SEGURA === 'true' : config.NODE_ENV === 'production',
    TRUST_PROXY: config.TRUST_PROXY === 'true',
    ORIGENES_PERMITIDOS: (config.ORIGENES_PERMITIDOS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}
