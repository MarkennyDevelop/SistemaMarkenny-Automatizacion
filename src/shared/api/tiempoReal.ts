import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PREFIJO_API, SSE_PRODUCCION } from "@markenny/contrato";
import { queryKeys } from "./queryKeys";

/**
 * Escucha el flujo de eventos de planta (Server-Sent Events) y refresca las
 * órdenes, el dashboard, el almacén y la campana cuando una orden cambia de
 * fase. Un vendedor solo recibe los eventos de sus órdenes (lo filtra el
 * servidor). El navegador reconecta solo si se cae la red.
 */
export function useEventosProduccion(activo = true) {
  const queryClient = useQueryClient();
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!activo || typeof EventSource === "undefined") return;
    const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
    const fuente = new EventSource(`${base}${PREFIJO_API}${SSE_PRODUCCION.ruta}`, { withCredentials: true });

    const alActualizar = (mensaje: MessageEvent<string>) => {
      try {
        if (!SSE_PRODUCCION.datos.safeParse(JSON.parse(mensaje.data)).success) return;
      } catch {
        return;
      }
      for (const queryKey of [
        queryKeys.ordenes,
        queryKeys.dashboard,
        queryKeys.notificaciones,
        queryKeys.productosTerminados,
        queryKeys.clientes,
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    fuente.onopen = () => setConectado(true);
    fuente.onerror = () => setConectado(false);
    fuente.addEventListener(SSE_PRODUCCION.evento, alActualizar as EventListener);
    return () => {
      fuente.removeEventListener(SSE_PRODUCCION.evento, alActualizar as EventListener);
      fuente.close();
      setConectado(false);
    };
  }, [activo, queryClient]);

  return { conectado };
}
