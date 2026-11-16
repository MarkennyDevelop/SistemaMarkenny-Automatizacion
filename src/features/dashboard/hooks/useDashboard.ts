import { useQuery } from "@tanstack/react-query";
import { inventarioApi } from "@/features/inventario/api/inventarioApi";
import { ventasApi } from "@/features/ventas/api/ventasApi";
import { queryKeys } from "@/shared/api/queryKeys";
import {
  FASES_PLANTA,
  type FasePlanta,
  type MaterialInventario,
  type OrdenTrabajo,
} from "@/shared/domain";

export interface DashboardData {
  ordenes: OrdenTrabajo[];
  inventario: MaterialInventario[];
  ordenesActivas: number;
  enRevision: number;
  entregasSemana: number;
  montoEnProduccion: number;
  stockCritico: MaterialInventario[];
  valorInventario: number;
  porFase: Record<FasePlanta, number>;
  proximasEntregas: OrdenTrabajo[];
  cargaPorMaquina: { maquina: string; ordenes: number }[];
}

const DIA_MS = 86_400_000;

async function cargarDashboard(): Promise<DashboardData> {
  const [ordenes, inventario] = await Promise.all([
    ventasApi.listarOrdenes(),
    inventarioApi.listar(),
  ]);

  const ahora = Date.now();
  const activas = ordenes.filter((orden) => orden.fase !== "EMPACADO");

  const porFase = FASES_PLANTA.reduce(
    (acc, fase) => {
      acc[fase] = ordenes.filter((orden) => orden.fase === fase).length;
      return acc;
    },
    {} as Record<FasePlanta, number>,
  );

  const carga = new Map<string, number>();
  activas.forEach((orden) => {
    carga.set(orden.maquina, (carga.get(orden.maquina) ?? 0) + 1);
  });

  return {
    ordenes,
    inventario,
    ordenesActivas: activas.length,
    enRevision: porFase.EN_REVISION,
    entregasSemana: activas.filter((orden) => {
      const diff = new Date(orden.fechaEntrega).getTime() - ahora;
      return diff >= 0 && diff <= DIA_MS * 7;
    }).length,
    montoEnProduccion: activas.reduce((total, orden) => total + orden.montoTotal, 0),
    stockCritico: inventario.filter((material) => material.stock <= material.stockMinimo),
    valorInventario: inventario.reduce(
      (total, material) => total + material.stock * material.costoUnitario,
      0,
    ),
    porFase,
    proximasEntregas: [...activas]
      .sort(
        (a, b) =>
          new Date(a.fechaEntrega).getTime() - new Date(b.fechaEntrega).getTime(),
      )
      .slice(0, 5),
    cargaPorMaquina: [...carga.entries()]
      .map(([maquina, ordenes]) => ({ maquina, ordenes }))
      .sort((a, b) => b.ordenes - a.ordenes),
  };
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: cargarDashboard,
    staleTime: 20_000,
    refetchInterval: 45_000,
  });
}
