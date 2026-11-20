import { api } from "@/shared/api/cliente";
import type { NuevoMovimiento } from "@/shared/domain";

/**
 * Adaptador de Inventario sobre el backend (`/api/v1/inventario/...`).
 * El responsable de cada movimiento o entrega es el usuario de la sesión.
 */
export const inventarioApi = {
  listar: () => api.listarMateriales(),
  listarMovimientos: (limite = 50) => api.listarMovimientos({ query: { limite } }),
  registrarMovimiento: (input: NuevoMovimiento) => api.registrarMovimiento({ body: input }),
  /** Sellos y productos terminados que siguen en almacén. */
  listarProductosPendientes: () => api.listarProductosTerminados({ query: { soloPendientes: "true" } }),
  registrarEntrega: (productoId: string, cantidad: number, recibidoPor?: string) =>
    api.registrarEntrega({ params: { id: productoId }, body: { cantidad, recibidoPor: recibidoPor || undefined } }),
};
