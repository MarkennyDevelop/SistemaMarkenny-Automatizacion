// Ejecutor mínimo de migraciones SQL (archivos en ./migrations, en orden).
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { enTransaccion } from './transaccion.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function migrar(pool, { logger = console } = {}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migraciones (
    nombre TEXT PRIMARY KEY,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const archivos = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await pool.query('SELECT nombre FROM schema_migraciones');
  const aplicadas = new Set(rows.map((r) => r.nombre));

  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;
    const sql = await readFile(path.join(DIR, archivo), 'utf8');
    await enTransaccion(pool, async (c) => {
      await c.query(sql);
      await c.query('INSERT INTO schema_migraciones (nombre) VALUES ($1)', [archivo]);
    });
    logger.info?.(`Migración aplicada: ${archivo}`);
  }
}

// Ejecución directa: `npm run migrate`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { cargarArchivoEnv, cargarConfig } = await import('../../config/env.js');
  cargarArchivoEnv();
  const { crearPool } = await import('./pool.js');
  const config = cargarConfig();
  if (!config.DATABASE_URL) {
    console.error('DATABASE_URL no está definida');
    process.exit(1);
  }
  const pool = crearPool({ connectionString: config.DATABASE_URL });
  try {
    await migrar(pool);
  } finally {
    await pool.end();
  }
}
