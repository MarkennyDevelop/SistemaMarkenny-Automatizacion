import { useWatch } from "react-hook-form";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Loader2,
  Ruler,
  Scissors,
  Send,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { FormField, FormGrid, FormSection, ToggleCard } from "@/components/forms/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { ACABADOS, SUSTRATOS } from "@/shared/catalogos";
import {
  TIPO_GRAN_FORMATO_LABEL,
  type TipoGranFormato,
} from "@/shared/domain";
import { estimarMontoOrden } from "../../lib/cotizador";
import { useGranFormatoForm } from "./context";

/** Sustratos admitidos en gran formato y adhesivos. */
const SUSTRATOS_GRAN = SUSTRATOS.filter((sustrato) =>
  ["adhesivo-80", "vinilo-blanco", "lona-front"].includes(sustrato.id),
);

const TIPOS: TipoGranFormato[] = ["PENDON", "STICKER", "VINIL", "LONA", "BACKING", "ROTULO"];

const MAQUINAS_GRAN = ["Mimaki JV300", "Konica Minolta C4080"];

const ACABADOS_GRAN = ACABADOS.filter((acabado) =>
  [
    "ojales",
    "refuerzo",
    "laminado-brillante",
    "laminado-mate",
    "doble-cara",
    "troquelado",
    "media-luna",
    "plastificado",
  ].includes(acabado.id),
);

/** Convierte la medida capturada a milímetros para el motor de costos. */
export function aMilimetros(valor: number, unidad: "cm" | "m") {
  return unidad === "m" ? valor * 1000 : valor * 10;
}

/* ------------------------------------------------------------------ */
/* 01 · Pieza                                                          */
/* ------------------------------------------------------------------ */

