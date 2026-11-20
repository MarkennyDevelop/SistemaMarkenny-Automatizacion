import { api } from "@/shared/api/cliente";
import type { FasePlanta } from "@/shared/domain";

/**
 * Adaptador de Planta sobre el backend.
 *   GET  /api/v1/ordenes
 *   POST /api/v1/ordenes/:id/transiciones   (secuencial, auditado, con bloqueo por versión)
 * El operario que firma el cambio es el usuario de la sesión.
 */
export const plantaApi = {
  listarOrdenes: () => api.listarOrdenes(),
  actualizarFase: (ordenId: string, fase: FasePlanta, opciones: { nota?: string; versionEsperada?: number } = {}) =>
    api.cambiarFaseOrden({ params: { id: ordenId }, body: { fase, ...opciones } }),
};
