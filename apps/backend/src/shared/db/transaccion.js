// Unidad de trabajo sobre PostgreSQL: BEGIN / COMMIT / ROLLBACK.
//
// Dentro de `unidadDeTrabajo(fn)` todos los repositorios comparten la misma
// conexión (AsyncLocalStorage), de modo que operaciones de módulos distintos
// —p. ej. guardar una orden (Producción) y descontar su sustrato
// (Inventario)— se confirman o se deshacen juntas sin que un módulo conozca
// al otro. Las transacciones internas de cada repositorio pasan a ser
// SAVEPOINT de la transacción exterior.
import { AsyncLocalStorage } from 'node:async_hooks';

const contexto = new AsyncLocalStorage();
let savepoints = 0;

/**
 * Ejecuta `fn(client)` dentro de una transacción. Si `fn` lanza, hace ROLLBACK.
 * Si ya hay una unidad de trabajo activa, usa un SAVEPOINT en su conexión.
 * @template T
 * @param {import('pg').Pool} pool
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function enTransaccion(pool, fn) {
  const activa = contexto.getStore();
  if (activa) {
    const nombre = `sp_${(savepoints += 1)}`;
    await activa.client.query(`SAVEPOINT ${nombre}`);
    try {
      const resultado = await fn(activa.client);
      await activa.client.query(`RELEASE SAVEPOINT ${nombre}`);
      return resultado;
    } catch (err) {
      await activa.client.query(`ROLLBACK TO SAVEPOINT ${nombre}`).catch(() => {});
      throw err;
    }
  }

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

/**
 * Pool para los repositorios: sus consultas usan la conexión de la unidad de
 * trabajo activa, o el pool si no hay ninguna.
 * @param {import('pg').Pool} pool
 */
export function poolTransaccional(pool) {
  return {
    query: (...args) => (contexto.getStore()?.client ?? pool).query(...args),
    connect: () => pool.connect(),
    end: () => pool.end(),
  };
}

/**
 * @param {import('pg').Pool} pool
 * @returns {<T>(fn: () => Promise<T>) => Promise<T>}
 */
export function crearUnidadDeTrabajo(pool) {
  return (fn) =>
    contexto.getStore()
      ? fn()
      : enTransaccion(pool, (client) => contexto.run({ client }, fn));
}

/**
 * Sin base de datos (memoria) no hay ROLLBACK: las unidades de trabajo se
 * ejecutan de a una (en cola), así la verificación de stock y el descuento
 * no pueden intercalarse con los de otra venta.
 */
export function crearUnidadDeTrabajoEnMemoria() {
  let cola = Promise.resolve();
  return (fn) => {
    const turno = cola.then(() => fn());
    cola = turno.catch(() => {});
    return turno;
  };
}
