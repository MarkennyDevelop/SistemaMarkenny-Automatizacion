// Pool de conexiones a PostgreSQL.
import pg from 'pg';

// NUMERIC llega como string por defecto; las cantidades de inventario se
// manejan como número en el dominio.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));

export function crearPool({ connectionString, max = 10 }) {
  return new pg.Pool({ connectionString, max });
}
