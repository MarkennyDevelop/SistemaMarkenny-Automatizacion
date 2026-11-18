import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { queryKeys } from "@/shared/api/queryKeys";
import type { Notificacion } from "@/shared/domain";
import { notificacionesApi } from "../api/notificacionesApi";

export function useNotificaciones() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? "ADMIN";

  const query = useQuery({
    queryKey: [...queryKeys.notificaciones, rol, usuario?.id ?? "anon"],
    queryFn: () => notificacionesApi.listar(rol),
    staleTime: 10_000,
    refetchInterval: 20_000,
    enabled: Boolean(usuario),
  });

  const notificaciones: Notificacion[] = query.data ?? [];
  const usuarioId = usuario?.id ?? "";

  return {
    notificaciones,
    sinLeer: notificaciones.filter(
      (notificacion) => !notificacion.leidaPor.includes(usuarioId),
    ).length,
    isLoading: query.isLoading,
  };
}

export function useMarcarNotificacionLeida() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();

  return useMutation({
    mutationFn: (id: string) =>
      notificacionesApi.marcarLeida(id, usuario?.id ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}

export function useMarcarTodasLeidas() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();

  return useMutation({
    mutationFn: () =>
      notificacionesApi.marcarTodas(usuario?.id ?? "", usuario?.rol ?? "ADMIN"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    },
  });
}
