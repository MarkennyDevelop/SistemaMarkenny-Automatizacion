import { useWatch } from "react-hook-form";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Layers,
  Loader2,
  Palette,
  Ruler,
  Scissors,
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
import { ACABADOS, MAQUINAS, SUSTRATOS, TINTAS_PANTONE } from "@/shared/catalogos";
import type { Tecnologia } from "@/shared/domain";
import { estimarMontoOrden } from "../../lib/cotizador";
import { useOrdenTrabajoForm } from "./context";

const TECNOLOGIAS: { value: Tecnologia; label: string; hint: string }[] = [
  { value: "OFFSET", label: "Offset", hint: "Tirajes altos" },
  { value: "DIGITAL", label: "Digital", hint: "Cortos y pruebas" },
  { value: "FLEXOGRAFIA", label: "Flexografía", hint: "Etiquetas" },
  { value: "GRAN_FORMATO", label: "Gran formato", hint: "Lona y vinilo" },
];

export function ClienteProductoSection() {
  const { form, clientes } = useOrdenTrabajoForm();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const clienteId = watch("clienteId");

  return (
    <FormSection
      index="01"
      title="Cliente y producto"
      description="Identifica el trabajo y a quién pertenece"
      icon={UserRound}
    >
      <div className="space-y-4">
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
                setValue("clienteId", value, { shouldValidate: true, shouldDirty: true })
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
            label="Producto"
            htmlFor="producto"
            required
            error={errors.producto?.message}
            hint="Ej. Talonario, etiqueta, caja"
          >
            <Input
              id="producto"
              placeholder="Etiquetas troqueladas 4x4 cm"
              {...register("producto")}
            />
          </FormField>
        </FormGrid>

        <FormField
          label="Descripción técnica"
          htmlFor="descripcion"
          error={errors.descripcion?.message}
          hint="Opcional · visible en la ficha de planta"
        >
          <Textarea
            id="descripcion"
            rows={2}
            placeholder="Detalles de arte, material y referencia del cliente"
            {...register("descripcion")}
          />
        </FormField>
      </div>
    </FormSection>
  );
}

