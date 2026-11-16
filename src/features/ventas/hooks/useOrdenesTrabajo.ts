import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ventasApi } from "@/features/ventas/api/ventasApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { NuevaOrdenTrabajo } from "@/shared/domain";

export function useOrdenesTrabajo() {
  return useQuery({
    queryKey: queryKeys.ordenes,
    queryFn: ventasApi.listarOrdenes,
    staleTime: 20_000,
  });
}

export function useCrearOrdenTrabajo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NuevaOrdenTrabajo) => ventasApi.crearOrden(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordenes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
