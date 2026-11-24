import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  Factory,
  Plus,
  Waypoints,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency, formatDate, formatNumber, percent } from "@/lib/utils";
import { FASES_PLANTA } from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";
import type { DashboardData } from "../hooks/useDashboard";
import { KpiCard } from "./KpiCard";

interface DashboardViewProps {
  data: DashboardData;
  fecha?: string;
}

const DIA_MS = 86_400_000;

function etiquetaEntrega(fecha: string) {
  const diff = new Date(fecha).getTime() - Date.now();
  const dias = Math.ceil(diff / DIA_MS);
  if (dias < 0) return { text: `Vencida ${Math.abs(dias)} d`, urgent: true };
  if (dias === 0) return { text: "Hoy", urgent: true };
  if (dias === 1) return { text: "Mañana", urgent: true };
  return { text: `En ${dias} días`, urgent: dias <= 3 };
}

export function DashboardView({ data, fecha }: DashboardViewProps) {
  const totalOrdenes = data.ordenes.length || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={fecha ?? "Centro de producción"}
        title="Control de planta"
        description="Vista consolidada de ventas, producción e inventario de MARKENNY, C.A."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/planta">
                <Waypoints className="h-4 w-4" />
                Ver planta
              </Link>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Órdenes activas"
          value={String(data.ordenesActivas).padStart(2, "0")}
          hint={`${data.ordenes.length} órdenes en el ciclo actual · ${data.entregasSemana} entregan esta semana`}
          icon={Activity}
          progress={percent(data.ordenesActivas, totalOrdenes)}
          tone="dark"
        />
        <KpiCard
          label="En control de calidad"
          value={String(data.enRevision).padStart(2, "0")}
          hint="Trabajos esperando aprobación de color y registro"
          icon={ClipboardCheck}
          progress={percent(data.enRevision, totalOrdenes)}
          tone="red"
        />
        <KpiCard
          label="Entregas próximas"
          value={String(data.entregasSemana).padStart(2, "0")}
          hint="Compromisos de entrega en los próximos 7 días"
          icon={CalendarClock}
          progress={Math.min(100, (data.entregasSemana / 7) * 100)}
        />
        <KpiCard
          label="Valor en inventario"
          value={formatCurrency(data.valorInventario)}
          hint={`${data.stockCritico.length} materiales por debajo del mínimo`}
          icon={Boxes}
          progress={Math.max(4, 100 - percent(data.stockCritico.length, data.inventario.length || 1))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/70 pb-4">
              <div>
                <CardTitle>Flujo de producción</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Distribución de órdenes en las 4 fases de control
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/planta">
                  Abrir tablero
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {FASES_PLANTA.map((fase, index) => {
                  const ui = FASE_UI[fase];
                  const cantidad = data.porFase[fase];
                  const pct = percent(cantidad, totalOrdenes);
                  return (
                    <div
                      key={fase}
                      className="group relative overflow-hidden rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "grid h-6 w-6 place-items-center rounded-sm font-display text-[11px] font-semibold",
                              ui.soft,
                              ui.accent,
                            )}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <p className="text-[12px] font-semibold">{ui.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {fase === "EN_PROCESO" && "Impresión y acabados"}
                              {fase === "EN_REVISION" && "QC y aprobación"}
                              {fase === "FINALIZADO" && "Listo para empaque"}
                              {fase === "EMPAQUETADO" && "Despacho pendiente"}
                            </p>
                          </div>
                        </div>
                        <span className="font-display text-2xl font-semibold tabular-nums">
                          {cantidad}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress
                          value={pct}
                          className="h-1 bg-muted"
                          indicatorClassName={fase === "EN_REVISION" ? "bg-primary" : undefined}
                        />
                        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/70 pb-4">
              <div>
                <CardTitle>Próximas entregas</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Órdenes activas ordenadas por fecha compromiso
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/ventas/ordenes">
                  Ver todas
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/70">
                {data.proximasEntregas.map((orden) => {
                  const entrega = etiquetaEntrega(orden.fechaEntrega);
                  return (
                    <Link
                      key={orden.id}
                      to="/planta"
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold text-primary">
                            {orden.codigo}
                          </span>
                          <Badge variant={FASE_UI[orden.fase].badge} className="scale-90">
                            {FASE_UI[orden.fase].label}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-[13px] font-medium">
                          {orden.producto}
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            · {orden.clienteNombre}
                          </span>
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-[11px] font-medium tabular-nums">
                          {formatNumber(orden.cantidad)} u.
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatCurrency(orden.montoTotal)}
                        </p>
                      </div>
                      <div className="w-[86px] shrink-0 text-right">
                        <p
                          className={cn(
                            "text-[11px] font-semibold",
                            entrega.urgent ? "text-primary" : "text-foreground",
                          )}
                        >
                          {entrega.text}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(orden.fechaEntrega, {
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/70 pb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <div>
                  <CardTitle className="text-base">Alertas de stock</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Bajo mínimo operativo</p>
                </div>
              </div>
              <Badge variant="solid">{data.stockCritico.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {data.stockCritico.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">
                  Sin alertas: todo el inventario está sobre el mínimo.
                </p>
              ) : (
                <div className="divide-y divide-border/70">
                  {data.stockCritico.slice(0, 5).map((material) => {
                    const faltante = Math.max(
                      1,
                      material.stockMinimo - material.stock,
                    );
                    return (
                      <div key={material.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium">
                              {material.nombre}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {material.sku} · {material.ubicacion}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold text-primary">
                            −{formatNumber(faltante)} {material.unidad}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress
                            value={Math.min(
                              100,
                              (material.stock / material.stockMinimo) * 100,
                            )}
                            className="h-1"
                          />
                          <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">
                            {formatNumber(material.stock)}/{formatNumber(material.stockMinimo)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Separator />
              <div className="p-3">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/inventario">
                    Gestionar inventario
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-foreground">
                  <Factory className="h-3.5 w-3.5" />
                </span>
                <div>
                  <CardTitle className="text-base">Carga por máquina</CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Órdenes activas asignadas
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {data.cargaPorMaquina.map((item, index) => {
                const max = data.cargaPorMaquina[0]?.ordenes || 1;
                return (
                  <div key={item.maquina}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="truncate text-[11px] font-medium">
                        {item.maquina}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {item.ordenes} OT
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          index === 0 ? "bg-primary" : "bg-markenny-ink/70 dark:bg-white/60",
                        )}
                        style={{ width: `${(item.ordenes / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {data.cargaPorMaquina.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin carga registrada.</p>
              )}
              <div className="rounded-md bg-muted/60 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Monto en producción
                </p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                  {formatCurrency(data.montoEnProduccion)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
