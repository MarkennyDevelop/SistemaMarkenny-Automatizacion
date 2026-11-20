import { useEventosProduccion } from "@/shared/api/tiempoReal";

/**
 * Estado de conexión de la pantalla de planta: flujo en tiempo real del
 * backend (SSE). Además, usePlantaBoard refresca cada 30 s como respaldo.
 */
export function usePlantaEnVivo() {
  const { conectado } = useEventosProduccion();
  return {
    conectado,
    modo: conectado ? "Tiempo real" : "Reconectando...",
  };
}
