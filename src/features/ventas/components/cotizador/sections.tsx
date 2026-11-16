import { useWatch } from "react-hook-form";
import {
  Calculator,
  ClipboardCopy,
  Layers,
  Percent,
  Printer,
  Scissors,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { FormField, FormGrid, FormSection, ToggleCard } from "@/components/forms/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { ACABADOS, SUSTRATOS } from "@/shared/catalogos";
import type { Tecnologia } from "@/shared/domain";
import { calcularCotizacion } from "../../lib/cotizador";
import type { CotizacionFormValues } from "../../types/schemas";
import { useCotizadorForm } from "./context";

const TECNOLOGIAS: {
  value: Extract<Tecnologia, "OFFSET" | "DIGITAL" | "GRAN_FORMATO">;
  label: string;
  description: string;
  icon: typeof Printer;
  hint: string;
}[] = [
  {
    value: "OFFSET",
    label: "Offset",
    description: "Planchas CTP, mermas de arranque y tiraje por hora.",
    icon: Printer,
    hint: "Tirajes medios y altos",
  },
  {
    value: "DIGITAL",
    label: "Digital",
    description: "Costo por clic, sin planchas y mermas mínimas.",
    icon: Zap,
    hint: "Cortos y pruebas",
  },
  {
    value: "GRAN_FORMATO",
    label: "Gran formato",
    description: "Cálculo por m², tinta y pasadas de impresión.",
    icon: Layers,
    hint: "Lona, vinilo y banners",
  },
];

function useResultado() {
  const { form } = useCotizadorForm();
  const valores = useWatch({ control: form.control });

  const datos: CotizacionFormValues = {
    tecnologia: valores.tecnologia ?? "OFFSET",
    tiraje: Number(valores.tiraje) || 0,
    anchoMm: Number(valores.anchoMm) || 0,
    altoMm: Number(valores.altoMm) || 0,
    tintasTiro: Number(valores.tintasTiro) || 0,
    tintasRetiro: Number(valores.tintasRetiro) || 0,
    sustratoId: valores.sustratoId ?? "couche-150",
    acabados: valores.acabados ?? [],
    margen: Number(valores.margen) || 35,
  };

  const resultado = calcularCotizacion({
    ...datos,
    tecnologia: datos.tecnologia,
  });

  return { valores, datos, resultado };
}

export function TecnologiaSection() {
  const { form } = useCotizadorForm();
  const tecnologia = form.watch("tecnologia");

  return (
    <FormSection
      index="01"
      title="Tecnología de impresión"
      description="Define la estrategia de cálculo y sus mermas"
      icon={Calculator}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {TECNOLOGIAS.map((tec) => {
          const activa = tecnologia === tec.value;
          const TecIcon = tec.icon;
          return (
            <button
              key={tec.value}
              type="button"
              aria-pressed={activa}
              onClick={() =>
                form.setValue("tecnologia", tec.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              className={cn(
                "group relative overflow-hidden rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                activa
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border bg-background hover:border-foreground/25 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between">
                <TecIcon
                  className={cn("h-5 w-5", activa ? "text-white" : "text-primary")}
                />
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-wider",
                    activa ? "text-white/60" : "text-muted-foreground",
                  )}
                >
                  {tec.hint}
                </span>
              </div>
              <p className="mt-3 font-display text-base font-semibold uppercase tracking-wide">
                {tec.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-[11px] leading-snug",
                  activa ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {tec.description}
              </p>
            </button>
          );
        })}
      </div>
    </FormSection>
  );
}

export function TirajeSection() {
  const { form } = useCotizadorForm();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <FormSection
      index="02"
      title="Tiraje y formato"
      description="Cantidad, dimensiones y tintas por cara"
      icon={Layers}
    >
      <FormGrid className="sm:grid-cols-2 xl:grid-cols-3">
        <FormField
          label="Tiraje"
          htmlFor="cot-tiraje"
          required
          error={errors.tiraje?.message}
          hint="unidades"
        >
          <Input
            id="cot-tiraje"
            type="number"
            min={1}
            {...register("tiraje", { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Ancho"
          htmlFor="cot-ancho"
          required
          error={errors.anchoMm?.message}
          hint="mm"
        >
          <Input
            id="cot-ancho"
            type="number"
            min={10}
            {...register("anchoMm", { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Alto"
          htmlFor="cot-alto"
          required
          error={errors.altoMm?.message}
          hint="mm"
        >
          <Input
            id="cot-alto"
            type="number"
            min={10}
            {...register("altoMm", { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Tintas de tiro"
          htmlFor="cot-tiro"
          error={errors.tintasTiro?.message}
          hint="0 – 8"
        >
          <Input
            id="cot-tiro"
            type="number"
            min={0}
            max={8}
            {...register("tintasTiro", { valueAsNumber: true })}
          />
        </FormField>
        <FormField
          label="Tintas de retiro"
          htmlFor="cot-retiro"
          error={errors.tintasRetiro?.message}
          hint="0 – 8"
        >
          <Input
            id="cot-retiro"
            type="number"
            min={0}
            max={8}
            {...register("tintasRetiro", { valueAsNumber: true })}
          />
        </FormField>
        <div className="hidden items-end pb-1 xl:flex">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            La merma se calcula automáticamente según la tecnología seleccionada.
          </p>
        </div>
      </FormGrid>
    </FormSection>
  );
}

export function SustratoSection() {
  const { form } = useCotizadorForm();
  const sustratoId = form.watch("sustratoId");

  return (
    <FormSection
      index="03"
      title="Sustrato"
      description="Costo por pliego o metro cuadrado"
      icon={Layers}
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {SUSTRATOS.map((sustrato) => (
          <ToggleCard
            key={sustrato.id}
            selected={sustratoId === sustrato.id}
            onToggle={() =>
              form.setValue("sustratoId", sustrato.id, {
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
    </FormSection>
  );
}

export function AcabadosSection() {
  const { form } = useCotizadorForm();
  const acabados = form.watch("acabados") ?? [];

  const toggle = (id: string) => {
    const next = acabados.includes(id)
      ? acabados.filter((item) => item !== id)
      : [...acabados, id];
    form.setValue("acabados", next, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <FormSection
      index="04"
      title="Acabados"
      description="Costo por unidad sobre el tiraje total"
      icon={Scissors}
      defaultOpen={false}
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {ACABADOS.map((acabado) => (
          <ToggleCard
            key={acabado.id}
            selected={acabados.includes(acabado.id)}
            onToggle={() => toggle(acabado.id)}
            title={acabado.nombre}
            meta={`+${formatCurrency(acabado.precio)} / u.`}
          />
        ))}
      </div>
    </FormSection>
  );
}

export function MargenSection() {
  const { form } = useCotizadorForm();
  const { resultado } = useResultado();
  const margen = Number(form.watch("margen")) || 35;

  return (
    <FormSection
      index="05"
      title="Margen comercial"
      description="Define la utilidad sobre el costo directo"
      icon={Percent}
      defaultOpen={false}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={10}
            max={80}
            step={5}
            value={margen}
            onChange={(event) =>
              form.setValue("margen", Number(event.target.value), {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            aria-label="Margen comercial"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
          <div className="w-20 shrink-0 rounded-md border border-border bg-background px-2 py-1.5 text-center">
            <span className="font-display text-lg font-semibold tabular-nums">{margen}</span>
            <span className="ml-0.5 text-[10px] text-muted-foreground">%</span>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Costo directo
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatCurrency(resultado.costoDirecto)}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Utilidad
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-primary">
              {formatCurrency(resultado.margenMonto)}
            </p>
          </div>
          <div className="rounded-md bg-markenny-ink px-3 py-2 text-white">
            <p className="text-[9px] uppercase tracking-wider text-white/45">Precio final</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">
              {formatCurrency(resultado.total)}
            </p>
          </div>
        </div>
      </div>
    </FormSection>
  );
}

export function ResumenCotizacion() {
  const { datos, resultado } = useResultado();

  const copiar = async () => {
    const lineas = [
      `COTIZACIÓN MARKENNY C.A. — ${datos.tecnologia}`,
      `Tiraje: ${formatNumber(datos.tiraje)} u. · ${datos.anchoMm} × ${datos.altoMm} mm`,
      ...resultado.conceptos.map(
        (concepto) => `${concepto.concepto}: ${formatCurrency(concepto.monto)}`,
      ),
      `TOTAL ESTIMADO: ${formatCurrency(resultado.total)}`,
      `Costo unitario: ${formatCurrency(resultado.costoUnitario)}`,
    ];
    try {
      await navigator.clipboard.writeText(lineas.join("\n"));
      toast.success("Desglose copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar", {
        description: "El navegador bloqueó el acceso al portapapeles.",
      });
    }
  };

  return (
    <aside className="overflow-hidden rounded-xl bg-markenny-ink text-white shadow-raised">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Cotización estimada
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Borrador
          </span>
        </div>
        <p className="mt-3 font-display text-4xl font-semibold leading-none tabular-nums">
          {formatCurrency(resultado.total)}
        </p>
        <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
          <span>USD · no incluye IVA</span>
          <span className="inline-flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            {formatCurrency(resultado.costoUnitario)} / unidad
          </span>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {resultado.conceptos.map((concepto) => (
          <div key={concepto.concepto}>
            <div className="flex items-start justify-between gap-3 text-xs">
              <span className="text-white/55">{concepto.concepto}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCurrency(concepto.monto)}
              </span>
            </div>
            {concepto.nota && (
              <p className="mt-0.5 text-[9px] uppercase tracking-wide text-white/30">
                {concepto.nota}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mx-5 h-px bg-white/10" />

      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-white/35">Merma</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {formatNumber(resultado.mermas)}
          </p>
          <p className="text-[9px] text-white/35">
            {resultado.mermasPorcentaje.toFixed(1)}% del tiraje
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-white/35">Costo directo</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {formatCurrency(resultado.costoDirecto)}
          </p>
          <p className="text-[9px] text-white/35">
            Margen {datos.margen}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-4">
        <Button
          type="button"
          variant="inverse"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimir
        </Button>
        <Button
          type="button"
          size="sm"
          className="border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]"
          onClick={() => void copiar()}
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          Copiar
        </Button>
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-[9px] text-white/35">
        <TrendingUp className="h-3 w-3 text-primary" />
        Referencia sujeta a validación de pre-prensa y disponibilidad de stock.
      </div>
    </aside>
  );
}

export function CotizadorHeaderIcon() {
  return <Sparkles className="h-4 w-4 text-primary" />;
}
