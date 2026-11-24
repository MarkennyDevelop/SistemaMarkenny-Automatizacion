import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ventasApi } from "../api/ventasApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { NuevaNotaOrden, NuevaOrdenTrabajo } from "@/shared/domain";

export function useOrdenesTrabajo() {
  return useQuery({
    queryKey: queryKeys.ordenes,
    queryFn: ventasApi.listarOrdenes,
    staleTime: 20_000,
    // El seguimiento debe reflejar los avances de planta sin recargar la página.
    refetchInterval: 30_000,
  });
}

export function useCrearOrdenTrabajo() {
  const queryClient = useQueryClient();

  return useMutation({
    // El vendedor de la orden es el usuario de la sesión: lo asigna el servidor.
    mutationFn: (input: NuevaOrdenTrabajo) => ventasApi.crearOrden(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordenes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}

/**
 * Observación del vendedor (o de planta) sobre la orden. El vendedor no
 * cambia la fase: puede dejar una nota o solicitar revisión, y Producción o
 * Administración deciden si la orden vuelve a En Proceso.
 */
export function useAgregarNota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ordenId, ...input }: NuevaNotaOrden & { ordenId: string }) =>
      ventasApi.agregarNota(ordenId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordenes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}
