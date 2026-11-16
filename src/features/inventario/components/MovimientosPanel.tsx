import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Lock,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { MovimientoInventario, TipoMovimiento } from "@/shared/domain";

const MOVIMIENTO_UI: Record<
  TipoMovimiento,
  { label: string; icon: LucideIcon; className: string }
> = {
  ENTRADA: {
    label: "Entrada",
    icon: ArrowDownLeft,
    className: "text-foreground bg-muted",
  },
  SALIDA: {
    label: "Salida",
    icon: ArrowUpRight,
    className: "text-primary bg-primary/10",
  },
  AJUSTE: {
    label: "Ajuste",
    icon: SlidersHorizontal,
    className: "text-foreground bg-muted",
  },
  RESERVA: {
    label: "Reserva",
    icon: Lock,
    className: "text-primary bg-primary/10",
  },
};

interface MovimientosPanelProps {
  movimientos: MovimientoInventario[];
  isLoading?: boolean;
}

export function MovimientosPanel({ movimientos, isLoading }: MovimientosPanelProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center gap-2 border-b border-border/70 pb-4">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-muted text-foreground">
          <History className="h-4 w-4" />
        </span>
        <div>
          <CardTitle className="text-base">Kardex de movimientos</CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Últimos movimientos auditados del almacén
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="divide-y divide-border/70">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-5 py-4">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-24 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : movimientos.length === 0 ? (
          <p className="px-5 py-12 text-center text-xs text-muted-foreground">
            Aún no hay movimientos registrados.
          </p>
        ) : (
          <div className="divide-y divide-border/70">
            {movimientos.map((movimiento) => {
              const ui = MOVIMIENTO_UI[movimiento.tipo];
              return (
                <div
                  key={movimiento.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                      ui.className,
                    )}
                  >
                    <ui.icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">
                      {movimiento.materialNombre}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {movimiento.motivo} · {movimiento.usuario}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-[12px] font-semibold tabular-nums",
                        movimiento.tipo === "SALIDA" || movimiento.tipo === "RESERVA"
                          ? "text-primary"
                          : "text-foreground",
                      )}
                    >
                      {movimiento.tipo === "ENTRADA" ? "+" : "−"}
                      {formatNumber(movimiento.cantidad)}
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      {formatDate(movimiento.fecha, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
