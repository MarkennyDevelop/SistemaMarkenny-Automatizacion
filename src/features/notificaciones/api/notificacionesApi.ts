import { api } from "@/shared/api/cliente";

/**
 * Adaptador de notificaciones sobre el backend. El servidor ya filtra por rol
 * (y por vendedor) y resuelve `leida` para el usuario de la sesión.
 */
export const notificacionesApi = {
  listar: () => api.listarNotificaciones(),
  marcarLeida: (id: string) => api.marcarNotificacionLeida({ params: { id } }),
  marcarTodas: () => api.marcarNotificacionesLeidas(),
};
