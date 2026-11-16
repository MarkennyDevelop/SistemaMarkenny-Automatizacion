import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { plantaApi } from "@/features/planta-kanban/api/plantaApi";
import { queryKeys } from "@/shared/api/queryKeys";
import {
  FASES_PLANTA,
  type FasePlanta,
  type OrdenTrabajo,
} from "@/shared/domain";

interface MoverOrdenVariables {
  ordenId: string;
  fase: FasePlanta;
  origen: FasePlanta;
}

/**
 * Container lógico del tablero de planta.
 * La actualización es optimista: la tarjeta se mueve al instante y se
 * reconcilia con el servidor (hoy mock, mañana PATCH /v1/ordenes/:id/fase).
 */
export function usePlantaBoard() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.ordenes,
    queryFn: plantaApi.listarOrdenes,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const mutation = useMutation({
    mutationFn: ({ ordenId, fase }: MoverOrdenVariables) =>
      plantaApi.actualizarFase(ordenId, fase),
    onMutate: async ({ ordenId, fase }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.ordenes });
      const previous = queryClient.getQueryData<OrdenTrabajo[]>(queryKeys.ordenes);
      queryClient.setQueryData<OrdenTrabajo[]>(queryKeys.ordenes, (current) =>
        current?.map((orden) =>
          orden.id === ordenId ? { ...orden, fase } : orden,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.ordenes, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordenes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });

  const ordenes = query.data ?? [];

  const columnas = FASES_PLANTA.map((fase) => ({
    fase,
    ordenes: ordenes.filter((orden) => orden.fase === fase),
  }));

  return {
    ordenes,
    columnas,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
    actualizadoEn: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    moverOrden: mutation.mutate,
    isMoving: mutation.isPending,
    ordenEnMovimiento: mutation.variables?.ordenId ?? null,
    error: mutation.error,
  };
}
