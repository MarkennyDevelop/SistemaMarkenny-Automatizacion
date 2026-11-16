import type { FasePlanta, OrdenTrabajo } from "@/shared/domain";
import { mockDb } from "@/shared/mock/db";

/**
 * Adaptador de datos de Planta.
 * Endpoint previsto: PATCH /v1/ordenes/:id/fase
 * Evento SSE previsto: GET /v1/produccion/taller-stream
 */
export const plantaApi = {
  listarOrdenes: () => mockDb.listarOrdenes(),
  actualizarFase: (ordenId: string, fase: FasePlanta): Promise<OrdenTrabajo> =>
    mockDb.actualizarFaseOrden(ordenId, fase),
};
