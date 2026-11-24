import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/queryKeys";
import type { CategoriaInventario, InsumoDisponible, TipoPapel } from "@/shared/domain";
import { ventasApi } from "../api/ventasApi";

/**
 * Insumos del almacén que pueden ofrecerse en las fichas de venta.
 * Las opciones de papel y sustrato se habilitan según este stock real.
 */
export function useDisponibilidad() {
  const consulta = useQuery({
    queryKey: queryKeys.disponibilidad,
    queryFn: ventasApi.disponibilidad,
    staleTime: 30_000,
  });
  const insumos = useMemo(() => consulta.data ?? [], [consulta.data]);

  return useMemo(() => {
    const deCategoria = (...categorias: CategoriaInventario[]): InsumoDisponible[] =>
      insumos.filter((insumo) => categorias.includes(insumo.categoria));
    const papelDisponible = (tipo: TipoPapel) =>
      insumos.some((insumo) => insumo.categoria === "PAPEL" && insumo.subtipo === tipo && insumo.disponible);
    return { ...consulta, insumos, deCategoria, papelDisponible };
  }, [consulta, insumos]);
}
