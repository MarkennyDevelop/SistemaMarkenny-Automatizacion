import { useWatch } from "react-hook-form";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Image as ImageIcon,
  Layers,
  Loader2,
  Ruler,
  Scissors,
  Send,
  UserRound,
  Wallet,
} from "lucide-react";
import { ACABADOS_GRAN_FORMATO, EMPRESA } from "@markenny/contrato/dominio";
import { ClienteSelect } from "@/components/forms/ClienteSelect";
import { OptionGroup, type Opcion } from "@/components/forms/OptionGroup";
import { FormField, FormGrid, FormSection } from "@/components/forms/primitives";
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
import { fechaInputLocal } from "@/lib/fechas";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  CATEGORIA_INVENTARIO_LABEL,
  PRIORIDAD_LABEL,
  TIPO_GRAN_FORMATO_LABEL,
  type Prioridad,
} from "@/shared/domain";
import { useDisponibilidad } from "../../hooks/useDisponibilidad";
import { estimarMontoOrden } from "../../lib/cotizador";
import { aMilimetros, idsAcabadosGranFormato, sustratoCostoGranFormato } from "../../lib/ordenes";
import type { GranFormatoFormValues } from "../../types/schemas";
import { useGranFormatoForm } from "./context";

const OPCIONES_TIPO: Opcion<GranFormatoFormValues["tipoGranFormato"]>[] = (
  Object.keys(TIPO_GRAN_FORMATO_LABEL) as GranFormatoFormValues["tipoGranFormato"][]
).map((value) => ({ value, label: TIPO_GRAN_FORMATO_LABEL[value] }));

const OPCIONES_UNIDAD: Opcion<GranFormatoFormValues["unidadDimension"]>[] = [
  { value: "m", label: "Metros (m)" },
  { value: "cm", label: "Centímetros (cm)" },
];

const OPCIONES_ACABADO: Opcion<GranFormatoFormValues["acabados"][number]>[] = ACABADOS_GRAN_FORMATO.map(
  (value) => ({ value, label: value, hint: "Contorno de stickers y vinil de rotulación" }),
);

/** Escribe un valor del formulario; revalida en vivo tras el primer envío. */
function useAsignar() {
  const { form } = useGranFormatoForm();
  const asignar: typeof form.setValue = (campo, valor) =>
    form.setValue(campo, valor, { shouldValidate: form.formState.isSubmitted, shouldDirty: true });
  return asignar;
}

/** Sustratos que se pueden ofrecer: viniles y lonas con existencia real. */
function useSustratosDisponibles() {
  const { deCategoria, isLoading, isError } = useDisponibilidad();
  const sustratos = deCategoria("VINIL", "LONA").filter((insumo) => insumo.disponible && insumo.stock > 0);
  return { sustratos, isLoading, isError };
}

/* ------------------------------------------------------------------ */
/* 01 · Cliente y pieza                                                */
/* ------------------------------------------------------------------ */