export function EspecificacionesSection() {
  const { form } = useOrdenTrabajoForm();
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
      title="Especificaciones de tiraje"
      description="Tecnología, cantidades y ventana de entrega"
      icon={Ruler}
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Tecnología de impresión</span>
            {errors.tecnologia && (
              <span className="text-[11px] text-destructive">{errors.tecnologia.message}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
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
            label="Cantidad"
            htmlFor="cantidad"
            required
            error={errors.cantidad?.message}
            hint="Unidades finales"
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
            label="Máquina asignada"
            htmlFor="maquina"
            required
            error={errors.maquina?.message}
            className="xl:col-span-2"
          >
            <Select
              value={maquina}
              onValueChange={(value) =>
                setValue("maquina", value, { shouldValidate: true, shouldDirty: true })
              }
            >
              <SelectTrigger id="maquina">
                <SelectValue placeholder="Selecciona la máquina" />
              </SelectTrigger>
              <SelectContent>
                {MAQUINAS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Ancho"
            htmlFor="anchoMm"
            required
            error={errors.anchoMm?.message}
            hint="milímetros"
          >
            <Input
              id="anchoMm"
              type="number"
              inputMode="decimal"
              min={10}
              step={1}
              {...register("anchoMm", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Alto"
            htmlFor="altoMm"
            required
            error={errors.altoMm?.message}
            hint="milímetros"
          >
            <Input
              id="altoMm"
              type="number"
              inputMode="decimal"
              min={10}
              step={1}
              {...register("altoMm", { valueAsNumber: true })}
            />
          </FormField>
        </FormGrid>
      </div>
    </FormSection>
  );
}

export function SustratoSection() {
  const { form } = useOrdenTrabajoForm();
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const sustratoId = watch("sustratoId");
  const seleccionado = SUSTRATOS.find((item) => item.id === sustratoId);

  return (
    <FormSection
      index="03"
      title="Sustrato y gramaje"
      description="Papel, cartulina, adhesivo o lona"
      icon={Layers}
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SUSTRATOS.map((sustrato) => (
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
              {seleccionado.gramaje} g/m². La reserva de stock se descuenta del
              inventario al aprobar la orden (evento{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                ORDEN_PASO_A_IMPRESION
              </code>
              ).
            </p>
          </div>
        )}
      </div>
    </FormSection>
  );
}

export function TintasSection() {
  const { form } = useOrdenTrabajoForm();
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
      index="04"
      title="Tintas y colorimetría"
      description="Proceso CMYK y formulaciones Pantone"
      icon={Droplets}
    >
      <div className="space-y-5">
        <FormGrid className="max-w-md">
          <FormField
            label="Tintas de tiro"
            htmlFor="tintasTiro"
            error={errors.tintasTiro?.message}
            hint="0 – 8"
          >
            <Input
              id="tintasTiro"
              type="number"
              min={0}
              max={8}
              {...register("tintasTiro", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Tintas de retiro"
            htmlFor="tintasRetiro"
            error={errors.tintasRetiro?.message}
            hint="0 – 8"
          >
            <Input
              id="tintasRetiro"
              type="number"
              min={0}
              max={8}
              {...register("tintasRetiro", { valueAsNumber: true })}
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
            El costo de cada formulación especial se valida con el proveedor antes
            de aprobar la orden.
          </p>
        </div>
      </div>
    </FormSection>
  );
}

export function AcabadosSection() {
  const { form } = useOrdenTrabajoForm();
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
      index="05"
      title="Acabados y observaciones"
      description="Post-impresión, empaque y notas para planta"
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
            placeholder="Instrucciones de secado, sentido de fibra, pruebas de color, etc."
            {...register("observaciones")}
          />
        </FormField>
      </div>
    </FormSection>
  );
}

export function ResumenSection() {
  const { form, clientes } = useOrdenTrabajoForm();
  const valores = useWatch({ control: form.control });

  const cliente = clientes.find((item) => item.id === valores.clienteId);
  const cantidad = Number(valores.cantidad) || 0;
  const ancho = Number(valores.anchoMm) || 0;
  const alto = Number(valores.altoMm) || 0;
  const acabados = valores.acabados ?? [];
  const pantones = valores.tintasPantone ?? [];
  const sustrato = SUSTRATOS.find((item) => item.id === valores.sustratoId);

  let resultado: ReturnType<typeof estimarMontoOrden> | null = null;
  if (cantidad >= 1 && ancho >= 10 && alto >= 10 && valores.sustratoId) {
    resultado = estimarMontoOrden({
      tecnologia: valores.tecnologia ?? "OFFSET",
      cantidad,
      anchoMm: ancho,
      altoMm: alto,
      tintasTiro: Number(valores.tintasTiro) || 0,
      tintasRetiro: Number(valores.tintasRetiro) || 0,
      sustratoId: valores.sustratoId,
      acabados,
    });
  }

  const completados = [
    Boolean(valores.clienteId),
    Boolean(valores.producto?.trim()),
    Boolean(valores.fechaEntrega),
    acabados.length > 0 || pantones.length > 0 || (Number(valores.tintasTiro) || 0) > 0,
  ].filter(Boolean).length;

  return (
    <aside className="overflow-hidden rounded-xl bg-markenny-ink text-white shadow-raised">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Resumen de la orden
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Borrador
          </span>
        </div>
        <p className="mt-2 font-display text-xl font-semibold uppercase leading-tight tracking-wide">
          {valores.producto?.trim() || "Nuevo trabajo gráfico"}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
          <Building2 className="h-3 w-3" />
          {cliente?.nombre ?? "Cliente sin seleccionar"}
        </p>
      </div>

      <div className="space-y-3 px-5 py-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Tiraje</span>
          <span className="font-medium tabular-nums">
            {cantidad ? `${formatNumber(cantidad)} unidades` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Medida</span>
          <span className="font-medium tabular-nums">
            {ancho && alto ? `${ancho} × ${alto} mm` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Sustrato</span>
          <span className="max-w-[60%] truncate text-right font-medium">
            {sustrato?.nombre ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Tintas</span>
          <span className="font-medium tabular-nums">
            {Number(valores.tintasTiro) || 0} tiro · {Number(valores.tintasRetiro) || 0} retiro
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
        {resultado && (
          <div className="mt-3 rounded-md bg-white/[0.04] px-3 py-2 text-[10px] leading-relaxed text-white/45">
            Incluye {formatNumber(resultado.mermas)} de merma (
            {resultado.mermasPorcentaje.toFixed(1)}%) y costos de máquina. Cálculo
            referencial sujeto a validación de pre-prensa.
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-5 py-3.5">
        <div className="flex items-center justify-between text-[10px] text-white/45">
          <span>Preparación de la orden</span>
          <span className="font-semibold text-white/75">{completados}/4</span>
        </div>
        <Progress
          value={(completados / 4) * 100}
          className="mt-2 bg-white/10"
          indicatorClassName="bg-primary"
        />
      </div>
    </aside>
  );
}

export function Actions() {
  const { form, isSubmitting, onCancel } = useOrdenTrabajoForm();
  const { errors, isSubmitting: formSubmitting } = form.formState;
  const errores = Object.keys(errors).length;
  const enviando = isSubmitting || formSubmitting;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {enviando ? "Generando orden..." : "Generar orden de trabajo"}
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
          Revisa {errores} campo(s) obligatorio(s) antes de generar la orden.
        </p>
      )}
      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        La orden ingresa a <span className="font-medium text-foreground">En Proceso</span>{" "}
        y reserva el sustrato del inventario.
      </p>
    </div>
  );
}
