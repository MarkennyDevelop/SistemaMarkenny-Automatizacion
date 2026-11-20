import { useMemo } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  FileStack,
  FileText,
  Layers3,
  PackageCheck,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { useAuth } from "@/features/auth";
import {
  CATEGORIA_TRABAJO_LABEL,
  FASES_PLANTA,
  type CategoriaTrabajo,
  type OrdenTrabajo,
} from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";
import { useOrdenesTrabajo } from "../hooks/useOrdenesTrabajo";

const ACCESOS = [
  {
    to: "/ventas/nueva-orden",
    label: "Papelería corporativa",
    hint: "Facturas, talonarios, récipes",
    icon: FileText,
  },
  {
    to: "/ventas/nueva-orden/pendones",
    label: "Pendones y stickers",
    hint: "Gran formato y adhesivos",
    icon: Layers3,
  },
  {
    to: "/ventas/cotizador",
    label: "Cotizador",
    hint: "Cálculo de costos y margen",
    icon: FileStack,
  },
  {
    to: "/ventas/clientes",
    label: "Clientes",
    hint: "Cartera y datos fiscales",
    icon: ClipboardList,
  },
];

function progresoFase(orden: OrdenTrabajo) {
  const indice = FASES_PLANTA.indexOf(orden.fase);
  return ((indice + 1) / FASES_PLANTA.length) * 100;
}

