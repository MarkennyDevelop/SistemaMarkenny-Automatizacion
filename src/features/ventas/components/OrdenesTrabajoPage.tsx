import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { FASES_PLANTA, type FasePlanta } from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";
import { useOrdenesTrabajo } from "../hooks/useOrdenesTrabajo";
import { OrdenesTrabajoTable } from "./ordenes/OrdenesTrabajoTable";

type FiltroFase = FasePlanta | "TODAS";

export function OrdenesTrabajoPage() {
  const navigate = useNavigate();
  const { data: ordenes = [], isLoading, isError, refetch, isFetching } = useOrdenesTrabajo();
  const [busqueda, setBusqueda] = useState("");
  const [fase, setFase] = useState<FiltroFase>("TODAS");

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return ordenes.filter((orden) => {
      const coincideFase = fase === "TODAS" || orden.fase === fase;
      const coincideBusqueda =
        !termino ||
        orden.codigo.toLowerCase().includes(termino) ||
        orden.clienteNombre.toLowerCase().includes(termino) ||
        orden.producto.toLowerCase().includes(termino);
      return coincideFase && coincideBusqueda;
    });
  }, [ordenes, busqueda, fase]);

  const montoFiltrado = filtradas.reduce((total, orden) => total + orden.montoTotal, 0);

  const conteo = (valor: FiltroFase) =>
    valor === "TODAS"
      ? ordenes.length
      : ordenes.filter((orden) => orden.fase === valor).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ventas · Producción"
        title="Órdenes de trabajo"
        description="Todas las órdenes activas con su fase de planta, avance y compromiso de entrega."
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label="Actualizar órdenes"
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

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Órdenes filtradas</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {String(filtradas.length).padStart(2, "0")}
            </p>
          </div>
          <Badge variant="muted">{formatNumber(ordenes.length)} total</Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Monto en cartera</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {formatCurrency(montoFiltrado)}
            </p>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">En control de calidad</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {String(conteo("EN_REVISION")).padStart(2, "0")}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/planta">
              Planta
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por OT, cliente o producto..."
              className="pl-9"
              aria-label="Buscar órdenes"
            />
          </div>
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto lg:ml-auto">
            {(["TODAS", ...FASES_PLANTA] as FiltroFase[]).map((valor) => {
              const activo = fase === valor;
              const label = valor === "TODAS" ? "Todas" : FASE_UI[valor].label;
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setFase(valor)}
                  aria-pressed={activo}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    activo
                      ? "border-markenny-ink bg-markenny-ink text-white dark:border-white dark:bg-white dark:text-markenny-ink"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "rounded-sm px-1 text-[9px] tabular-nums",
                      activo ? "bg-white/15" : "bg-muted",
                    )}
                  >
                    {conteo(valor)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <AlertCircle className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium">No se pudieron cargar las órdenes</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        </Card>
      ) : (
        <OrdenesTrabajoTable
          ordenes={filtradas}
          isLoading={isLoading}
          onOpen={() => navigate("/planta")}
        />
      )}
    </div>
  );
}
