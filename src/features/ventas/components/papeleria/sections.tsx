import { useWatch } from "react-hook-form";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Hash,
  Layers,
  Loader2,
  Palette,
  Ruler,
  Scissors,
  Send,
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
import { ACABADOS, MAQUINAS, SUSTRATOS, TINTAS_PANTONE } from "@/shared/catalogos";
import {
  TIPO_PAPELERIA_LABEL,
  type Tecnologia,
  type TipoPapeleria,
} from "@/shared/domain";
import { estimarMontoOrden } from "../../lib/cotizador";
import { usePapeleriaForm } from "./context";

/** Solo las máquinas de pliego: el gran formato vive en su propio flujo. */
const MAQUINAS_PAPELERIA = MAQUINAS.filter((maquina) => maquina !== "Mimaki JV300");

/** Papeles de papelería corporativa (sin lona ni vinil). */
const PAPELES = SUSTRATOS.filter(
  (sustrato) => sustrato.id !== "lona-front" && sustrato.id !== "vinilo-blanco",
);

const TIPOS: TipoPapeleria[] = [
  "FACTURA",
  "TALONARIO",
  "RECIPE",
  "NOTA",
  "ORDEN_COMPRA",
  "RECIBO",
  "CARTA",
];

const TECNOLOGIAS: { value: Extract<Tecnologia, "OFFSET" | "DIGITAL">; label: string; hint: string }[] = [
  { value: "OFFSET", label: "Offset", hint: "Tirajes altos" },
  { value: "DIGITAL", label: "Digital", hint: "Cortos y pruebas" },
];

/* ------------------------------------------------------------------ */
/* 01 · Cliente y documento                                            */
/* ------------------------------------------------------------------ */

