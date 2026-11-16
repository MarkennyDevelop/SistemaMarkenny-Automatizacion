import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ventasApi } from "@/features/ventas/api/ventasApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { NuevoCliente } from "@/shared/domain";

export function useClientes() {
  return useQuery({
    queryKey: queryKeys.clientes,
    queryFn: ventasApi.listarClientes,
    staleTime: 60_000,
  });
}

export function useCrearCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NuevoCliente) => ventasApi.crearCliente(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientes });
    },
  });
}
