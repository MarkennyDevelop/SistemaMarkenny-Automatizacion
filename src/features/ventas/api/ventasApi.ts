import { api } from "@/shared/api/cliente";
import type { NuevaOrdenTrabajo, NuevoCliente } from "@/shared/domain";

/**
 * Adaptador de Ventas sobre el backend:
 *   GET/POST /api/v1/clientes · GET/POST /api/v1/ordenes
 * Un vendedor solo recibe sus órdenes: el filtro lo aplica el servidor.
 */
export const ventasApi = {
  listarClientes: () => api.listarClientes(),
  crearCliente: (input: NuevoCliente) => api.crearCliente({ body: input }),
  listarOrdenes: () => api.listarOrdenes(),
  crearOrden: (input: NuevaOrdenTrabajo) => api.crearOrden({ body: input }),
};
