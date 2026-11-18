import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventarioApi, type RegistrarMovimientoInput } from "@/features/inventario/api/inventarioApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { CategoriaInventario, MaterialInventario } from "@/shared/domain";

export function useInventario() {
  const query = useQuery({
    queryKey: queryKeys.inventario,
    queryFn: inventarioApi.listar,
    staleTime: 30_000,
  });

  const materiales = query.data ?? [];

  const porCategoria = materiales.reduce(
    (acc, material) => {
      acc[material.categoria] += 1;
      return acc;
    },
    { PAPEL: 0, TINTAS: 0, PLANCHAS: 0, VINILOS: 0, SELLOS: 0, ALMACEN: 0 } as Record<
      CategoriaInventario,
      number
    >,
  );

  const criticos = materiales.filter(
    (material) => material.stock <= material.stockMinimo,
  );

  const valorInventario = materiales.reduce(
    (total, material) => total + material.stock * material.costoUnitario,
    0,
  );

  return {
    materiales,
    porCategoria,
    criticos,
    valorInventario,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useMovimientos(limit = 8) {
  const query = useQuery({
    queryKey: queryKeys.movimientos,
    queryFn: inventarioApi.listarMovimientos,
    staleTime: 20_000,
  });

  return {
    movimientos: (query.data ?? []).slice(0, limit),
    isLoading: query.isLoading,
  };
}

export function useRegistrarMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegistrarMovimientoInput) =>
      inventarioApi.registrarMovimiento(input),
    onSuccess: (movimiento) => {
      queryClient.setQueryData<MaterialInventario[]>(
        queryKeys.inventario,
        (current) =>
          current?.map((material) => {
            if (material.id !== movimiento.materialId) return material;
            const factor = movimiento.tipo === "ENTRADA" ? 1 : -1;
            return {
              ...material,
              stock: Math.max(0, material.stock + movimiento.cantidad * factor),
              actualizadoEn: movimiento.fecha,
            };
          }),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventario });
      void queryClient.invalidateQueries({ queryKey: queryKeys.movimientos });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
