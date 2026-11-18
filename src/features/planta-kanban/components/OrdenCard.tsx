import { useState } from "react";
import {
  CalendarClock,
  ClipboardCheck,
  Eye,
  GripVertical,
  MoreHorizontal,
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
  FASE_PLANTA,
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
  onOpen?: () => void;
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

export function siguienteFaseDe(fase: FasePlanta): FasePlanta | null {
  const indice = FASES_PLANTA.indexOf(fase);
  return FASES_PLANTA[indice + 1] ?? null;
}

export function OrdenCard({
  orden,
  isMoving,
  onMove,
  onOpen,
  onDragStart,
  onDragEnd,
}: OrdenCardProps) {
  const [dragging, setDragging] = useState(false);
  const fecha = entrega(orden.fechaEntrega);
  const prioridadAlta = orden.prioridad === "URGENTE" || orden.prioridad === "ALTA";
  const siguiente = siguienteFaseDe(orden.fase);

  return (
    <article
      draggable={Boolean(siguiente)}
      onDragStart={(event) => {
        if (!siguiente) {
          event.preventDefault();
          return;
        }
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
        "group relative rounded-lg border border-border bg-card p-3.5 shadow-card transition-all hover:border-primary/30 hover:shadow-raised",
        siguiente ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        (dragging || isMoving) && "opacity-50",
      )}
      aria-label={`${orden.codigo} · ${orden.producto}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {siguiente && (
            <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          )}
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
                aria-label={`Acciones de ${orden.codigo}`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Control de calidad
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-xs" onSelect={() => onOpen?.()}>
                <Eye className="h-3.5 w-3.5" />
                Ver ficha y auditoría
              </DropdownMenuItem>
              {siguiente ? (
                <DropdownMenuItem
                  className="gap-2 text-xs"
                  onSelect={() => onMove(siguiente)}
                >
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                  Avanzar a {FASE_UI[siguiente].label}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled className="gap-2 text-[11px]">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Circuito completado
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="gap-2 text-[10px] leading-snug">
                Flujo secuencial: sin saltos ni retrocesos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen?.()}
        className="mt-2 block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <h3 className="line-clamp-2 text-[12.5px] font-semibold leading-snug hover:text-primary">
          {orden.producto}
        </h3>
      </button>
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

      {siguiente && (
        <button
          type="button"
          onClick={() => onMove(siguiente)}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/30 bg-primary/[0.04] py-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/[0.08]"
        >
          <ClipboardCheck className="h-3 w-3" />
          Marcar {FASE_PLANTA[siguiente].label}
        </button>
      )}

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