export function ClienteDocumentoSection() {
  const { form, clientes } = usePapeleriaForm();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const clienteId = watch("clienteId");
  const tipoPapeleria = watch("tipoPapeleria");

  return (
    <FormSection
      index="01"
      title="Cliente y documento"
      description="Formato físico de Markenny: facturas, talonarios, récipes y notas"
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
            label="Nombre del trabajo"
            htmlFor="producto"
            required
            error={errors.producto?.message}
            hint="Visible en planta"
          >
            <Input
              id="producto"
              placeholder="Facturas numeradas 2 partes"
              {...register("producto")}
            />
          </FormField>
        </FormGrid>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Tipo de trabajo</span>
            {errors.tipoPapeleria && (
              <span className="text-[11px] text-destructive">
                {errors.tipoPapeleria.message}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {TIPOS.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() =>
                  setValue("tipoPapeleria", tipo, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                aria-pressed={tipoPapeleria === tipo}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  tipoPapeleria === tipo
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:border-foreground/25",
                )}
              >
                {TIPO_PAPELERIA_LABEL[tipo]}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setValue("tipoPapeleria", "OTRO", {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              aria-pressed={tipoPapeleria === "OTRO"}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                tipoPapeleria === "OTRO"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background hover:border-foreground/25",
              )}
            >
              Otro documento
            </button>
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
            placeholder="Distribución de datos, logotipo, referencias del cliente..."
            {...register("descripcion")}
          />
        </FormField>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · Tiraje y especificaciones                                      */
/* ------------------------------------------------------------------ */

export function TirajeSection() {
  const { form } = usePapeleriaForm();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const tecnologia = watch("tecnologia");
  const prioridad = watch("prioridad");
  const maquina = watch("maquina");

  return (
    <FormSection
      index="02"
      title="Tiraje y formato"
      description="Cantidad, partes, medida final y ventana de entrega"
      icon={Ruler}
    >
      <div className="space-y-5">
        <FormGrid className="sm:grid-cols-2 xl:grid-cols-3">
          <FormField
            label="Cantidad"
            htmlFor="cantidad"
            required
            error={errors.cantidad?.message}
            hint="Juegos completos"
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
            label="Partes"
            htmlFor="partes"
            required
            error={errors.partes?.message}
            hint="Original + copias"
          >
            <Input
              id="partes"
              type="number"
              inputMode="numeric"
              min={1}
              max={6}
              step={1}
              {...register("partes", { valueAsNumber: true })}
            />
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Tecnología de impresión</span>
            {errors.tecnologia && (
              <span className="text-[11px] text-destructive">
                {errors.tecnologia.message}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 max-w-md">
            {TECNOLOGIAS.map((tec) => (
              <button
                key={tec.value}
                type="button"
                onClick={() =>
                  setValue("tecnologia", tec.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                aria-pressed={tecnologia === tec.value}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  tecnologia === tec.value
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:border-foreground/25",
                )}
              >
                <span className="block text-[13px] font-semibold">{tec.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-[10px] uppercase tracking-wide",
                    tecnologia === tec.value
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {tec.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <FormGrid className="sm:grid-cols-2 xl:grid-cols-3">
          <FormField
            label="Ancho final"
            htmlFor="anchoMm"
            required
            error={errors.anchoMm?.message}
            hint="milímetros"
          >
            <Input
              id="anchoMm"
              type="number"
              inputMode="decimal"
              min={40}
              step={1}
              {...register("anchoMm", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Alto final"
            htmlFor="altoMm"
            required
            error={errors.altoMm?.message}
            hint="milímetros"
          >
            <Input
              id="altoMm"
              type="number"
              inputMode="decimal"
              min={40}
              step={1}
              {...register("altoMm", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Máquina asignada"
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
                {MAQUINAS_PAPELERIA.map((item) => (
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
        </FormGrid>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · Numeración                                                     */
/* ------------------------------------------------------------------ */

export function NumeracionSection() {
  const { form } = usePapeleriaForm();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const usaNumeracion = watch("usaNumeracion");
  const desde = Number(watch("numeracionDesde")) || 0;
  const hasta = Number(watch("numeracionHasta")) || 0;
  const prefijo = watch("numeracionPrefijo") ?? "";

  return (
    <FormSection
      index="03"
      title="Numeración"
      description="Control consecutivo exigido por facturación y talonarios"
      icon={Hash}
    >
      <div className="space-y-5">
        <ToggleCard
          selected={Boolean(usaNumeracion)}
          onToggle={() =>
            setValue("usaNumeracion", !usaNumeracion, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          icon={Hash}
          title="Numerar los documentos"
          description="Cada juego recibe un consecutivo único e irrepetible."
          meta={
            usaNumeracion
              ? `${prefijo || "Sin prefijo"} · ${formatNumber(desde)} → ${formatNumber(hasta)}`
              : "Desactivado"
          }
        />

        <FormGrid className="sm:grid-cols-3">
          <FormField
            label="Desde"
            htmlFor="numeracionDesde"
            error={errors.numeracionDesde?.message}
          >
            <Input
              id="numeracionDesde"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              disabled={!usaNumeracion}
              {...register("numeracionDesde", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Hasta"
            htmlFor="numeracionHasta"
            error={errors.numeracionHasta?.message}
          >
            <Input
              id="numeracionHasta"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              disabled={!usaNumeracion}
              {...register("numeracionHasta", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Prefijo"
            htmlFor="numeracionPrefijo"
            error={errors.numeracionPrefijo?.message}
            hint="Opcional"
          >
            <Input
              id="numeracionPrefijo"
              placeholder="FAC-"
              maxLength={12}
              disabled={!usaNumeracion}
              {...register("numeracionPrefijo")}
            />
          </FormField>
        </FormGrid>

        <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {usaNumeracion
              ? `Se imprimirán ${formatNumber(Math.max(0, hasta - desde + 1))} números consecutivos. La numeración se valida contra el inventario de productos terminados antes de despachar.`
              : "La orden se imprimirá sin numeración. Si el documento lo exige, activa esta opción antes de enviar a producción."}
          </p>
        </div>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · Papel y gramaje                                                */
/* ------------------------------------------------------------------ */

export function PapelSection() {
  const { form } = usePapeleriaForm();
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const sustratoId = watch("sustratoId");
  const seleccionado = PAPELES.find((item) => item.id === sustratoId);

  return (
    <FormSection
      index="04"
      title="Papel y gramaje"
      description="Sustrato base, gramaje y consumo estimado"
      icon={Layers}
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {PAPELES.map((sustrato) => (
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
              <span className="font-medium text-foreground">{seleccionado.nombre}</span> ·{" "}
              {seleccionado.gramaje} g/m². El almacén reserva el papel al aprobar la
              orden y descuenta la merma de arranque de máquina.
            </p>
          </div>
        )}
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 05 · Tintas y Pantone                                               */
/* ------------------------------------------------------------------ */

export function TintasSection() {
  const { form } = usePapeleriaForm();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const pantones = watch("tintasPantone") ?? [];

  const togglePantone = (nombre: string) => {
    const next = pantones.includes(nombre)
      ? pantones.filter((item) => item !== nombre)
      : [...pantones, nombre];
    setValue("tintasPantone", next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <FormSection
      index="05"
      title="Tintas y Pantone"
      description="Colorimetría del tiro y formulaciones especiales"
      icon={Droplets}
    >
      <div className="space-y-5">
        <FormGrid className="max-w-md">
          <FormField
            label="Tintas de tiro"
            htmlFor="tintasTiro"
            error={errors.tintasTiro?.message}
            hint="0 – 6"
          >
            <Input
              id="tintasTiro"
              type="number"
              min={0}
              max={6}
              {...register("tintasTiro", { valueAsNumber: true })}
            />
          </FormField>
        </FormGrid>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-primary" />
            <span className="section-label">Formulaciones Pantone</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {pantones.length} seleccionadas
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {TINTAS_PANTONE.map((tinta) => (
              <ToggleCard
                key={tinta.id}
                selected={pantones.includes(tinta.nombre)}
                onToggle={() => togglePantone(tinta.nombre)}
                swatch={tinta.hex}
                title={tinta.nombre}
                meta={tinta.hex}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Las tintas directas se preparan en pre-prensa y se validan con prueba de
            color antes de correr el tiraje.
          </p>
        </div>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 06 · Acabados y observaciones                                       */
/* ------------------------------------------------------------------ */

export function AcabadosSection() {
  const { form } = usePapeleriaForm();
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
      index="06"
      title="Acabados y observaciones"
      description="Laminado, engomado, perforación y notas para planta"
      icon={Scissors}
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Procesos de acabado</span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {acabados.length} de {ACABADOS.length} seleccionados
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ACABADOS.map((acabado) => (
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
            placeholder="Orden de las partes, color de copias, instrucciones de engomado..."
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
  const { form, clientes } = usePapeleriaForm();
  const valores = useWatch({ control: form.control });

  const cliente = clientes.find((item) => item.id === valores.clienteId);
  const cantidad = Number(valores.cantidad) || 0;
  const partes = Number(valores.partes) || 0;
  const ancho = Number(valores.anchoMm) || 0;
  const alto = Number(valores.altoMm) || 0;
  const acabados = valores.acabados ?? [];
  const pantones = valores.tintasPantone ?? [];
  const sustrato = PAPELES.find((item) => item.id === valores.sustratoId);
  const usaNumeracion = Boolean(valores.usaNumeracion);

  let resultado: ReturnType<typeof estimarMontoOrden> | null = null;
  if (cantidad >= 1 && ancho >= 10 && alto >= 10 && valores.sustratoId) {
    resultado = estimarMontoOrden({
      tecnologia: valores.tecnologia ?? "OFFSET",
      cantidad,
      anchoMm: ancho,
      altoMm: alto,
      tintasTiro: Number(valores.tintasTiro) || 0,
      tintasRetiro: 0,
      sustratoId: valores.sustratoId,
      acabados,
    });
  }

  const completados = [
    Boolean(valores.clienteId),
    Boolean(valores.producto?.trim()),
    Boolean(valores.fechaEntrega),
    Boolean(valores.sustratoId) && ancho >= 40 && alto >= 40,
    acabados.length > 0 || pantones.length > 0 || (Number(valores.tintasTiro) || 0) > 0,
  ].filter(Boolean).length;

  return (
    <aside className="overflow-hidden rounded-xl bg-markenny-ink text-white shadow-raised">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Ficha de papelería
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Borrador
          </span>
        </div>
        <p className="mt-2 font-display text-xl font-semibold uppercase leading-tight tracking-wide">
          {valores.producto?.trim() || "Nuevo documento corporativo"}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
          <Building2 className="h-3 w-3" />
          {cliente?.nombre ?? "Cliente sin seleccionar"}
        </p>
      </div>

      <div className="space-y-3 px-5 py-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Documento</span>
          <span className="text-right font-medium">
            {valores.tipoPapeleria
              ? TIPO_PAPELERIA_LABEL[valores.tipoPapeleria]
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Tiraje</span>
          <span className="font-medium tabular-nums">
            {cantidad ? `${formatNumber(cantidad)} × ${partes} parte(s)` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Numeración</span>
          <span className="font-medium tabular-nums">
            {usaNumeracion
              ? `${valores.numeracionPrefijo || ""}${formatNumber(Number(valores.numeracionDesde) || 0)} → ${formatNumber(Number(valores.numeracionHasta) || 0)}`
              : "Sin numerar"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Papel</span>
          <span className="max-w-[60%] truncate text-right font-medium">
            {sustrato ? `${sustrato.nombre} · ${sustrato.gramaje} g` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Medida</span>
          <span className="font-medium tabular-nums">
            {ancho && alto ? `${ancho} × ${alto} mm` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Tintas</span>
          <span className="font-medium tabular-nums">
            {Number(valores.tintasTiro) || 0} tiro
            {pantones.length > 0 ? ` · ${pantones.length} Pantone` : ""}
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
  const { form, isSubmitting, onCancel } = usePapeleriaForm();
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
      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        La orden entra a <span className="font-medium text-foreground">En Proceso</span> y
        notifica al equipo de taller en tiempo real.
      </p>
    </div>
  );
}
