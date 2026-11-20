import type {
  ActorOrden,
  NuevoCliente,
  NuevaOrdenTrabajo,
  OrdenTrabajo,
} from "@/shared/domain";
import { mockDb } from "@/shared/mock/db";

/**
 * Adaptador de datos de Ventas.
 *
 * Contrato previsto con el backend Fastify:
 *   GET    /v1/clientes
 *   POST   /v1/clientes
 *   GET    /v1/ordenes
 *   POST   /v1/ordenes
 *
 * Mientras el backend no exponga esos endpoints, la capa usa el mock persistente
 * en localStorage. Los hooks (TanStack Query) no conocen esta implementación.
 */
export const ventasApi = {
  listarClientes: () => mockDb.listarClientes(),
  crearCliente: (input: NuevoCliente) => mockDb.crearCliente(input),
  listarOrdenes: () => mockDb.listarOrdenes(),
  crearOrden: (input: NuevaOrdenTrabajo, actor: ActorOrden): Promise<OrdenTrabajo> =>
    mockDb.crearOrden(input, actor),
};
