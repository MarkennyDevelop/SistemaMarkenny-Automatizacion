import { useState } from "react";
import {
  CalendarClock,
  GripVertical,
  MoreHorizontal,
  MoveRight,
  Printer,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { cn, formatNumber, initials } from "@/lib/utils";
import {
  FASES_PLANTA,
  PRIORIDAD_LABEL,
  TECNOLOGIA_LABEL,
  type FasePlanta,
  type OrdenTrabajo,
} from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";

interface OrdenCardProps {
  orden: OrdenTrabajo;
  isMoving?: boolean;
  onMove: (fase: FasePlanta) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function entrega(fecha: string) {
  const dias = Math.ceil(
    (new Date(fecha).getTime() - Date.now()) / 86_400_000,
  );
  if (dias < 0) return { texto: `Vencida ${Math.abs(dias)} d`, urgente: true };
  if (dias === 0) return { texto: "Entrega hoy", urgente: true };
  if (dias === 1) return { texto: "Entrega mañana", urgente: true };
  return { texto: `En ${dias} días`, urgente: dias <= 3 };
}

export function OrdenCard({
  orden,
  isMoving,
  onMove,
  onDragStart,
  onDragEnd,
}: OrdenCardProps) {
  const [dragging, setDragging] = useState(false);
  const fecha = entrega(orden.fechaEntrega);
  const prioridadAlta = orden.prioridad === "URGENTE" || orden.prioridad === "ALTA";

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", orden.id);
        event.dataTransfer.effectAllowed = "move";
        setDragging(true);
        onDragStart();
      }}
      onDragEnd={() => {
        setDragging(false);
        onDragEnd();
      }}
      className={cn(
        "group relative cursor-grab rounded-lg border border-border bg-card p-3.5 shadow-card transition-all hover:border-primary/30 hover:shadow-raised active:cursor-grabbing",
        (dragging || isMoving) && "opacity-50",
      )}
      aria-label={`${orden.codigo} · ${orden.producto}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          <span className="truncate font-mono text-[10px] font-semibold text-primary">
            {orden.codigo}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant={prioridadAlta ? "destructive" : "muted"}
            className="px-1.5 py-0 text-[8px]"
          >
            {PRIORIDAD_LABEL[orden.prioridad]}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                aria-label={`Mover ${orden.codigo}`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Mover a fase
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {FASES_PLANTA.map((fase) => (
                <DropdownMenuItem
                  key={fase}
                  disabled={fase === orden.fase}
                  onSelect={() => onMove(fase)}
                  className="gap-2 text-xs"
                >
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", FASE_UI[fase].dot)}
                  />
                  {FASE_UI[fase].label}
                  {fase === orden.fase && (
                    <span className="ml-auto text-[9px] text-muted-foreground">actual</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="gap-2 text-[11px]">
                <MoveRight className="h-3 w-3" />
                Las transiciones se validan en servidor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <h3 className="mt-2 line-clamp-2 text-[12.5px] font-semibold leading-snug">
        {orden.producto}
      </h3>
      <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
        {orden.clienteNombre}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          {TECNOLOGIA_LABEL[orden.tecnologia]}
        </span>
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground">
          {formatNumber(orden.cantidad)} u.
        </span>
        {orden.tintas.slice(0, 2).map((tinta) => (
          <span
            key={tinta}
            className="max-w-[92px] truncate rounded-sm bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
          >
            {tinta}
          </span>
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
        <Printer className="h-3 w-3 shrink-0" />
        <span className="truncate">{orden.maquina}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <Progress value={orden.avance} className="h-1" />
        <span className="shrink-0 text-[9px] font-medium tabular-nums text-muted-foreground">
          {orden.avance}%
        </span>
      </div>

      <footer className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-markenny-ink text-[8px] font-semibold text-white dark:bg-white dark:text-markenny-ink">
            {initials(orden.operador)}
          </span>
          <span className="truncate text-[9.5px] text-muted-foreground">
            {orden.operador}
          </span>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center gap-1 text-[9px] font-medium",
            fecha.urgente ? "text-primary" : "text-muted-foreground",
          )}
        >
          <CalendarClock className="h-3 w-3" />
          <span>{fecha.texto}</span>
        </div>
      </footer>

      {orden.prioridad === "URGENTE" && (
        <span className="absolute left-0 top-3 h-8 w-[2px] rounded-r bg-primary" />
      )}
    </article>
  );
}

export function OrdenCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-2.5 w-3/5 animate-pulse rounded bg-muted" />
      <div className="mt-3 flex gap-2">
        <div className="h-4 w-14 animate-pulse rounded bg-muted" />
        <div className="h-4 w-10 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 h-2 w-full animate-pulse rounded bg-muted" />
      <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-2.5">
        <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
        <div className="h-2 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function OrdenCardEmptyHint() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <UserRound className="h-3 w-3" />
      Sin operador asignado
    </div>
  );
}
