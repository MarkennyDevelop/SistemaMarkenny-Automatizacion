import { useEffect, useState } from "react";
import {
  Check,
  ClipboardCheck,
  MessageSquareWarning,
  RotateCcw,
  Loader2,
  PackageCheck,
  Play,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  CATEGORIA_TRABAJO_LABEL,
  FASES_PLANTA,
  FASE_PLANTA,
  PRIORIDAD_LABEL,
  ROL_LABEL,
  TIPO_GRAN_FORMATO_LABEL,
  resumenEspecificaciones,
  TECNOLOGIA_LABEL,
  type FasePlanta,
  type OrdenTrabajo,
  SIN_MAQUINA,
} from "@/shared/domain";
import { FASE_UI } from "@/shared/fase-ui";
import { esRetrabajo } from "@markenny/contrato/dominio";
import { siguienteFaseDe } from "./OrdenCard";

interface OrdenDetalleDialogProps {
  orden: OrdenTrabajo | null;
  onOpenChange: (abierto: boolean) => void;
  onAvanzar: (orden: OrdenTrabajo, nota?: string) => void;
  /** Devuelve la orden a En Proceso (retrabajo). El motivo es obligatorio. */
  onRetrabajo: (orden: OrdenTrabajo, motivo: string) => void;
  isPending?: boolean;
}

