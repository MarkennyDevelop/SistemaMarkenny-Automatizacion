import { useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  Circle,
  ClipboardList,
  Droplets,
  Layers,
  PackageCheck,
  Ruler,
  Scissors,
  Search,
  Truck,
  UserRound,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { NotasOrdenCard } from "./NotasOrdenCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  cn,
  formatCurrency,
  formatDate,
  formatNumber,
  initials,
} from "@/lib/utils";
import {
  CATEGORIA_TRABAJO_LABEL,
  FASES_PLANTA,
  FASE_PLANTA,
  PRIORIDAD_LABEL,
  ROL_LABEL,
  TIPO_GRAN_FORMATO_LABEL,
  resumenEspecificaciones,
  SIN_MAQUINA,
  TECNOLOGIA_LABEL,
  type FasePlanta,
  type OrdenTrabajo,
} from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";
import { useEventosProduccion } from "@/shared/api/tiempoReal";
import { useOrdenesTrabajo } from "../hooks/useOrdenesTrabajo";

function fechaHora(fecha: string) {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

/* ------------------------------------------------------------------ */
/* Stepper de las 4 fases                                              */
/* ------------------------------------------------------------------ */

function Stepper({ fase }: { fase: FasePlanta }) {
  const actual = FASES_PLANTA.indexOf(fase);

  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {FASES_PLANTA.map((item, index) => {
        const completada = index < actual;
        const activa = index === actual;
        return (
          <li
            key={item}
            className={cn(
              "rounded-lg border px-3 py-2.5",
              activa
                ? "border-primary bg-primary/[0.06]"
                : completada
                  ? "border-border bg-muted/40"
                  : "border-dashed border-border bg-background",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                  activa
                    ? "bg-primary text-primary-foreground"
                    : completada
                      ? "bg-markenny-ink text-white dark:bg-white dark:text-markenny-ink"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {completada ? (
                  <Check className="h-3 w-3" />
                ) : activa ? (
                  String(index + 1).padStart(2, "0")
                ) : (
                  <Circle className="h-2 w-2" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-[11px] font-semibold uppercase tracking-wide",
                    activa ? "text-primary" : completada ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {FASE_PLANTA[item].label}
                </p>
                <p className="truncate text-[9.5px] text-muted-foreground">
                  {activa ? "En curso" : completada ? "Completada" : "Pendiente"}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Ficha de la orden                                                   */
/* ------------------------------------------------------------------ */

function DatosOrden({ orden }: { orden: OrdenTrabajo }) {
  const spec = orden.especificaciones ?? {};
  const esPapeleria = orden.categoriaTrabajo === "PAPELERIA";
  const esGranFormato = orden.categoriaTrabajo === "GRAN_FORMATO";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Cliente",
            valor: orden.clienteNombre,
            icon: UserRound,
          },
          {
            label: "Cantidad",
            valor: `${formatNumber(orden.cantidad)} unidades`,
            icon: ClipboardList,
          },
          {
            label: "Entrega",
            valor: formatDate(orden.fechaEntrega),
            icon: CalendarClock,
          },
          {
            label: "Máquina",
            valor: orden.maquina ?? SIN_MAQUINA,
            icon: Layers,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-card px-3.5 py-3"
          >
            <p className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-wide text-muted-foreground">
              <item.icon className="h-3 w-3" />
              {item.label}
            </p>
            <p className="mt-1 truncate text-[12px] font-medium">{item.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="section-label">Ficha técnica</p>
          <dl className="mt-2 space-y-1.5 text-[11.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Familia</dt>
              <dd className="font-medium">
                {CATEGORIA_TRABAJO_LABEL[orden.categoriaTrabajo ?? "GENERAL"]}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Tecnología</dt>
              <dd className="font-medium">{TECNOLOGIA_LABEL[orden.tecnologia]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Sustrato</dt>
              <dd className="max-w-[60%] truncate text-right font-medium">
                {orden.sustrato}
              </dd>
            </div>
            {orden.materialId && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Descontado del almacén</dt>
                <dd className="text-right font-medium tabular-nums">
                  {orden.consumoSustrato === null
                    ? "No (material sin rendimiento)"
                    : orden.consumoSustrato.toLocaleString("es-VE", { maximumFractionDigits: 3 })}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Prioridad</dt>
              <dd className="font-medium">{PRIORIDAD_LABEL[orden.prioridad]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Monto</dt>
              <dd className="font-semibold tabular-nums">
                {formatCurrency(orden.montoTotal)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="section-label">
            {esPapeleria ? "Papelería" : esGranFormato ? "Gran formato" : "Producción"}
          </p>
          <dl className="mt-2 space-y-1.5 text-[11.5px]">
            {esPapeleria &&
              resumenEspecificaciones(spec).map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{etiqueta}</dt>
                  <dd className="max-w-[60%] text-right font-medium">{valor}</dd>
                </div>
              ))}

            {esGranFormato && (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <Layers className="h-3 w-3" /> Pieza
                  </dt>
                  <dd className="font-medium">
                    {spec.tipoGranFormato
                      ? TIPO_GRAN_FORMATO_LABEL[spec.tipoGranFormato]
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <Ruler className="h-3 w-3" /> Medidas
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {spec.ancho && spec.alto
                      ? `${spec.ancho} × ${spec.alto} ${spec.unidadDimension ?? "m"}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <Ruler className="h-3 w-3" /> Resolución
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {spec.resolucionDpi ? `${spec.resolucionDpi} dpi` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <Layers className="h-3 w-3" /> Sustrato
                  </dt>
                  <dd className="max-w-[60%] truncate text-right font-medium">
                    {orden.sustrato}
                  </dd>
                </div>
              </>
            )}

            {!esPapeleria && !esGranFormato && (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Operador</dt>
                  <dd className="font-medium">{orden.operador}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Avance</dt>
                  <dd className="font-medium tabular-nums">{orden.avance}%</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="flex items-center gap-1.5 section-label">
            <Droplets className="h-3 w-3" /> Tintas
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {orden.tintas.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">Sin tintas registradas</span>
            ) : (
              orden.tintas.map((tinta) => (
                <span
                  key={tinta}
                  className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tinta}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="flex items-center gap-1.5 section-label">
            <Scissors className="h-3 w-3" /> Acabados
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {orden.acabados.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">Sin acabados</span>
            ) : (
              orden.acabados.map((acabado) => (
                <span
                  key={acabado}
                  className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {acabado}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {(orden.descripcion || spec.observaciones) && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
          <p className="section-label">Observaciones para planta</p>
          {/* Descripción y observaciones son campos distintos: antes, si había
              descripción, las observaciones del vendedor no llegaban a verse. */}
          {[orden.descripcion, spec.observaciones]
            .filter((texto): texto is string => Boolean(texto?.trim()))
            .map((texto, indice) => (
              <p key={indice} className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                {texto}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function SeguimientoPage() {
  const { data: ordenes = [], isLoading } = useOrdenesTrabajo();
  // Los avances de planta llegan en vivo (SSE); el refresco periódico queda de respaldo.
  useEventosProduccion();
  const [params, setParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState("");

  const codigo = params.get("ot");
  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return ordenes;
    return ordenes.filter(
      (orden) =>
        orden.codigo.toLowerCase().includes(termino) ||
        orden.producto.toLowerCase().includes(termino) ||
        orden.clienteNombre.toLowerCase().includes(termino),
    );
  }, [ordenes, busqueda]);

  const seleccionada =
    ordenes.find((orden) => orden.codigo === codigo) ?? ordenes[0] ?? null;

  const historial = useMemo(
    () =>
      [...(seleccionada?.historial ?? [])].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
      ),
    [seleccionada],
  );

  const seleccionar = (orden: OrdenTrabajo) => {
    setParams({ ot: orden.codigo }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ventas · Seguimiento"
        title="Estado de producción"
        description="Consulta en tiempo real en qué fase está cada trabajo y el historial auditable de cambios."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="flex max-h-[720px] flex-col overflow-hidden">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar OT, cliente o producto..."
                className="pl-9"
                aria-label="Buscar orden de trabajo"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="space-y-2 border-b border-border/60 px-4 py-3">
                  <div className="h-2.5 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                </div>
              ))
            ) : filtradas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-medium">Sin órdenes</p>
                <p className="text-[11px] text-muted-foreground">
                  Ajusta la búsqueda o crea una nueva orden.
                </p>
              </div>
            ) : (
              filtradas.map((orden) => {
                const activa = seleccionada?.id === orden.id;
                return (
                  <button
                    key={orden.id}
                    type="button"
                    onClick={() => seleccionar(orden)}
                    aria-pressed={activa}
                    className={cn(
                      "w-full border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0",
                      activa ? "bg-primary/[0.05]" : "hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "font-mono text-[10px] font-semibold",
                          activa ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {orden.codigo}
                      </span>
                      <Badge variant={FASE_UI[orden.fase].badge} className="scale-90">
                        {FASE_UI[orden.fase].label}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[12px] font-medium">
                      {orden.producto}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {orden.clienteNombre}
                    </p>
                    <Progress
                      value={((FASES_PLANTA.indexOf(orden.fase) + 1) / 4) * 100}
                      className="mt-2 h-0.5"
                    />
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {!seleccionada ? (
          <Card className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <PackageCheck className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">No hay órdenes para mostrar</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Cuando el vendedor cree una orden de trabajo aparecerá aquí con su avance
              en las cuatro fases obligatorias.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-xl bg-markenny-ink text-white shadow-raised">
              <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-primary">
                      {seleccionada.codigo}
                    </span>
                    <Badge variant={FASE_UI[seleccionada.fase].badge} className="scale-90">
                      {FASE_UI[seleccionada.fase].label}
                    </Badge>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] uppercase tracking-widest text-white/50">
                      {CATEGORIA_TRABAJO_LABEL[seleccionada.categoriaTrabajo ?? "GENERAL"]}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-semibold uppercase leading-tight tracking-wide">
                    {seleccionada.producto}
                  </h2>
                  <p className="mt-1 text-xs text-white/55">
                    {seleccionada.clienteNombre} · creada{" "}
                    {formatDate(seleccionada.fechaCreacion, {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">
                    Monto de la orden
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                    {formatCurrency(seleccionada.montoTotal)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] text-white/45 sm:justify-end">
                    <Truck className="h-3 w-3" />
                    Entrega {formatDate(seleccionada.fechaEntrega)}
                  </p>
                </div>
              </div>

              {(seleccionada.fase === "FINALIZADO" || seleccionada.fase === "EMPAQUETADO") && (
                <div className="flex items-center gap-2 border-t border-white/10 bg-primary/15 px-5 py-2.5 text-[11px] font-medium text-white">
                  <PackageCheck className="h-3.5 w-3.5 text-primary" />
                  Pedido{" "}
                  {seleccionada.fase === "EMPAQUETADO"
                    ? "empaquetado y listo para entrega"
                    : "finalizado, en espera de empaque"}
                  . El vendedor ya recibió la notificación.
                </div>
              )}
            </section>

            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="section-label">Avance por fases</p>
                <span className="text-[10px] text-muted-foreground">
                  {FASE_PLANTA[seleccionada.fase].description}
                </span>
              </div>
              <Stepper fase={seleccionada.fase} />
            </Card>

            <DatosOrden orden={seleccionada} />

            <NotasOrdenCard orden={seleccionada} />

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="section-label">Historial auditable</p>
                <Badge variant="muted">{historial.length} evento(s)</Badge>
              </div>
              {historial.length === 0 ? (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  La orden aún no registra cambios de fase. El taller los verá aquí con
                  usuario, rol y fecha.
                </p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {historial.map((evento) => (
                    <li key={evento.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                            evento.fase === seleccionada.fase
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="mt-1 w-px flex-1 bg-border" />
                      </div>
                      <div className="min-w-0 flex-1 pb-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[12px] font-semibold">
                            {FASE_PLANTA[evento.fase].label}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {fechaHora(evento.fecha)}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <span className="grid h-4 w-4 place-items-center rounded-full bg-markenny-ink text-[7px] font-semibold text-white dark:bg-white dark:text-markenny-ink">
                            {initials(evento.usuario)}
                          </span>
                          {evento.usuario} · {ROL_LABEL[evento.rol]}
                        </p>
                        {evento.nota && (
                          <p className="mt-1 rounded-md bg-muted/60 px-2 py-1.5 text-[10.5px] leading-snug text-muted-foreground">
                            {evento.nota}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
