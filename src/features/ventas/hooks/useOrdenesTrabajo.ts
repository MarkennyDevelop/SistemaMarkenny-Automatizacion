import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { ventasApi } from "../api/ventasApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { NuevaOrdenTrabajo } from "@/shared/domain";

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
  const { usuario } = useAuth();

  return useMutation({
    mutationFn: (input: NuevaOrdenTrabajo) => {
      if (!usuario) {
        return Promise.reject(new Error("Tu sesión expiró. Inicia sesión de nuevo."));
      }
      return ventasApi.crearOrden(input, { usuario: usuario.nombre, rol: usuario.rol });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordenes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}
