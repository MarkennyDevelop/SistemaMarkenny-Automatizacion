import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { queryKeys } from "@/shared/api/queryKeys";
import type { Notificacion } from "@/shared/domain";
import { notificacionesApi } from "../api/notificacionesApi";

export function useNotificaciones() {
  const { usuario } = useAuth();

  const query = useQuery({
    queryKey: [...queryKeys.notificaciones, usuario?.id ?? "anon"],
    queryFn: notificacionesApi.listar,
    staleTime: 10_000,
    refetchInterval: 20_000,
    enabled: Boolean(usuario),
  });

  const notificaciones: Notificacion[] = query.data ?? [];

  return {
    notificaciones,
    sinLeer: notificaciones.filter((notificacion) => !notificacion.leida).length,
    isLoading: query.isLoading,
  };
}

export function useMarcarNotificacionLeida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificacionesApi.marcarLeida(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}

export function useMarcarTodasLeidas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificacionesApi.marcarTodas(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}
