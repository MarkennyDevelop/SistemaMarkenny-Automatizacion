import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { plantaApi } from "@/features/planta-kanban/api/plantaApi";
import { useAuth } from "@/features/auth";
import { queryKeys } from "@/shared/api/queryKeys";
import {
  FASE_PLANTA,
  FASES_PLANTA,
  type FasePlanta,
  type OrdenTrabajo,
} from "@/shared/domain";

interface MoverOrdenVariables {
  ordenId: string;
  fase: FasePlanta;
  origen: FasePlanta;
  nota?: string;
}

/**
 * Container lógico del tablero de planta.
 * La actualización es optimista: la tarjeta se mueve al instante y se
 * reconcilia con el servidor (hoy mock, mañana PATCH /v1/ordenes/:id/fase).
 *
 * El flujo es estrictamente secuencial: solo se permite avanzar a la fase
 * inmediatamente siguiente. Cada movimiento se firma con el usuario de la
 * sesión para que el historial quede auditado.
 */
export function usePlantaBoard() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.ordenes,
    queryFn: plantaApi.listarOrdenes,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const mutation = useMutation({
    mutationFn: ({ ordenId, fase, nota }: MoverOrdenVariables) =>
      plantaApi.actualizarFase(
        ordenId,
        fase,
        {
          usuario: usuario?.nombre ?? "Operario de planta",
          rol: usuario?.rol ?? "PRODUCCION",
        },
        nota,
      ),
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });

  const ordenes = query.data ?? [];

  const columnas = FASES_PLANTA.map((fase) => ({
    fase,
    ordenes: ordenes.filter((orden) => orden.fase === fase),
  }));

  /**
   * Valida el salto antes de tocar la caché: evita que la tarjeta se mueva
   * de forma optimista hacia una columna que el servidor va a rechazar.
   */
  const moverOrden = (variables: MoverOrdenVariables) => {
    const orden = ordenes.find((item) => item.id === variables.ordenId);
    if (!orden) return;

    const origen = FASES_PLANTA.indexOf(orden.fase);
    const destino = FASES_PLANTA.indexOf(variables.fase);

    if (destino === origen) return;

    if (destino !== origen + 1) {
      if (destino < origen) {
        toast.error("Avance no permitido", {
          description:
            "El control de calidad es secuencial: una orden no puede retroceder de fase.",
        });
      } else {
        const siguiente = FASES_PLANTA[origen + 1];
        toast.error("Avance no permitido", {
          description: siguiente
            ? `Primero debes completar «${FASE_PLANTA[siguiente].label}».`
            : "La orden ya está empaquetada.",
        });
      }
      return;
    }

    mutation.mutate(variables);
  };

  return {
    ordenes,
    columnas,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
    actualizadoEn: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    moverOrden,
    isMoving: mutation.isPending,
    ordenEnMovimiento: mutation.variables?.ordenId ?? null,
    error: mutation.error,
  };
}
