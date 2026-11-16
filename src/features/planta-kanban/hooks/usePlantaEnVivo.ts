import { useEffect, useState } from "react";

/**
 * Estado de conexión de la pantalla de planta.
 *
 * Con backend disponible, este hook abrirá:
 *   new EventSource(`${VITE_API_URL}/v1/produccion/taller-stream`)
 * e invalidará la caché de TanStack Query con cada evento ORDEN_CAMBIO_ESTADO.
 * Mientras tanto, expone el estado de red y deja que usePlantaBoard
 * refresque cada 30 s.
 */
export function usePlantaEnVivo(extraRefetchMs = 30_000) {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return {
    conectado: online,
    modo: "Sincronización automática",
    intervaloMs: extraRefetchMs,
  };
}