function hora(fecha: string) {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

const ICONO_FASE: Record<FasePlanta, typeof Play> = {
  EN_PROCESO: Play,
  EN_REVISION: ShieldCheck,
  FINALIZADO: ClipboardCheck,
  EMPAQUETADO: PackageCheck,
};

/**
 * Ficha de taller con la trazabilidad completa de la OT.
 * El operario ejecuta la transición siguiente o, desde En Revisión o
 * Finalizado, devuelve la orden a En Proceso para retrabajo con motivo.
 */
export function OrdenDetalleDialog({
  orden,
  onOpenChange,
  onAvanzar,
  onRetrabajo,
  isPending,
}: OrdenDetalleDialogProps) {
  const [nota, setNota] = useState("");

  useEffect(() => {
    setNota("");
  }, [orden?.id]);

  if (!orden) return null;

  const actual = FASES_PLANTA.indexOf(orden.fase);
  const siguiente = siguienteFaseDe(orden.fase);
  const spec = orden.especificaciones ?? {};
  const historial = [...(orden.historial ?? [])].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );

  const admiteRetrabajo = esRetrabajo(orden.fase, "EN_PROCESO");
  const motivoValido = nota.trim().length >= 3;
  const notas = orden.notas ?? [];
  const solicitudes = notas.filter((item) => item.solicitaRetrabajo).length;

  const enviar = () => {
    if (!siguiente) return;
    onAvanzar(orden, nota.trim() || undefined);
    setNota("");
  };

  const devolver = () => {
    if (!motivoValido) return;
    onRetrabajo(orden, nota.trim());
    setNota("");
  };

  return (
    <Dialog open={Boolean(orden)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-primary">
              {orden.codigo}
            </span>
            <Badge variant={FASE_UI[orden.fase].badge}>
              {FASE_UI[orden.fase].label}
            </Badge>
            <span className="rounded-full border border-border px-2 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
              {CATEGORIA_TRABAJO_LABEL[orden.categoriaTrabajo ?? "GENERAL"]}
            </span>
          </div>
          <DialogTitle className="mt-1.5 font-display text-2xl uppercase leading-tight tracking-wide">
            {orden.producto}
          </DialogTitle>
          <DialogDescription>
            {orden.clienteNombre} · {formatNumber(orden.cantidad)} unidades ·{" "}
            {formatCurrency(orden.montoTotal)} · entrega {formatDate(orden.fechaEntrega)}
          </DialogDescription>
        </DialogHeader>

        {/* Ruta de calidad */}
        <div className="grid gap-2 sm:grid-cols-4">
          {FASES_PLANTA.map((fase, index) => {
            const completada = index < actual;
            const activa = index === actual;
            const Icono = ICONO_FASE[fase];
            return (
              <div
                key={fase}
                className={cn(
                  "rounded-lg border px-3 py-2.5",
                  activa
                    ? "border-primary bg-primary/[0.06]"
                    : completada
                      ? "border-border bg-muted/40"
                      : "border-dashed border-border",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                      activa
                        ? "bg-primary text-primary-foreground"
                        : completada
                          ? "bg-markenny-ink text-white dark:bg-white dark:text-markenny-ink"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {completada ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Icono className="h-3 w-3" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-[10.5px] font-semibold uppercase tracking-wide",
                        activa
                          ? "text-primary"
                          : completada
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {FASE_PLANTA[fase].short}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {activa ? "En curso" : completada ? "Completada" : "Pendiente"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Datos técnicos */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border px-3.5 py-3">
            <p className="section-label">Especificaciones</p>
            <dl className="mt-2 space-y-1.5 text-[11.5px]">
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
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Máquina</dt>
                <dd className="max-w-[60%] truncate text-right font-medium">
                  {orden.maquina ?? SIN_MAQUINA}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Prioridad</dt>
                <dd className="font-medium">{PRIORIDAD_LABEL[orden.prioridad]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tintas</dt>
                <dd className="max-w-[60%] truncate text-right font-medium">
                  {orden.tintas.join(", ") || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Acabados</dt>
                <dd className="max-w-[60%] truncate text-right font-medium">
                  {orden.acabados.join(", ") || "—"}
                </dd>
              </div>
              {orden.categoriaTrabajo === "PAPELERIA" &&
                resumenEspecificaciones(spec).map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{etiqueta}</dt>
                    <dd className="max-w-[60%] text-right font-medium">{valor}</dd>
                  </div>
                ))}
              {orden.categoriaTrabajo === "GRAN_FORMATO" && (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Pieza</dt>
                    <dd className="font-medium">
                      {spec.tipoGranFormato
                        ? TIPO_GRAN_FORMATO_LABEL[spec.tipoGranFormato]
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Medidas</dt>
                    <dd className="font-medium tabular-nums">
                      {spec.ancho && spec.alto
                        ? `${spec.ancho} × ${spec.alto} ${spec.unidadDimension ?? "m"}`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Resolución</dt>
                    <dd className="font-medium tabular-nums">
                      {spec.resolucionDpi ? `${spec.resolucionDpi} dpi` : "—"}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          <div className="rounded-lg border border-border px-3.5 py-3">
            <p className="section-label">Trazabilidad</p>
            {historial.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Sin eventos registrados todavía.
              </p>
            ) : (
              <ol className="mt-2 max-h-[210px] space-y-2.5 overflow-y-auto pr-1">
                {historial.map((evento) => (
                  <li key={evento.id} className="flex gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                        evento.fase === orden.fase
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold leading-tight">
                        {FASE_PLANTA[evento.fase].label}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground">
                        {hora(evento.fecha)} · {evento.usuario} ·{" "}
                        {ROL_LABEL[evento.rol]}
                      </p>
                      {evento.nota && (
                        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground/90">
                          {evento.nota}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {(orden.descripcion || spec.observaciones) && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3.5 py-2.5">
            <p className="section-label">Observaciones para planta</p>
            {/* Descripción y observaciones son campos distintos: antes, si había
                descripción, las observaciones del vendedor no llegaban a verse. */}
            {[orden.descripcion, spec.observaciones]
              .filter((texto): texto is string => Boolean(texto?.trim()))
              .map((texto, indice) => (
                <p key={indice} className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {texto}
                </p>
              ))}
          </div>
        )}

        {notas.length > 0 && (
          <div className="rounded-lg border border-border px-3.5 py-3">
            <p className="section-label flex items-center gap-1.5">
              <MessageSquareWarning className="h-3.5 w-3.5 text-primary" />
              Observaciones de la orden
              {solicitudes > 0 && (
                <Badge variant="solid" className="ml-1">
                  {solicitudes} solicitud(es) de revisión
                </Badge>
              )}
            </p>
            <ul className="mt-2 max-h-[160px] space-y-2 overflow-y-auto pr-1">
              {notas.map((item) => (
                <li key={item.id} className="text-[11px] leading-relaxed">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{item.usuario}</span> ·{" "}
                    {ROL_LABEL[item.rol]} · {hora(item.fecha)}
                    {item.solicitaRetrabajo && (
                      <span className="ml-1.5 font-semibold text-primary">Pide revisión</span>
                    )}
                  </p>
                  <p>{item.mensaje}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {siguiente ? (
          <div className="space-y-2">
            <label
              htmlFor="nota-calidad"
              className="text-[11px] font-medium text-foreground"
            >
              Nota de control de calidad{" "}
              <span className="font-normal text-muted-foreground">
                {admiteRetrabajo
                  ? "(opcional para avanzar · obligatoria para devolver a En Proceso)"
                  : "(opcional)"}
              </span>
            </label>
            <Textarea
              id="nota-calidad"
              rows={2}
              value={nota}
              onChange={(event) => setNota(event.target.value)}
              placeholder="Registra la verificación de color, conteo, mermas o incidencias..."
            />
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.05] px-3.5 py-2.5">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">
                Circuito de calidad completado.
              </span>{" "}
              El pedido está empaquetado y el vendedor recibió la notificación para
              coordinar la entrega al cliente.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {admiteRetrabajo && (
            <Button
              variant="outline"
              onClick={devolver}
              disabled={isPending || !motivoValido}
              title={motivoValido ? undefined : "Escribe el motivo del retrabajo (mínimo 3 caracteres)"}
            >
              <RotateCcw className="h-4 w-4" />
              Devolver a En Proceso
            </Button>
          )}
          {siguiente && (
            <Button onClick={enviar} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Marcar como {FASE_PLANTA[siguiente].label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
