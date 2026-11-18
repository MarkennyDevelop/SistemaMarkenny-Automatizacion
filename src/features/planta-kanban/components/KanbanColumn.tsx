import { useState } from "react";
import { Inbox } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn, formatCurrency } from "@/lib/utils";
import type { FasePlanta, OrdenTrabajo } from "@/shared/domain";
import { FASE_PLANTA } from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";
import { OrdenCard, OrdenCardSkeleton } from "./OrdenCard";

const LINEA: Record<FasePlanta, string> = {
  EN_PROCESO: "w-1/2 bg-primary",
  EN_REVISION: "w-3/4 bg-primary",
  FINALIZADO: "w-full bg-markenny-ink dark:bg-white",
  EMPACADO: "w-full bg-muted-foreground/50",
};

interface KanbanColumnProps {
  fase: FasePlanta;
  indice: number;
  ordenes: OrdenTrabajo[];
  isLoading?: boolean;
  movingId?: string | null;
  onMoveOrden: (ordenId: string, fase: FasePlanta) => void;
  onOpenOrden?: (orden: OrdenTrabajo) => void;
  onDragStart: (ordenId: string) => void;
  onDragEnd: () => void;
}

export function KanbanColumn({
  fase,
  indice,
  ordenes,
  isLoading,
  movingId,
  onMoveOrden,
  onOpenOrden,
  onDragStart,
  onDragEnd,
}: KanbanColumnProps) {
  const [sobre, setSobre] = useState(false);
  const ui = FASE_UI[fase];
  const total = ordenes.reduce((suma, orden) => suma + orden.montoTotal, 0);
  const avancePromedio = ordenes.length
    ? Math.round(ordenes.reduce((suma, orden) => suma + orden.avance, 0) / ordenes.length)
    : 0;

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setSobre(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setSobre(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setSobre(false);
        const ordenId = event.dataTransfer.getData("text/plain");
        if (ordenId) onMoveOrden(ordenId, fase);
      }}
      className={cn(
        "flex w-[300px] shrink-0 flex-col rounded-xl border border-border bg-muted/40 transition-colors xl:w-auto xl:flex-1",
        sobre && "border-primary/50 bg-primary/[0.04]",
      )}
      aria-label={`Columna ${ui.label}`}
    >
      <header className="px-3.5 pb-3 pt-3.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-sm font-display text-[10px] font-semibold",
              ui.soft,
              ui.accent,
            )}
          >
            {String(indice + 1).padStart(2, "0")}
          </span>
          <h2 className="min-w-0 flex-1 truncate font-display text-sm font-semibold uppercase tracking-wide">
            {ui.label}
          </h2>
          <span className="grid h-5 min-w-5 place-items-center rounded-full border border-border bg-background px-1.5 text-[10px] font-semibold tabular-nums">
            {ordenes.length}
          </span>
        </div>
        <p className="mt-1.5 truncate text-[10px] text-muted-foreground">
          {FASE_PLANTA[fase].description}
        </p>
        <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-border">
          <div className={cn("h-full rounded-full", LINEA[fase])} />
        </div>
      </header>

      <div className="min-h-[190px] flex-1 space-y-2.5 px-2.5 pb-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => <OrdenCardSkeleton key={index} />)
        ) : ordenes.length === 0 ? (
          <div
            className={cn(
              "flex h-[170px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 text-center transition-colors",
              sobre && "border-primary/40 bg-primary/[0.03]",
            )}
          >
            <Inbox className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-[10px] font-medium text-muted-foreground">
              {sobre ? "Suelta aquí la orden" : "Sin órdenes en esta fase"}
            </p>
            <p className="px-4 text-[9px] leading-snug text-muted-foreground/70">
              Arrastra una tarjeta o usa el menú de la orden.
            </p>
          </div>
        ) : (
          ordenes.map((orden) => (
            <OrdenCard
              key={orden.id}
              orden={orden}
              isMoving={movingId === orden.id}
              onMove={(nuevaFase) => onMoveOrden(orden.id, nuevaFase)}
              onOpen={() => onOpenOrden?.(orden)}
              onDragStart={() => onDragStart(orden.id)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-border/70 px-3.5 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>Avance medio</span>
            <span className="tabular-nums">{avancePromedio}%</span>
          </div>
          <Progress value={avancePromedio} className="mt-1 h-0.5" />
        </div>
        <span className="shrink-0 border-l border-border pl-2 text-[9px] font-medium tabular-nums text-muted-foreground">
          {formatCurrency(total)}
        </span>
      </footer>
    </section>
  );
}
