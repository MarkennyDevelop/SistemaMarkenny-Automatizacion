import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { plantaApi } from "../api/plantaApi";
import { queryKeys } from "@/shared/api/queryKeys";
import {
  FASE_PLANTA,
  FASES_PLANTA,
  type FasePlanta,
  type OrdenTrabajo,
} from "@/shared/domain";

const CLAVE_MOVER_ORDEN = ["planta", "mover-orden"] as const;

interface MoverOrdenVariables {
  ordenId: string;
  fase: FasePlanta;
  origen: FasePlanta;
  nota?: string;
  versionEsperada?: number;
}

/**
 * Container lógico del tablero de planta.
 * La actualización es optimista: la tarjeta se mueve al instante y se
 * reconcilia con el servidor (POST /api/v1/ordenes/:id/transiciones).
 *
 * El flujo es estrictamente secuencial: solo se permite avanzar a la fase
 * inmediatamente siguiente. Cada movimiento se firma con el usuario de la
 * sesión para que el historial quede auditado.
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
    mutationKey: CLAVE_MOVER_ORDEN,
    // El operario que firma el cambio es el usuario de la sesión (lo pone el
    // servidor). `versionEsperada` evita pisar el cambio de otro operario.
    mutationFn: ({ ordenId, fase, nota, versionEsperada }: MoverOrdenVariables) =>
      plantaApi.actualizarFase(ordenId, fase, { nota, versionEsperada }),
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
    onSuccess: (actualizada) => {
      // Reemplaza la tarjeta optimista por la versión confirmada (avance e historial).
      queryClient.setQueryData<OrdenTrabajo[]>(queryKeys.ordenes, (current) =>
        current?.map((orden) => (orden.id === actualizada.id ? actualizada : orden)),
      );
      if (actualizada.fase === "FINALIZADO" || actualizada.fase === "EMPAQUETADO") {
        toast.success("Notificación enviada al vendedor", {
          description:
            actualizada.fase === "EMPAQUETADO"
              ? `${actualizada.codigo} quedó empaquetada y lista para entrega.`
              : `${actualizada.codigo} quedó finalizada y pasa a empaque.`,
        });
      }
    },
    onSettled: () => {
      // Si aún hay otro avance en curso, refrescar ahora pisaría su estado
      // optimista con datos viejos: se espera a que termine el último.
      if (queryClient.isMutating({ mutationKey: CLAVE_MOVER_ORDEN }) > 1) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordenes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });

  const ordenes = query.data ?? [];

  /**
   * Órdenes con un avance todavía sin confirmar. Mientras una orden está aquí
   * no acepta otro avance: un doble clic en "Marcar" no puede saltarse la
   * revisión de calidad encadenando dos fases.
   */
  const enMovimiento = useMutationState({
    filters: { mutationKey: CLAVE_MOVER_ORDEN, status: "pending" },
    select: (mutacion) => (mutacion.state.variables as MoverOrdenVariables).ordenId,
  });

  /**
   * Valida el salto antes de tocar la caché: evita que la tarjeta se mueva
   * de forma optimista hacia una columna que el servidor va a rechazar.
   */
  const moverOrden = (variables: MoverOrdenVariables) => {
    const orden = ordenes.find((item) => item.id === variables.ordenId);
    if (!orden) return;
    if (enMovimiento.includes(orden.id)) return;

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

    mutation.mutate({ ...variables, versionEsperada: orden.version }, {
      onError: (error) => {
        toast.error("No se pudo avanzar la orden", {
          description:
            error instanceof Error ? error.message : "La tarjeta volvió a su fase original.",
        });
      },
    });
  };

  return {
    ordenes,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
    actualizadoEn: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    moverOrden,
    isMoving: enMovimiento.length > 0,
    ordenesEnMovimiento: enMovimiento,
  };
}