export function VentasDashboardPage() {
  const { usuario } = useAuth();
  const { data: ordenes = [], isLoading } = useOrdenesTrabajo();

  const resumen = useMemo(() => {
    const activas = ordenes.filter((orden) => orden.fase !== "EMPAQUETADO");
    const listas = ordenes.filter(
      (orden) => orden.fase === "FINALIZADO" || orden.fase === "EMPAQUETADO",
    );
    const enTaller = ordenes.filter(
      (orden) => orden.fase === "EN_PROCESO" || orden.fase === "EN_REVISION",
    );
    const porCategoria = ordenes.reduce(
      (acc, orden) => {
        const categoria = orden.categoriaTrabajo ?? "GENERAL";
        acc[categoria] += 1;
        return acc;
      },
      { PAPELERIA: 0, GRAN_FORMATO: 0, GENERAL: 0 } as Record<CategoriaTrabajo, number>,
    );
    return {
      activas,
      listas,
      enTaller,
      porCategoria,
      montoActivo: activas.reduce((total, orden) => total + orden.montoTotal, 0),
    };
  }, [ordenes]);

  const recientes = useMemo(
    () =>
      [...ordenes]
        .sort(
          (a, b) =>
            new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime(),
        )
        .slice(0, 6),
    [ordenes],
  );

  const nombre = usuario?.nombre.split(" ")[0] ?? "vendedor";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ventas · Mi jornada"
        title={`Hola, ${nombre}`}
        description="Tus órdenes, cotizaciones y el avance de cada trabajo en las cuatro fases de control."
        actions={
          <Button asChild>
            <Link to="/ventas/nueva-orden">
              <Plus className="h-4 w-4" />
              Nueva orden
            </Link>
          </Button>
        }
      />

      {resumen.listas.length > 0 && (
        <Link
          to="/ventas/seguimiento"
          className="group flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] px-4 py-3.5 transition-colors hover:bg-primary/[0.08] sm:flex-row sm:items-center"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <PackageCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-primary">
              {resumen.listas.length} pedido(s) listos para entrega
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Producción marcó estas órdenes como finalizadas o empaquetadas. Coordina
              la entrega con el cliente.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary">
            Ver seguimiento
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Órdenes activas</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {String(resumen.activas.length).padStart(2, "0")}
            </p>
            <p className="text-[9px] text-muted-foreground">en las 4 fases de planta</p>
          </div>
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">En taller</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-primary">
              {String(resumen.enTaller.length).padStart(2, "0")}
            </p>
            <p className="text-[9px] text-muted-foreground">proceso y revisión</p>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Listos para entrega</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {String(resumen.listas.length).padStart(2, "0")}
            </p>
            <p className="text-[9px] text-muted-foreground">finalizados y empaquetados</p>
          </div>
          <PackageCheck className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Monto en producción</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {formatCurrency(resumen.montoActivo)}
            </p>
            <p className="text-[9px] text-muted-foreground">órdenes sin despachar</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold uppercase tracking-wide">
              Órdenes recientes
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/ventas/ordenes">
                Ver todas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <Card className="divide-y divide-border/70 overflow-hidden">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2 px-4 py-3.5">
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-56 animate-pulse rounded bg-muted" />
                  <div className="h-1 w-full animate-pulse rounded bg-muted" />
                </div>
              ))
            ) : recientes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">Aún no tienes órdenes</p>
                <p className="text-xs text-muted-foreground">
                  Crea la primera ficha de papelería o gran formato.
                </p>
              </div>
            ) : (
              recientes.map((orden) => (
                <Link
                  key={orden.id}
                  to={`/ventas/seguimiento?ot=${orden.codigo}`}
                  className="group block px-4 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold text-primary">
                          {orden.codigo}
                        </span>
                        <Badge variant={FASE_UI[orden.fase].badge} className="scale-90">
                          {FASE_UI[orden.fase].label}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[12.5px] font-medium">
                        {orden.producto}
                      </p>
                      <p className="truncate text-[10.5px] text-muted-foreground">
                        {orden.clienteNombre} ·{" "}
                        {CATEGORIA_TRABAJO_LABEL[orden.categoriaTrabajo ?? "GENERAL"]}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold tabular-nums">
                        {formatCurrency(orden.montoTotal)}
                      </p>
                      <p className="mt-0.5 flex items-center justify-end gap-1 text-[9.5px] text-muted-foreground">
                        <CalendarClock className="h-3 w-3" />
                        {formatDate(orden.fechaEntrega, { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Progress
                      value={progresoFase(orden)}
                      className="h-1"
                      indicatorClassName={cn(
                        orden.fase === "EMPAQUETADO" ? "bg-muted-foreground" : "bg-primary",
                      )}
                    />
                    <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">
                      {formatNumber(orden.cantidad)} u.
                    </span>
                  </div>
                </Link>
              ))
            )}
          </Card>
        </section>

        <div className="space-y-4">
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold uppercase tracking-wide">
              Crear trabajo
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACCESOS.map((acceso) => (
                <Link
                  key={acceso.to}
                  to={acceso.to}
                  className="group rounded-lg border border-border bg-card p-3.5 transition-all hover:border-primary/35 hover:shadow-card"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <acceso.icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-[12px] font-semibold leading-tight">
                    {acceso.label}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {acceso.hint}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
                Mezcla de trabajos
              </h2>
              <Badge variant="muted">{ordenes.length} OT</Badge>
            </div>
            <div className="mt-3 space-y-2.5">
              {(Object.keys(resumen.porCategoria) as CategoriaTrabajo[]).map(
                (categoria) => {
                  const total = resumen.porCategoria[categoria];
                  const porcentaje = ordenes.length
                    ? Math.round((total / ordenes.length) * 100)
                    : 0;
                  return (
                    <div key={categoria}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {CATEGORIA_TRABAJO_LABEL[categoria]}
                        </span>
                        <span className="font-medium tabular-nums">
                          {total} · {porcentaje}%
                        </span>
                      </div>
                      <Progress value={porcentaje} className="mt-1 h-1" />
                    </div>
                  );
                },
              )}
            </div>
          </section>

          <div className="rounded-lg border border-dashed border-border px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide text-foreground">
              Alcance del vendedor
            </span>{" "}
            · Clientes, cotizaciones, órdenes y seguimiento. La gestión de usuarios y la
            configuración del sistema son exclusivas del administrador.
          </div>
        </div>
      </div>
    </div>
  );
}
