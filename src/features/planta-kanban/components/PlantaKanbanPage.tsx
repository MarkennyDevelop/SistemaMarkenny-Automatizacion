import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Waypoints,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";
import { FASES_PLANTA, type FasePlanta } from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";
import { KanbanBoard } from "./KanbanBoard";
import { usePlantaBoard } from "../hooks/usePlantaBoard";
import { usePlantaEnVivo } from "../hooks/usePlantaEnVivo";

function hace(fecha: Date | null) {
  if (!fecha) return "—";
  const segundos = Math.max(0, Math.round((Date.now() - fecha.getTime()) / 1000));
  if (segundos < 5) return "ahora mismo";
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.round(segundos / 60);
  return `hace ${minutos} min`;
}

export function PlantaKanbanPage() {
  const {
    ordenes,
    isLoading,
    isFetching,
    isError,
    actualizadoEn,
    moverOrden,
    ordenEnMovimiento,
    error,
    refetch,
  } = usePlantaBoard();
  const { conectado, modo } = usePlantaEnVivo();
  const [busqueda, setBusqueda] = useState("");
  const [maquina, setMaquina] = useState("todas");

  useEffect(() => {
    if (error) {
      toast.error("No se pudo mover la orden", {
        description:
          error instanceof Error ? error.message : "La tarjeta volvió a su fase original.",
      });
    }
  }, [error]);

  const maquinas = useMemo(
    () => [...new Set(ordenes.map((orden) => orden.maquina))].sort(),
    [ordenes],
  );

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return ordenes.filter((orden) => {
      const coincideMaquina = maquina === "todas" || orden.maquina === maquina;
      const coincideBusqueda =
        !termino ||
        orden.codigo.toLowerCase().includes(termino) ||
        orden.clienteNombre.toLowerCase().includes(termino) ||
        orden.producto.toLowerCase().includes(termino);
      return coincideMaquina && coincideBusqueda;
    });
  }, [ordenes, busqueda, maquina]);

  const columnas = FASES_PLANTA.map((fase) => ({
    fase,
    ordenes: filtradas.filter((orden) => orden.fase === fase),
  }));

  const enRevision = ordenes.filter((orden) => orden.fase === "EN_REVISION").length;
  const entregaHoy = ordenes.filter((orden) => {
    const hoy = new Date();
    const fecha = new Date(orden.fechaEntrega);
    return (
      fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear()
    );
  }).length;
  const valorPlanta = ordenes
    .filter((orden) => orden.fase !== "EMPACADO")
    .reduce((total, orden) => total + orden.montoTotal, 0);

  const handleMover = (ordenId: string, fase: FasePlanta) => {
    const orden = ordenes.find((item) => item.id === ordenId);
    if (!orden || orden.fase === fase) return;
    moverOrden({ ordenId, fase, origen: orden.fase });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Producción · Tiempo real"
        title="Planta Kanban"
        description="Tablero interactivo de las 4 fases de control. Arrastra una orden entre columnas o usa su menú contextual."
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label="Sincronizar tablero"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <Button asChild>
              <Link to="/ventas/nueva-orden">
                <Plus className="h-4 w-4" />
                Nueva orden
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-card px-4 py-3 shadow-card">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full",
                conectado ? "animate-pulse-ring bg-primary" : "bg-muted-foreground",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                conectado ? "bg-primary" : "bg-muted-foreground",
              )}
            />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide">
            {conectado ? "Planta conectada" : "Sin conexión"}
          </span>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {modo}
          </Badge>
        </div>

        <div className="hidden h-6 w-px bg-border sm:block" />

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Waypoints className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">{ordenes.length}</span> órdenes
          en planta
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="font-semibold text-foreground">{enRevision}</span> en revisión
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="font-semibold text-foreground">{entregaHoy}</span> entregan hoy
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          Valor activo
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(valorPlanta)}
          </span>
        </div>

        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {isFetching ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>Actualizado {hace(actualizadoEn)}</>
          )}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar OT, cliente o producto..."
            className="pl-9"
            aria-label="Buscar en el tablero"
          />
        </div>
        <Select value={maquina} onValueChange={setMaquina}>
          <SelectTrigger className="w-full sm:w-[230px]" aria-label="Filtrar por máquina">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las máquinas</SelectItem>
            {maquinas.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 sm:ml-auto">
          {FASES_PLANTA.map((fase) => (
            <span
              key={fase}
              className="hidden items-center gap-1 text-[10px] text-muted-foreground xl:inline-flex"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", FASE_UI[fase].dot)} />
              {FASE_UI[fase].label}
            </span>
          ))}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/ventas/ordenes">
              Ver órdenes
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <AlertCircle className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium">No se pudo cargar el tablero de planta</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        </Card>
      ) : (
        <KanbanBoard
          columnas={columnas}
          isLoading={isLoading}
          movingId={ordenEnMovimiento}
          onMoveOrden={handleMover}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-[10px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide text-foreground">
          Flujo controlado
        </span>
        Las transiciones se validan con la máquina de estados del backend; la tarjeta
        se mueve de forma optimista y se revierte si el servidor la rechaza.
      </div>
    </div>
  );
}
