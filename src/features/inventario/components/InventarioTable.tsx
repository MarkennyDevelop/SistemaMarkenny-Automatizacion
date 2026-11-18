import { ArrowDownUp, Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import {
  type CategoriaInventario,
  type MaterialInventario,
} from "@/shared/domain";

export const CATEGORIA_LABEL: Record<CategoriaInventario, string> = {
  PAPEL: "Papel",
  TINTAS: "Tintas",
  PLANCHAS: "Planchas CTP",
  VINILOS: "Vinilos y lonas",
  SELLOS: "Sellos / PT",
  ALMACEN: "Almacén",
};

function estado(material: MaterialInventario) {
  if (material.stock <= material.stockMinimo) {
    return { label: "Crítico", variant: "destructive" as const };
  }
  if (material.stock <= material.stockMinimo * 1.25) {
    return { label: "Reponer", variant: "outline" as const };
  }
  return { label: "OK", variant: "muted" as const };
}

interface InventarioTableProps {
  materiales: MaterialInventario[];
  isLoading?: boolean;
  onRegistrar: (material: MaterialInventario) => void;
}

export function InventarioTable({
  materiales,
  isLoading,
  onRegistrar,
}: InventarioTableProps) {
  if (isLoading) {
    return (
      <Card className="divide-y divide-border/70 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-4">
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </Card>
    );
  }

  if (materiales.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
          <Boxes className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium">Sin materiales en este filtro</p>
        <p className="text-xs text-muted-foreground">
          Cambia la categoría o el término de búsqueda.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table className="min-w-[880px]">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-5">Material</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead className="min-w-[160px]">Stock</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12 pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {materiales.map((material) => {
            const info = estado(material);
            const critico = material.stock <= material.stockMinimo;
            const cobertura = Math.min(
              100,
              (material.stock / Math.max(1, material.stockMinimo)) * 100,
            );
            return (
              <TableRow key={material.id} className="group">
                <TableCell className="pl-5">
                  <p className="text-[12px] font-medium">{material.nombre}</p>
                  <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                    {material.sku} · lote {material.lote}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{CATEGORIA_LABEL[material.categoria]}</Badge>
                </TableCell>
                <TableCell>
                  <p className="text-[10.5px] text-muted-foreground">{material.ubicacion}</p>
                  <p className="text-[9.5px] text-muted-foreground/80">{material.proveedor}</p>
                </TableCell>
                <TableCell>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "text-[13px] font-semibold tabular-nums",
                        critico && "text-primary",
                      )}
                    >
                      {formatNumber(material.stock)}
                    </span>
                    <span className="text-[9.5px] text-muted-foreground">
                      {material.unidad} · mín. {formatNumber(material.stockMinimo)}
                    </span>
                  </div>
                  <Progress
                    value={cobertura}
                    className="mt-1.5 h-1 w-28"
                    indicatorClassName={critico ? "bg-primary" : "bg-markenny-ink/70 dark:bg-white/60"}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-[11px] font-medium tabular-nums">
                    {formatCurrency(material.stock * material.costoUnitario)}
                  </span>
                  <p className="text-[9px] text-muted-foreground">
                    {formatCurrency(material.costoUnitario)} / {material.unidad}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={info.variant}>{info.label}</Badge>
                </TableCell>
                <TableCell className="pr-5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-60 transition-opacity group-hover:opacity-100"
                    onClick={() => onRegistrar(material)}
                    aria-label={`Registrar movimiento de ${material.nombre}`}
                  >
                    <ArrowDownUp className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
