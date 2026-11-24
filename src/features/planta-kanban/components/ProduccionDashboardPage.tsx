import { useMemo, useState } from "react";
import {
  AlertCircle,
  BellRing,
  ClipboardCheck,
  PackageCheck,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
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
import { cn, formatNumber } from "@/lib/utils";
import { FASES_PLANTA, type FasePlanta, type OrdenTrabajo, SIN_MAQUINA } from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";
import { KanbanBoard } from "./KanbanBoard";
import { OrdenDetalleDialog } from "./OrdenDetalleDialog";
import { siguienteFaseDe } from "./OrdenCard";
import { usePlantaBoard } from "../hooks/usePlantaBoard";
import { usePlantaEnVivo } from "../hooks/usePlantaEnVivo";

const ICONO_FASE: Record<FasePlanta, typeof Play> = {
  EN_PROCESO: Play,
  EN_REVISION: ShieldCheck,
  FINALIZADO: ClipboardCheck,
  EMPAQUETADO: PackageCheck,
};

function hace(fecha: Date | null) {
  if (!fecha) return "—";
  const segundos = Math.max(0, Math.round((Date.now() - fecha.getTime()) / 1000));
  if (segundos < 5) return "ahora mismo";
  if (segundos < 60) return `hace ${segundos} s`;
  return `hace ${Math.round(segundos / 60)} min`;
}

export function ProduccionDashboardPage() {
  const {
    ordenes,
    isLoading,
    isFetching,
    isError,
    actualizadoEn,
    moverOrden,
    isMoving,
    ordenesEnMovimiento,
    refetch,
  } = usePlantaBoard();
  const { conectado, modo } = usePlantaEnVivo();

  const [busqueda, setBusqueda] = useState("");
  const [maquina, setMaquina] = useState("todas");
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const maquinas = useMemo(
    () => [...new Set(ordenes.map((orden) => orden.maquina ?? SIN_MAQUINA))].sort(),
    [ordenes],
  );

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return ordenes.filter((orden) => {
      const coincideMaquina = maquina === "todas" || (orden.maquina ?? SIN_MAQUINA) === maquina;
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

  const conteo = (fase: FasePlanta) =>
    ordenes.filter((orden) => orden.fase === fase).length;

  const detalle = ordenes.find((orden) => orden.id === detalleId) ?? null;

  const abrirDetalle = (orden: OrdenTrabajo) => setDetalleId(orden.id);

  const avanzar = (orden: OrdenTrabajo, nota?: string) => {
    const siguiente = siguienteFaseDe(orden.fase);
    if (!siguiente) return;

    // El aviso "notificación enviada" lo muestra el hook solo cuando el
    // servidor confirma el avance; antes salía aunque la operación fallara.
    moverOrden({ ordenId: orden.id, fase: siguiente, origen: orden.fase, nota });
  };

  const devolver = (orden: OrdenTrabajo, motivo: string) => {
    moverOrden({ ordenId: orden.id, fase: "EN_PROCESO", origen: orden.fase, nota: motivo });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Producción · Control de calidad"
        title="Taller y despacho"
        description="Órdenes recibidas de ventas. Cada avance es secuencial y queda auditado con tu usuario, rol y fecha."
        actions={
          <Button
            variant="outline"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Sincronizar taller"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FASES_PLANTA.map((fase, index) => {
          const Icono = ICONO_FASE[fase];
          return (
            <div
              key={fase}
              className={cn(
                "flex items-center justify-between rounded-lg border bg-card px-4 py-3",
                fase === "FINALIZADO" && conteo(fase) > 0
                  ? "border-primary/30 bg-primary/[0.03]"
                  : "border-border",
              )}
            >
              <div>
                <p className="section-label">
                  {String(index + 1).padStart(2, "0")} · {FASE_UI[fase].label}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {String(conteo(fase)).padStart(2, "0")}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {fase === "FINALIZADO" && conteo(fase) > 0
                    ? "pendientes de empaque"
                    : "órdenes en esta fase"}
                </p>
              </div>
              <Icono
                className={cn(
                  "h-5 w-5",
                  fase === "FINALIZADO" && conteo(fase) > 0
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
            </div>
          );
        })}
      </div>

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
            {conectado ? "Taller conectado" : "Sin conexión"}
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
          <BellRing className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">
            {conteo("FINALIZADO")}
          </span>{" "}
          listas para empaque
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
            aria-label="Buscar en el taller"
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
        <p className="text-[10px] leading-snug text-muted-foreground sm:ml-auto sm:max-w-[280px] sm:text-right">
          Arrastra a la columna siguiente o abre la ficha para registrar la nota de
          calidad y el avance.
        </p>
      </div>

      {isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <AlertCircle className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium">No se pudo cargar el tablero de taller</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        </Card>
      ) : (
        <KanbanBoard
          columnas={columnas}
          isLoading={isLoading}
          ordenesEnMovimiento={ordenesEnMovimiento}
          onMoveOrden={(ordenId, fase) => {
            const orden = ordenes.find((item) => item.id === ordenId);
            if (orden) moverOrden({ ordenId, fase, origen: orden.fase });
          }}
          onOpenOrden={abrirDetalle}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-[10px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide text-foreground">
          Flujo obligatorio
        </span>
        En Proceso → En Revisión → Finalizado → Empaquetado. Desde En Revisión o
        Finalizado la orden puede volver a En Proceso con motivo (retrabajo). Cada
        cambio avisa al vendedor en su campana y en el seguimiento.
        <span className="ml-auto tabular-nums">
          {formatNumber(ordenes.length)} órdenes · {isMoving ? "moviendo..." : "listo"}
        </span>
      </div>

      <OrdenDetalleDialog
        orden={detalle}
        onOpenChange={(abierto) => !abierto && setDetalleId(null)}
        onAvanzar={avanzar}
        onRetrabajo={devolver}
        isPending={detalle ? ordenesEnMovimiento.includes(detalle.id) : false}
      />
    </div>
  );
}
