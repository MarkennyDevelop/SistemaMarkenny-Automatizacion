// Mismo recorrido de punta a punta, contra PostgreSQL real.
// Requiere TEST_DATABASE_URL (BD desechable: el esquema `public` se recrea).
import { describe, expect, it } from 'vitest';
import { crearPool } from '../../src/shared/db/pool.js';
import { migrar } from '../../src/shared/db/migrate.js';
import { probarFlujoCompleto } from '../http/flujoCompleto.js';

const URL = process.env.TEST_DATABASE_URL;

async function bdNueva() {
  const pool = crearPool({ connectionString: URL });
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrar(pool, { logger: {} });
  return pool;
}

describe.skipIf(!URL)('PostgreSQL', () => {
  let pool;
  probarFlujoCompleto('PostgreSQL', async () => {
    pool = await bdNueva();
    return { overrides: { pool }, cerrar: () => pool.end() };
  });

  describe('integridad en la base de datos', () => {
    it('la auditoría de fases y el kardex son de solo inserción', async () => {
      const p = crearPool({ connectionString: URL });
      try {
        for (const tabla of ['produccion_etapas_auditoria', 'movimientos_inventario']) {
          await expect(p.query(`DELETE FROM ${tabla}`)).rejects.toThrow(/solo inserción/);
          await expect(p.query(`TRUNCATE ${tabla} CASCADE`)).rejects.toThrow(/solo inserción/);
        }
        const { rows } = await p.query('SELECT count(*)::int AS n FROM produccion_etapas_auditoria');
        expect(rows[0].n).toBeGreaterThan(0);
      } finally {
        await p.end();
      }
    });

    it('rechaza fases y estados fuera del catálogo', async () => {
      const p = crearPool({ connectionString: URL });
      try {
        await expect(p.query(`UPDATE ordenes_trabajo SET estado_produccion = 'ENTREGADO'`)).rejects.toThrow(/check/i);
        await expect(p.query(`UPDATE materiales SET stock_actual = -1`)).rejects.toThrow(/check/i);
      } finally {
        await p.end();
      }
    });
  });
});
