import { ArrowUpRight, Inbox } from "lucide-react";
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
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { PRIORIDAD_LABEL, type OrdenTrabajo, SIN_MAQUINA } from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";

interface OrdenesTrabajoTableProps {
  ordenes: OrdenTrabajo[];
  isLoading?: boolean;
  onOpen?: (orden: OrdenTrabajo) => void;
}

export function OrdenesTrabajoTable({
  ordenes,
  isLoading,
  onOpen,
}: OrdenesTrabajoTableProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="divide-y divide-border/70">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (ordenes.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium">No hay órdenes con estos filtros</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Ajusta la búsqueda o la fase seleccionada, o crea una nueva orden de trabajo.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-5">Orden</TableHead>
            <TableHead>Cliente / producto</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Avance</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-12 pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenes.map((orden) => (
            <TableRow key={orden.id} className="group">
              <TableCell className="pl-5 align-top">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] font-semibold text-primary">
                    {orden.codigo}
                  </span>
                  <span
                    className={cn(
                      "w-fit text-[9px] font-semibold uppercase tracking-wider",
                      orden.prioridad === "URGENTE" || orden.prioridad === "ALTA"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {PRIORIDAD_LABEL[orden.prioridad]}
                  </span>
                </div>
              </TableCell>
              <TableCell className="max-w-[320px] align-top">
                <p className="truncate text-[12px] font-medium">{orden.clienteNombre}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {orden.producto} · {formatNumber(orden.cantidad)} u.
                </p>
              </TableCell>
              <TableCell className="align-top">
                <Badge variant={FASE_UI[orden.fase].badge}>
                  {FASE_UI[orden.fase].label}
                </Badge>
              </TableCell>
              <TableCell className="w-[130px] align-top">
                <div className="flex items-center gap-2">
                  <Progress value={orden.avance} className="h-1 w-16" />
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {orden.avance}%
                  </span>
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground">{orden.maquina ?? SIN_MAQUINA}</p>
              </TableCell>
              <TableCell className="align-top">
                <p className="text-[11px] font-medium">
                  {formatDate(orden.fechaEntrega, {
                    day: "2-digit",
                    month: "short",
                    year: undefined,
                  })}
                </p>
                <p className="text-[9px] text-muted-foreground">{orden.operador}</p>
              </TableCell>
              <TableCell className="text-right align-top">
                <span className="text-[12px] font-semibold tabular-nums">
                  {formatCurrency(orden.montoTotal)}
                </span>
              </TableCell>
              <TableCell className="pr-5 align-top">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onOpen?.(orden)}
                  aria-label={`Abrir ${orden.codigo} en planta`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