export function PiezaSection() {
  const { form, clientes } = useGranFormatoForm();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const clienteId = watch("clienteId");
  const tipo = watch("tipoGranFormato");

  return (
    <FormSection
      index="01"
      title="Cliente y pieza"
      description="Pendones, stickers, vinilos y lonas de gran formato"
      icon={UserRound}
    >
      <div className="space-y-5">
        <FormGrid>
          <FormField
            label="Cliente"
            htmlFor="clienteId"
            required
            error={errors.clienteId?.message}
            hint={`${clientes.length} clientes activos`}
          >
            <Select
              value={clienteId}
              onValueChange={(value) =>
                setValue("clienteId", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="clienteId" aria-label="Cliente">
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Nombre de la pieza"
            htmlFor="producto"
            required
            error={errors.producto?.message}
          >
            <Input
              id="producto"
              placeholder="Pendón promocional 1 × 2 m"
              {...register("producto")}
            />
          </FormField>
        </FormGrid>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Tipo de gran formato</span>
            {errors.tipoGranFormato && (
              <span className="text-[11px] text-destructive">
                {errors.tipoGranFormato.message}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {TIPOS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setValue("tipoGranFormato", item, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                aria-pressed={tipo === item}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  tipo === item
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:border-foreground/25",
                )}
              >
                {TIPO_GRAN_FORMATO_LABEL[item]}
              </button>
            ))}
          </div>
        </div>

        <FormField
          label="Descripción del arte"
          htmlFor="descripcion"
          error={errors.descripcion?.message}
          hint="Opcional · máx. 280 caracteres"
        >
          <Textarea
            id="descripcion"
            rows={2}
            placeholder="Ubicación de la pieza, colores de marca, referencias de instalación..."
            {...register("descripcion")}
          />
        </FormField>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · Dimensiones y producción                                       */
/* ------------------------------------------------------------------ */

export function DimensionesSection() {
  const { form } = useGranFormatoForm();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const unidad = watch("unidadDimension");
  const ancho = Number(watch("ancho")) || 0;
  const alto = Number(watch("alto")) || 0;
  const cantidad = Number(watch("cantidad")) || 0;
  const prioridad = watch("prioridad");
  const maquina = watch("maquina");

  const anchoMm = aMilimetros(ancho, unidad);
  const altoMm = aMilimetros(alto, unidad);
  const m2 = (anchoMm / 1000) * (altoMm / 1000) * Math.max(cantidad, 0);

  return (
    <FormSection
      index="02"
      title="Dimensiones y salida"
      description="Medidas en metros o centímetros, resolución y máquina"
      icon={Ruler}
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Unidad de medida</span>
            <span className="text-[10px] text-muted-foreground">
              Se convierte a milímetros para cotizar
            </span>
          </div>
          <div className="grid max-w-[280px] grid-cols-2 gap-2">
            {(["m", "cm"] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() =>
                  setValue("unidadDimension", valor, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                aria-pressed={unidad === valor}
                className={cn(
                  "rounded-lg border px-3 py-2 text-center text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  unidad === valor
                    ? "border-markenny-ink bg-markenny-ink text-white dark:border-white dark:bg-white dark:text-markenny-ink"
                    : "border-border bg-background hover:border-foreground/25",
                )}
              >
                {valor === "m" ? "Metros (m)" : "Centímetros (cm)"}
              </button>
            ))}
          </div>
        </div>

        <FormGrid className="sm:grid-cols-2 xl:grid-cols-4">
          <FormField
            label="Ancho"
            htmlFor="ancho"
            required
            error={errors.ancho?.message}
            hint={unidad}
          >
            <Input
              id="ancho"
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.1}
              {...register("ancho", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Alto"
            htmlFor="alto"
            required
            error={errors.alto?.message}
            hint={unidad}
          >
            <Input
              id="alto"
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.1}
              {...register("alto", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Cantidad"
            htmlFor="cantidad"
            required
            error={errors.cantidad?.message}
            hint="piezas"
          >
            <Input
              id="cantidad"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              {...register("cantidad", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Resolución"
            htmlFor="resolucionDpi"
            required
            error={errors.resolucionDpi?.message}
            hint="dpi"
          >
            <Input
              id="resolucionDpi"
              type="number"
              inputMode="numeric"
              min={72}
              max={1440}
              step={1}
              {...register("resolucionDpi", { valueAsNumber: true })}
            />
          </FormField>
        </FormGrid>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3.5 py-2.5">
          <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              {ancho} × {alto} {unidad}
            </span>{" "}
            = {formatNumber(Math.round(anchoMm))} × {formatNumber(Math.round(altoMm))} mm ·{" "}
            <span className="font-medium text-foreground tabular-nums">
              {m2 > 0 ? `${m2.toFixed(2)} m²` : "—"}
            </span>{" "}
            totales de impresión.
          </p>
        </div>

        <FormGrid className="sm:grid-cols-2 xl:grid-cols-3">
          <FormField
            label="Máquina"
            htmlFor="maquina"
            required
            error={errors.maquina?.message}
          >
            <Select
              value={maquina}
              onValueChange={(value) =>
                setValue("maquina", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="maquina">
                <SelectValue placeholder="Selecciona la máquina" />
              </SelectTrigger>
              <SelectContent>
                {MAQUINAS_GRAN.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Prioridad"
            htmlFor="prioridad"
            error={errors.prioridad?.message}
          >
            <Select
              value={prioridad}
              onValueChange={(value) =>
                setValue(
                  "prioridad",
                  value as "BAJA" | "MEDIA" | "ALTA" | "URGENTE",
                  { shouldValidate: true, shouldDirty: true },
                )
              }
            >
              <SelectTrigger id="prioridad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BAJA">Baja</SelectItem>
                <SelectItem value="MEDIA">Media</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Fecha de entrega"
            htmlFor="fechaEntrega"
            required
            error={errors.fechaEntrega?.message}
          >
            <div className="relative">
              <Input
                id="fechaEntrega"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                className="pr-9"
                {...register("fechaEntrega")}
              />
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </FormField>
        </FormGrid>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · Sustrato                                                       */
/* ------------------------------------------------------------------ */

export function SustratoSection() {
  const { form } = useGranFormatoForm();
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const sustratoId = watch("sustratoId");
  const seleccionado = SUSTRATOS_GRAN.find((item) => item.id === sustratoId);

  return (
    <FormSection
      index="03"
      title="Sustrato"
      description="Lona, vinil adhesivo o papel adhesivo para stickers"
      icon={Layers}
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SUSTRATOS_GRAN.map((sustrato) => (
            <ToggleCard
              key={sustrato.id}
              selected={sustratoId === sustrato.id}
              onToggle={() =>
                setValue("sustratoId", sustrato.id, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              title={sustrato.nombre}
              description={`${sustrato.gramaje} g/m²`}
              meta={`${formatCurrency(sustrato.precioHoja)} / pliego`}
            />
          ))}
        </div>
        {errors.sustratoId && (
          <p className="text-[11px] font-medium text-destructive" role="alert">
            {errors.sustratoId.message}
          </p>
        )}
        {seleccionado && (
          <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{seleccionado.nombre}</span> ·
              impresión sobre {seleccionado.gramaje} g/m². La reserva del rollo se
              descuenta del inventario de vinilos y lonas al aprobar la orden.
            </p>
          </div>
        )}
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · Acabados                                                       */
/* ------------------------------------------------------------------ */

export function AcabadosSection() {
  const { form } = useGranFormatoForm();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const acabados = watch("acabados") ?? [];

  const toggleAcabado = (id: string) => {
    const next = acabados.includes(id)
      ? acabados.filter((item) => item !== id)
      : [...acabados, id];
    setValue("acabados", next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <FormSection
      index="04"
      title="Acabados y observaciones"
      description="Ojales, refuerzos, laminado y corte de adhesivos"
      icon={Scissors}
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Procesos de acabado</span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {acabados.length} de {ACABADOS_GRAN.length} seleccionados
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ACABADOS_GRAN.map((acabado) => (
              <ToggleCard
                key={acabado.id}
                selected={acabados.includes(acabado.id)}
                onToggle={() => toggleAcabado(acabado.id)}
                title={acabado.nombre}
                meta={`+${formatCurrency(acabado.precio)} / unidad`}
              />
            ))}
          </div>
        </div>

        <FormField
          label="Observaciones para planta"
          htmlFor="observaciones"
          error={errors.observaciones?.message}
          hint="Opcional · máx. 500 caracteres"
        >
          <Textarea
            id="observaciones"
            rows={3}
            placeholder="Sentido de la trama, ubicación de ojales, pruebas de adhesión..."
            {...register("observaciones")}
          />
        </FormField>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen sticky                                                      */
/* ------------------------------------------------------------------ */

export function ResumenSection() {
  const { form, clientes } = useGranFormatoForm();
  const valores = useWatch({ control: form.control });

  const cliente = clientes.find((item) => item.id === valores.clienteId);
  const cantidad = Number(valores.cantidad) || 0;
  const ancho = Number(valores.ancho) || 0;
  const alto = Number(valores.alto) || 0;
  const unidad = valores.unidadDimension ?? "m";
  const acabados = valores.acabados ?? [];
  const sustrato = SUSTRATOS_GRAN.find((item) => item.id === valores.sustratoId);

  const anchoMm = aMilimetros(ancho, unidad);
  const altoMm = aMilimetros(alto, unidad);
  const m2 = (anchoMm / 1000) * (altoMm / 1000) * Math.max(cantidad, 0);

  let resultado: ReturnType<typeof estimarMontoOrden> | null = null;
  if (cantidad >= 1 && anchoMm >= 100 && altoMm >= 100 && valores.sustratoId) {
    resultado = estimarMontoOrden({
      tecnologia: "GRAN_FORMATO",
      cantidad,
      anchoMm,
      altoMm,
      tintasTiro: 4,
      tintasRetiro: 0,
      sustratoId: valores.sustratoId,
      acabados,
    });
  }

  const completados = [
    Boolean(valores.clienteId),
    Boolean(valores.producto?.trim()),
    Boolean(valores.fechaEntrega),
    ancho > 0 && alto > 0,
    Boolean(valores.sustratoId) && Number(valores.resolucionDpi) >= 72,
  ].filter(Boolean).length;

  return (
    <aside className="overflow-hidden rounded-xl bg-markenny-ink text-white shadow-raised">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Ficha de gran formato
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Borrador
          </span>
        </div>
        <p className="mt-2 font-display text-xl font-semibold uppercase leading-tight tracking-wide">
          {valores.producto?.trim() || "Nueva pieza de gran formato"}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
          <Building2 className="h-3 w-3" />
          {cliente?.nombre ?? "Cliente sin seleccionar"}
        </p>
      </div>

      <div className="space-y-3 px-5 py-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Pieza</span>
          <span className="text-right font-medium">
            {valores.tipoGranFormato
              ? TIPO_GRAN_FORMATO_LABEL[valores.tipoGranFormato]
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Medidas</span>
          <span className="font-medium tabular-nums">
            {ancho && alto ? `${ancho} × ${alto} ${unidad}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Superficie</span>
          <span className="font-medium tabular-nums">
            {m2 > 0 ? `${m2.toFixed(2)} m²` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Cantidad</span>
          <span className="font-medium tabular-nums">
            {cantidad ? `${formatNumber(cantidad)} pieza(s)` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Sustrato</span>
          <span className="max-w-[60%] truncate text-right font-medium">
            {sustrato?.nombre ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Resolución</span>
          <span className="font-medium tabular-nums">
            {Number(valores.resolucionDpi) || 0} dpi
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Acabados</span>
          <span className="font-medium tabular-nums">
            {acabados.length > 0 ? `${acabados.length} proceso(s)` : "Sin acabados"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Entrega</span>
          <span className="font-medium">
            {valores.fechaEntrega ? formatDate(valores.fechaEntrega) : "—"}
          </span>
        </div>
      </div>

      <div className="mx-5 h-px bg-white/10" />

      <div className="px-5 py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Total estimado
            </p>
            <p className="mt-1 font-display text-3xl font-semibold leading-none tabular-nums">
              {resultado ? formatCurrency(resultado.total) : "—"}
            </p>
          </div>
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
          <span>USD · no incluye IVA</span>
          <span>
            {resultado ? `${formatCurrency(resultado.costoUnitario)} / u.` : "Margen 35%"}
          </span>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-3.5">
        <div className="flex items-center justify-between text-[10px] text-white/45">
          <span>Preparación de la ficha</span>
          <span className="font-semibold text-white/75">{completados}/5</span>
        </div>
        <Progress
          value={(completados / 5) * 100}
          className="mt-2 bg-white/10"
          indicatorClassName="bg-primary"
        />
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */

export function Acciones() {
  const { form, isSubmitting, onCancel } = useGranFormatoForm();
  const { errors, isSubmitting: formSubmitting } = form.formState;
  const errores = Object.keys(errors).length;
  const enviando = isSubmitting || formSubmitting;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {enviando ? "Enviando a taller..." : "Enviar orden a producción"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onCancel}
        disabled={enviando}
      >
        Cancelar
      </Button>
      {errores > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Revisa {errores} campo(s) obligatorio(s) antes de enviar la orden.
        </p>
      )}
      <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
        La pieza entra a <span className="font-medium text-foreground">En Proceso</span> y
        se reserva el rollo de lona o vinil en almacén.
      </p>
    </div>
  );
}
