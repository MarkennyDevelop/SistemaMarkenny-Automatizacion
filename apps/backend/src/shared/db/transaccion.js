// Unidad de trabajo sobre PostgreSQL: BEGIN / COMMIT / ROLLBACK.

/**
 * Ejecuta `fn(client)` dentro de una transacción. Si `fn` lanza, hace ROLLBACK.
 * @template T
 * @param {import('pg').Pool} pool
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function enTransaccion(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
