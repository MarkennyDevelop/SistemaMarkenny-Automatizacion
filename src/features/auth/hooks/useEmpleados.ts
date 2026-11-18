import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/authApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { EmpleadoFormValues } from "../types/schemas";

export function useEmpleados() {
  return useQuery({
    queryKey: queryKeys.empleados,
    queryFn: authApi.listarUsuarios,
    staleTime: 15_000,
  });
}

export function useCrearEmpleado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: EmpleadoFormValues) => authApi.crearEmpleado(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.empleados });
    },
  });
}

export function useCambiarEstadoUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      authApi.cambiarEstadoUsuario(id, activo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.empleados });
    },
  });
}

export function useRestablecerPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      authApi.restablecerPassword(id, password),
  });
}
