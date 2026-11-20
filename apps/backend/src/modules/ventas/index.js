// API pública del módulo de Ventas (clientes).
import { implementaPuerto, PUERTOS } from '../../shared/application/ports.js';
import { CLIENTE_REPOSITORY_PORT, crearCasosUsoVentas } from './application/casosUso.js';
import { actorDe } from '../../shared/application/actor.js';

export { ClienteRepositoryMemoria, ClienteRepositoryPostgres } from './infra/repositorios.js';

export function crearModuloVentas({ clientes, reloj, ids, resumenOrdenes }) {
  const casosUso = crearCasosUsoVentas({
    clientes: implementaPuerto('ClienteRepository', CLIENTE_REPOSITORY_PORT, clientes),
    reloj: implementaPuerto('Clock', PUERTOS.Clock, reloj),
    ids: implementaPuerto('IdGenerator', PUERTOS.IdGenerator, ids),
    resumenOrdenes,
  });

  const manejadores = {
    listarClientes: () => casosUso.listarClientes({}),
    crearCliente: ({ body, usuario }) => casosUso.crearCliente({ ...body, actor: actorDe(usuario) }),
  };

  return { casosUso, manejadores };
}
