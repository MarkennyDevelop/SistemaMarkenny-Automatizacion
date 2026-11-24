import { api } from "@/shared/api/cliente";
import type { NuevaNotaOrden, NuevaOrdenTrabajo, NuevoCliente } from "@/shared/domain";

/**
 * Adaptador de Ventas sobre el backend:
 *   GET/POST /api/v1/clientes · GET/POST /api/v1/ordenes
 *   POST /api/v1/ordenes/:id/notas (observación o solicitud de revisión)
 *   GET /api/v1/inventario/disponibilidad (insumos con stock, sin costos)
 * Un vendedor solo recibe sus órdenes: el filtro lo aplica el servidor.
 */
export const ventasApi = {
  listarClientes: () => api.listarClientes(),
  crearCliente: (input: NuevoCliente) => api.crearCliente({ body: input }),
  listarOrdenes: () => api.listarOrdenes(),
  crearOrden: (input: NuevaOrdenTrabajo) => api.crearOrden({ body: input }),
  disponibilidad: () => api.disponibilidadInventario(),
  agregarNota: (ordenId: string, input: NuevaNotaOrden) =>
    api.agregarNotaOrden({ params: { id: ordenId }, body: input }),
};
