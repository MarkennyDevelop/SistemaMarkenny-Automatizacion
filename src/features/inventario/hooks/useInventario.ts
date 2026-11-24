import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventarioApi } from "../api/inventarioApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { CategoriaInventario, ConfiguracionConsumo, NuevoMovimiento } from "@/shared/domain";

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
    { PAPEL: 0, VINIL: 0, LONA: 0, SELLO: 0 } as Record<CategoriaInventario, number>,
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
    queryFn: () => inventarioApi.listarMovimientos(50),
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
    mutationFn: (input: NuevoMovimiento) =>
      inventarioApi.registrarMovimiento(input),
    // El stock lo calcula el servidor; la UI solo vuelve a leerlo.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventario });
      void queryClient.invalidateQueries({ queryKey: queryKeys.movimientos });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/** Producto terminado: órdenes EMPAQUETADAS pendientes de entrega. */
export function useProductosPendientes() {
  return useQuery({
    queryKey: queryKeys.productosTerminados,
    queryFn: inventarioApi.listarProductosPendientes,
    staleTime: 15_000,
  });
}

/** Entrega total o parcial al cliente: actualiza almacén y estado de la orden. */
export function useRegistrarEntrega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productoId, cantidad, recibidoPor }: { productoId: string; cantidad: number; recibidoPor?: string }) =>
      inventarioApi.registrarEntrega(productoId, cantidad, recibidoPor),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.productosTerminados });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordenes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientes });
    },
  });
}

/** Guarda rendimiento y merma de un vinil o lona. */
export function useConfigurarConsumo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ materialId, ...input }: ConfiguracionConsumo & { materialId: string }) =>
      inventarioApi.configurarConsumo(materialId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventario });
      // Las fichas de venta estiman el consumo con estos datos.
      void queryClient.invalidateQueries({ queryKey: queryKeys.disponibilidad });
    },
  });
}
