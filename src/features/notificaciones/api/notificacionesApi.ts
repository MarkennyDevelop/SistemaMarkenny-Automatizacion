import { mockDb } from "@/shared/mock/db";
import type { Rol } from "@/shared/domain";

/**
 * Adaptador de notificaciones.
 * Contrato previsto con Fastify:
 *   GET   /v1/notificaciones
 *   PATCH /v1/notificaciones/:id/leida
 *   PATCH /v1/notificaciones/leidas
 */
export const notificacionesApi = {
  listar: (rol: Rol) => mockDb.listarNotificaciones(rol),
  marcarLeida: (id: string, usuarioId: string) =>
    mockDb.marcarNotificacionLeida(id, usuarioId),
  marcarTodas: (usuarioId: string, rol: Rol) =>
    mockDb.marcarNotificacionesLeidas(usuarioId, rol),
};