export function PiezaSection() {
  const { form, clientes } = useGranFormatoForm();
  const asignar = useAsignar();
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const [clienteId, tipo] = useWatch({ control, name: ["clienteId", "tipoGranFormato"] });

  return (
    <FormSection
      index="01"
      title="Cliente y pieza"
      description="Pendones, stickers y viniles"
      icon={UserRound}
    >
      <div className="space-y-5">
        <FormGrid>
          <FormField
            label="Cliente"
            htmlFor="clienteId"
            required
            error={errors.clienteId?.message}
            hint={`${clientes.length} clientes`}
          >
            <ClienteSelect
              clientes={clientes}
              value={clienteId ?? ""}
              onChange={(valor) => asignar("clienteId", valor)}
            />
          </FormField>

          <FormField label="Nombre de la pieza" htmlFor="producto" required error={errors.producto?.message}>
            <Input id="producto" placeholder="Ej. Pendón promocional 1 × 2 m" {...register("producto")} />
          </FormField>
        </FormGrid>

        <OptionGroup
          label="Tipo de pieza"
          opciones={OPCIONES_TIPO}
          value={tipo}
          onChange={(valor) => valor && asignar("tipoGranFormato", valor)}
          error={errors.tipoGranFormato?.message}
          columnas="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
        />

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
/* 02 · Dimensiones, resolución y entrega                              */
/* ------------------------------------------------------------------ */

export function DimensionesSection() {
  const { form } = useGranFormatoForm();
  const asignar = useAsignar();
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const [unidad, anchoValor, altoValor, cantidadValor, prioridad] = useWatch({
    control,
    name: ["unidadDimension", "ancho", "alto", "cantidad", "prioridad"],
  });
  const ancho = Number(anchoValor) || 0;
  const alto = Number(altoValor) || 0;
  const cantidad = Number(cantidadValor) || 0;
  const m2 = unidad
    ? (aMilimetros(ancho, unidad) / 1000) * (aMilimetros(alto, unidad) / 1000) * Math.max(cantidad, 0)
    : 0;

  return (
    <FormSection
      index="02"
      title="Dimensiones y salida"
      description="Medidas en metros o centímetros, resolución y entrega"
      icon={Ruler}
    >
      <div className="space-y-5">
        <OptionGroup
          label="Unidad de medida"
          opciones={OPCIONES_UNIDAD}
          value={unidad}
          onChange={(valor) => valor && asignar("unidadDimension", valor)}
          error={errors.unidadDimension?.message}
          columnas="grid-cols-2"
          className="sm:max-w-sm"
        />

        <FormGrid className="sm:grid-cols-2 xl:grid-cols-4">
          <FormField label="Ancho" htmlFor="ancho" required error={errors.ancho?.message} hint={unidad}>
            <Input
              id="ancho"
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.1}
              {...register("ancho", { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Alto" htmlFor="alto" required error={errors.alto?.message} hint={unidad}>
            <Input
              id="alto"
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.1}
              {...register("alto", { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Cantidad" htmlFor="cantidad" required error={errors.cantidad?.message} hint="piezas">
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

        {m2 > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3.5 py-2.5">
            <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                {ancho} × {alto} {unidad}
              </span>{" "}
              · <span className="font-medium tabular-nums text-foreground">{m2.toFixed(2)} m²</span> totales de
              impresión.
            </p>
          </div>
        )}

        <FormGrid>
          <FormField label="Prioridad" htmlFor="prioridad" error={errors.prioridad?.message}>
            <Select value={prioridad} onValueChange={(valor) => asignar("prioridad", valor as Prioridad)}>
              <SelectTrigger id="prioridad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORIDAD_LABEL) as Prioridad[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {PRIORIDAD_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Fecha de entrega" htmlFor="fechaEntrega" required error={errors.fechaEntrega?.message}>
            <div className="relative">
              <Input
                id="fechaEntrega"
                type="date"
                min={fechaInputLocal()}
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
/* 03 · Sustrato (existencias reales del almacén)                       */
/* ------------------------------------------------------------------ */

export function SustratoSection() {
  const { form } = useGranFormatoForm();
  const asignar = useAsignar();
  const { sustratos, isLoading, isError } = useSustratosDisponibles();
  const sustratoId = useWatch({ control: form.control, name: "sustratoId" });
  const error = form.formState.errors.sustratoId?.message;

  const opciones: Opcion<string>[] = sustratos.map((insumo) => ({
    value: insumo.id,
    label: insumo.nombre,
    hint: `${CATEGORIA_INVENTARIO_LABEL[insumo.categoria]} · ${formatNumber(insumo.stock)} ${insumo.unidad} en existencia`,
  }));

  return (
    <FormSection
      index="03"
      title="Sustrato"
      description="Viniles y lonas con existencia en almacén"
      icon={Layers}
    >
      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">Consultando existencias del almacén...</p>
      ) : isError ? (
        <p className="text-[11px] text-destructive" role="alert">
          No se pudo consultar el almacén. Intenta de nuevo en unos segundos.
        </p>
      ) : opciones.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No hay viniles ni lonas con existencia. Registra una entrada en Inventario para poder ofrecerlos.
        </p>
      ) : (
        <OptionGroup
          label="Sustrato"
          opciones={opciones}
          value={sustratoId || undefined}
          onChange={(valor) => asignar("sustratoId", valor ?? "")}
          error={error}
          columnas="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        />
      )}
      {!isLoading && opciones.length === 0 && error && (
        <p className="mt-2 text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · Acabado y observaciones                                         */
/* ------------------------------------------------------------------ */

export function AcabadosSection() {
  const { form } = useGranFormatoForm();
  const asignar = useAsignar();
  const {
    register,
    formState: { errors },
  } = form;
  const acabados = useWatch({ control: form.control, name: "acabados" }) ?? [];

  return (
    <FormSection
      index="04"
      title="Acabado y observaciones"
      description="El mate o brillante viene en el sustrato elegido"
      icon={Scissors}
    >
      <div className="space-y-5">
        <OptionGroup<GranFormatoFormValues["acabados"][number]>
          multiple
          label="Acabado"
          opciones={OPCIONES_ACABADO}
          value={acabados}
          onChange={(valor) => asignar("acabados", valor)}
          columnas="grid-cols-1 sm:grid-cols-2"
        />
        <FormField
          label="Observaciones para planta"
          htmlFor="observaciones"
          error={errors.observaciones?.message}
          hint="Opcional · máx. 500 caracteres"
        >
          <Textarea
            id="observaciones"
            rows={3}
            placeholder="Sentido de la trama, contorno de corte, pruebas de adhesión..."
            {...register("observaciones")}
          />
        </FormField>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen                                                             */
/* ------------------------------------------------------------------ */

export function ResumenSection() {
  const { form, clientes } = useGranFormatoForm();
  const { sustratos } = useSustratosDisponibles();
  const valores = useWatch({ control: form.control });

  const cliente = clientes.find((item) => item.id === valores.clienteId);
  const cantidad = Number(valores.cantidad) || 0;
  const ancho = Number(valores.ancho) || 0;
  const alto = Number(valores.alto) || 0;
  const unidad = valores.unidadDimension;
  const acabados = valores.acabados ?? [];
  const sustrato = sustratos.find((item) => item.id === valores.sustratoId);

  const anchoMm = unidad ? aMilimetros(ancho, unidad) : 0;
  const altoMm = unidad ? aMilimetros(alto, unidad) : 0;
  const m2 = (anchoMm / 1000) * (altoMm / 1000) * Math.max(cantidad, 0);

  const resultado =
    cantidad >= 1 && anchoMm >= 100 && altoMm >= 100 && sustrato
      ? estimarMontoOrden({
          tecnologia: "GRAN_FORMATO",
          cantidad,
          anchoMm,
          altoMm,
          tintasTiro: 4,
          tintasRetiro: 0,
          sustratoId: sustratoCostoGranFormato(sustrato),
          acabados: idsAcabadosGranFormato(acabados),
        })
      : null;

  const obligatorios = [
    valores.clienteId,
    valores.producto?.trim(),
    valores.tipoGranFormato,
    unidad && ancho > 0 && alto > 0,
    sustrato,
    valores.fechaEntrega,
  ];
  const completados = obligatorios.filter(Boolean).length;

  const filas: [string, string][] = [
    ["Pieza", valores.tipoGranFormato ? TIPO_GRAN_FORMATO_LABEL[valores.tipoGranFormato] : "—"],
    ["Medidas", unidad && ancho && alto ? `${ancho} × ${alto} ${unidad}` : "—"],
    ["Superficie", m2 > 0 ? `${m2.toFixed(2)} m²` : "—"],
    ["Cantidad", cantidad ? `${formatNumber(cantidad)} pieza(s)` : "—"],
    ["Sustrato", sustrato?.nombre ?? "—"],
    ["Resolución", `${Number(valores.resolucionDpi) || 0} dpi`],
    ["Acabado", acabados.length > 0 ? acabados.join(", ") : "Sin acabado"],
    ["Entrega", valores.fechaEntrega ? formatDate(valores.fechaEntrega) : "—"],
  ];

  return (
    <aside className="overflow-hidden rounded-xl bg-markenny-ink text-white shadow-raised">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            <p className="truncate">{EMPRESA.nombre}</p>
            <p className="mt-0.5 tracking-[0.12em]">Pendones, stickers y viniles</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Borrador
          </span>
        </div>
        <p className="mt-3 font-display text-xl font-semibold uppercase leading-tight tracking-wide">
          {valores.producto?.trim() || "Nueva pieza"}
        </p>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-white/50">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{cliente?.nombre ?? "Cliente sin seleccionar"}</span>
        </p>
      </div>

      <dl className="space-y-2.5 px-5 py-4 text-xs">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-white/45">{etiqueta}</dt>
            <dd className="min-w-0 break-words text-right font-medium tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="mx-5 h-px bg-white/10" />

      <div className="px-5 py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">Total estimado</p>
            <p className="mt-1 font-display text-3xl font-semibold leading-none tabular-nums">
              {resultado ? formatCurrency(resultado.total) : "—"}
            </p>
          </div>
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
          <span>USD · no incluye IVA</span>
          <span>{resultado ? `${formatCurrency(resultado.costoUnitario)} / u.` : "Margen 35%"}</span>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-3.5">
        <div className="flex items-center justify-between text-[10px] text-white/45">
          <span>Campos obligatorios</span>
          <span className="font-semibold text-white/75">
            {completados}/{obligatorios.length}
          </span>
        </div>
        <Progress
          value={(completados / obligatorios.length) * 100}
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
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {enviando ? "Enviando a taller..." : "Enviar orden a producción"}
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={enviando}>
        Cancelar
      </Button>
      {errores > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Revisa {errores} campo(s) antes de enviar la orden.
        </p>
      )}
      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        La orden entra a <span className="font-medium text-foreground">En Proceso</span> y notifica
        al taller en tiempo real.
      </p>
    </div>
  );
}
