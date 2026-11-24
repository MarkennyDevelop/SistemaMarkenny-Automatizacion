import { useWatch } from "react-hook-form";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  FileText,
  Hash,
  Layers,
  Loader2,
  Palette,
  Send,
  StickyNote,
  Wallet,
} from "lucide-react";
import { ClienteSelect } from "@/components/forms/ClienteSelect";
import { OptionGroup, type Opcion } from "@/components/forms/OptionGroup";
import { FormField, FormGrid, FormSection } from "@/components/forms/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import { fechaInputLocal } from "@/lib/fechas";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  COLOR_TINTA_LABEL,
  ENGOMADO_LABEL,
  FORMATO_PAPELERIA_LABEL,
  LAMINADO_LABEL,
  PERFORACION_LABEL,
  TAMANO_PAPELERIA_LABEL,
  TIPO_DOCUMENTO_LABEL,
  TIPO_PAPEL_LABEL,
  TIPOS_PAPEL,
  resumenEspecificaciones,
  type ColorTinta,
} from "@/shared/domain";
import { EMPRESA } from "@markenny/contrato/dominio";
import { useDisponibilidad } from "../../hooks/useDisponibilidad";
import { estimarPapeleria, ordenDesdePapeleria } from "../../lib/ordenes";
import { papeleriaSchema } from "../../types/schemas";
import { usePapeleriaForm } from "./context";

function opcionesDe<T extends string>(etiquetas: Record<T, string>): Opcion<T>[] {
  return (Object.keys(etiquetas) as T[]).map((value) => ({ value, label: etiquetas[value] }));
}

const OPCIONES_DOCUMENTO = opcionesDe(TIPO_DOCUMENTO_LABEL).map((opcion) => ({
  ...opcion,
  label: opcion.value === "OTRO" ? "Otro:" : opcion.label.split(" · ")[0],
  hint: opcion.value === "OTRO" ? undefined : opcion.label.split(" · ")[1],
}));
const OPCIONES_FORMATO = opcionesDe(FORMATO_PAPELERIA_LABEL);
const OPCIONES_PERFORACION = opcionesDe(PERFORACION_LABEL);
const OPCIONES_ENGOMADO = opcionesDe(ENGOMADO_LABEL);
const OPCIONES_LAMINADO = opcionesDe(LAMINADO_LABEL);
const OPCIONES_TINTA = opcionesDe(COLOR_TINTA_LABEL);
const OPCIONES_TAMANO = opcionesDe(TAMANO_PAPELERIA_LABEL);
const OPCIONES_SI_NO: Opcion<"SI" | "NO">[] = [
  { value: "SI", label: "Sí" },
  { value: "NO", label: "No" },
];
const PARTES_FIJAS = [1, 2, 3, 4] as const;

/** Escribe un valor del formulario validando y marcándolo como modificado. */
function useAsignar() {
  const { form } = usePapeleriaForm();
  const asignar: typeof form.setValue = (campo, valor) =>
    form.setValue(campo, valor, { shouldValidate: form.formState.isSubmitted, shouldDirty: true });
  return asignar;
}

/* ------------------------------------------------------------------ */
/* 01 · Encabezado: empresa, cliente y documento                       */
/* ------------------------------------------------------------------ */

export function ClienteDocumentoSection() {
  const { form, clientes } = usePapeleriaForm();
  const { usuario } = useAuth();
  const asignar = useAsignar();
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const clienteId = useWatch({ control, name: "clienteId" });
  const cliente = clientes.find((item) => item.id === clienteId);

  return (
    <FormSection
      index="01"
      title="Orden de trabajo · Papelería"
      description={`${EMPRESA.nombre} · RIF ${EMPRESA.rif}`}
      icon={Building2}
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

          <FormField
            label="Nombre del documento"
            htmlFor="nombreDocumento"
            required
            error={errors.nombreDocumento?.message}
          >
            <Input
              id="nombreDocumento"
              placeholder="Ej. Nota de entrega Farmacia Central"
              {...register("nombreDocumento")}
            />
          </FormField>
        </FormGrid>

        <dl className="grid gap-x-4 gap-y-2 rounded-lg border border-dashed border-border px-4 py-3 text-[12px] sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">RIF del cliente</dt>
            <dd className="font-medium">{cliente?.rif ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Teléfono</dt>
            <dd className="font-medium">{cliente?.telefono ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vendedor</dt>
            <dd className="font-medium">{usuario?.nombre ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Fecha de aprobación</dt>
            <dd className="font-medium">Al enviar la orden</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Fecha finalizado</dt>
            <dd className="font-medium">La registra planta</dd>
          </div>
        </dl>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · Tipo de trabajo, presentación, cantidad y partes               */
/* ------------------------------------------------------------------ */

export function TrabajoSection() {
  const { form } = usePapeleriaForm();
  const asignar = useAsignar();
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const [tipoDocumento, formato, dobleCara, partes] = useWatch({
    control,
    name: ["tipoDocumento", "formato", "dobleCara", "partes"],
  });
  const partesOtros = typeof partes === "number" && partes > 4;

  return (
    <FormSection
      index="02"
      title="Tipo de trabajo"
      description="NE., RM., F. u otro · Talonario o Block · partes"
      icon={FileText}
    >
      <div className="space-y-5">
        <OptionGroup
          label="Tipo de trabajo"
          opciones={OPCIONES_DOCUMENTO}
          value={tipoDocumento}
          onChange={(valor) => valor && asignar("tipoDocumento", valor)}
          error={errors.tipoDocumento?.message}
        />
        {tipoDocumento === "OTRO" && (
          <FormField
            label="Otro documento"
            htmlFor="tipoDocumentoOtro"
            required
            error={errors.tipoDocumentoOtro?.message}
          >
            <Input id="tipoDocumentoOtro" placeholder="Ej. Recibo de pago" {...register("tipoDocumentoOtro")} />
          </FormField>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <OptionGroup
            label="Presentación"
            opciones={OPCIONES_FORMATO}
            value={formato}
            onChange={(valor) => valor && asignar("formato", valor)}
            error={errors.formato?.message}
            columnas="grid-cols-2"
          />
          <OptionGroup
            label="Doble cara"
            opciones={OPCIONES_SI_NO}
            value={dobleCara ? "SI" : "NO"}
            onChange={(valor) => asignar("dobleCara", valor === "SI")}
            columnas="grid-cols-2"
          />
        </div>

        <FormGrid className="sm:grid-cols-2">
          <FormField
            label="Cantidad"
            htmlFor="cantidad"
            required
            error={errors.cantidad?.message}
            hint="Talonarios o blocks"
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

          <div>
            <OptionGroup
              label="Partes"
              opciones={[
                ...PARTES_FIJAS.map((n) => ({ value: String(n), label: String(n) })),
                { value: "OTROS", label: "Otros" },
              ]}
              value={partesOtros ? "OTROS" : String(partes ?? "")}
              onChange={(valor) => valor && asignar("partes", valor === "OTROS" ? 5 : Number(valor))}
              error={errors.partes?.message}
              columnas="grid-cols-5"
            />
            {partesOtros && (
              <Input
                aria-label="Número de partes"
                className="mt-2"
                type="number"
                inputMode="numeric"
                min={5}
                max={10}
                {...register("partes", { valueAsNumber: true })}
              />
            )}
          </div>
        </FormGrid>
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · Numeración, perforación, engomado y laminado                    */
/* ------------------------------------------------------------------ */

export function AcabadosSection() {
  const { form } = usePapeleriaForm();
  const asignar = useAsignar();
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const [usaNumeracion, perforacion, perforacionOrientacion, engomado, laminado] = useWatch({
    control,
    name: ["usaNumeracion", "perforacion", "perforacionOrientacion", "engomado", "laminado"],
  });

  return (
    <FormSection
      index="03"
      title="Numeración y acabados"
      description="N°, perforación, engomado y laminado"
      icon={Hash}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <OptionGroup
            label="Numeración"
            opciones={OPCIONES_SI_NO}
            value={usaNumeracion ? "SI" : "NO"}
            onChange={(valor) => asignar("usaNumeracion", valor === "SI")}
            columnas="grid-cols-2 max-w-xs"
          />
          {usaNumeracion && (
            <FormGrid className="sm:grid-cols-3">
              <FormField label="Prefijo" htmlFor="numeracionPrefijo" error={errors.numeracionPrefijo?.message}>
                <Input id="numeracionPrefijo" placeholder="00-" {...register("numeracionPrefijo")} />
              </FormField>
              <FormField label="N° desde" htmlFor="numeracionDesde" required error={errors.numeracionDesde?.message}>
                <Input
                  id="numeracionDesde"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  {...register("numeracionDesde", { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="N° hasta" htmlFor="numeracionHasta" required error={errors.numeracionHasta?.message}>
                <Input
                  id="numeracionHasta"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  {...register("numeracionHasta", { valueAsNumber: true })}
                />
              </FormField>
            </FormGrid>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <OptionGroup
            label="Perforación"
            opciones={OPCIONES_SI_NO}
            value={perforacion ? "SI" : "NO"}
            onChange={(valor) => {
              asignar("perforacion", valor === "SI");
              if (valor !== "SI") asignar("perforacionOrientacion", undefined);
            }}
            columnas="grid-cols-2"
          />
          <OptionGroup
            label="Sentido de la perforación"
            opciones={OPCIONES_PERFORACION.map((opcion) => ({ ...opcion, disabled: !perforacion }))}
            value={perforacionOrientacion}
            onChange={(valor) => asignar("perforacionOrientacion", valor)}
            error={errors.perforacionOrientacion?.message}
            columnas="grid-cols-2"
          />
        </div>

        <OptionGroup
          label="Engomado"
          opciones={OPCIONES_ENGOMADO}
          value={engomado}
          onChange={(valor) => asignar("engomado", valor)}
          vaciable
        />
        <OptionGroup
          label="Laminado"
          opciones={OPCIONES_LAMINADO}
          value={laminado}
          onChange={(valor) => asignar("laminado", valor)}
          vaciable
          columnas="grid-cols-2 max-w-sm"
        />
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · Color de tinta                                                 */
/* ------------------------------------------------------------------ */

export function TintasSection() {
  const { form } = usePapeleriaForm();
  const asignar = useAsignar();
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const coloresTinta = useWatch({ control, name: "coloresTinta" }) ?? [];

  return (
    <FormSection index="04" title="Color de tinta" description="Marca uno o varios" icon={Palette}>
      <div className="space-y-4">
        <OptionGroup<ColorTinta>
          multiple
          label="Color tinta"
          opciones={OPCIONES_TINTA}
          value={coloresTinta}
          onChange={(valor) => asignar("coloresTinta", valor)}
          error={errors.coloresTinta?.message}
        />
        {(coloresTinta.includes("PANTONE") || coloresTinta.includes("OTRO")) && (
          <FormGrid>
            {coloresTinta.includes("PANTONE") && (
              <FormField label="Referencia Pantone" htmlFor="pantone" required error={errors.pantone?.message}>
                <Input id="pantone" placeholder="Ej. 186 C" {...register("pantone")} />
              </FormField>
            )}
            {coloresTinta.includes("OTRO") && (
              <FormField label="Otro color" htmlFor="colorTintaOtro" required error={errors.colorTintaOtro?.message}>
                <Input id="colorTintaOtro" placeholder="Ej. Dorado" {...register("colorTintaOtro")} />
              </FormField>
            )}
          </FormGrid>
        )}
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 05 · Papel, gramaje y tamaño                                        */
/* ------------------------------------------------------------------ */

export function PapelSection() {
  const { form } = usePapeleriaForm();
  const asignar = useAsignar();
  const { papelDisponible, isLoading } = useDisponibilidad();
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const [tipoPapel, tamano] = useWatch({ control, name: ["tipoPapel", "tamano"] });

  const opcionesPapel: Opcion<NonNullable<typeof tipoPapel>>[] = [
    ...TIPOS_PAPEL.map((tipo) => {
      const disponible = papelDisponible(tipo);
      return {
        value: tipo,
        label: TIPO_PAPEL_LABEL[tipo],
        hint: isLoading ? "Consultando..." : disponible ? "En existencia" : "Sin existencia",
        disabled: !isLoading && !disponible,
      };
    }),
    { value: "OTRO", label: "Otro:" },
  ];

  return (
    <FormSection
      index="05"
      title="Papel y tamaño"
      description="Solo se ofrecen los papeles con existencia en almacén"
      icon={Layers}
    >
      <div className="space-y-5">
        <OptionGroup
          label="Papel"
          opciones={opcionesPapel}
          value={tipoPapel}
          onChange={(valor) => valor && asignar("tipoPapel", valor)}
          error={errors.tipoPapel?.message}
          columnas="grid-cols-2 sm:grid-cols-4"
        />
        <FormGrid>
          {tipoPapel === "OTRO" && (
            <FormField label="Otro papel" htmlFor="tipoPapelOtro" required error={errors.tipoPapelOtro?.message}>
              <Input id="tipoPapelOtro" placeholder="Ej. Kraft" {...register("tipoPapelOtro")} />
            </FormField>
          )}
          <FormField label="Gramaje" htmlFor="gramaje" error={errors.gramaje?.message} hint="g/m²">
            <Input
              id="gramaje"
              type="number"
              inputMode="numeric"
              min={30}
              max={400}
              placeholder="Ej. 75"
              {...register("gramaje", { valueAsNumber: true })}
            />
          </FormField>
        </FormGrid>

        <OptionGroup
          label="Tamaño"
          opciones={OPCIONES_TAMANO}
          value={tamano}
          onChange={(valor) => valor && asignar("tamano", valor)}
          error={errors.tamano?.message}
        />
        {tamano === "OTRO" && (
          <FormField label="Otro tamaño" htmlFor="tamanoOtro" required error={errors.tamanoOtro?.message}>
            <Input id="tamanoOtro" placeholder="Ej. 10 × 15 cm" {...register("tamanoOtro")} />
          </FormField>
        )}
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* 06 · Observaciones y entrega                                        */
/* ------------------------------------------------------------------ */

export function EntregaSection() {
  const { form } = usePapeleriaForm();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <FormSection index="06" title="Observaciones y entrega" icon={StickyNote}>
      <div className="space-y-4">
        <FormField
          label="Observaciones"
          htmlFor="observaciones"
          error={errors.observaciones?.message}
          hint="Opcional · máx. 500 caracteres"
        >
          <Textarea id="observaciones" rows={3} {...register("observaciones")} />
        </FormField>
        <FormField label="Fecha de entrega" htmlFor="fechaEntrega" required error={errors.fechaEntrega?.message}>
          <div className="relative max-w-xs">
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
      </div>
    </FormSection>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen (vista previa del formato impreso)                          */
/* ------------------------------------------------------------------ */

export function ResumenSection() {
  const { form, clientes } = usePapeleriaForm();
  const valores = useWatch({ control: form.control });
  const cliente = clientes.find((item) => item.id === valores.clienteId);

  // Solo se muestra el detalle y el monto cuando la ficha es válida: la vista
  // previa usa exactamente lo que se enviará a planta.
  const valida = papeleriaSchema.safeParse(valores);
  const orden = valida.success ? ordenDesdePapeleria(valida.data) : null;
  const monto = valida.success ? estimarPapeleria(valida.data) : null;
  const filas = orden ? resumenEspecificaciones(orden.especificaciones ?? {}) : [];

  const obligatorios = [
    valores.clienteId,
    valores.nombreDocumento?.trim(),
    valores.tipoDocumento,
    valores.formato,
    valores.coloresTinta?.length,
    valores.tipoPapel,
    valores.tamano,
    valores.fechaEntrega,
  ];
  const completados = obligatorios.filter(Boolean).length;

  return (
    <aside className="overflow-hidden rounded-xl bg-markenny-ink text-white shadow-raised">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            {EMPRESA.nombre} · {EMPRESA.rif}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Borrador
          </span>
        </div>
        <p className="mt-2 font-display text-xl font-semibold uppercase leading-tight tracking-wide">
          {valores.nombreDocumento?.trim() || "Nueva orden de papelería"}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
          <Building2 className="h-3 w-3" />
          {cliente ? `${cliente.nombre} · ${cliente.telefono}` : "Cliente sin seleccionar"}
        </p>
      </div>

      <div className="space-y-2.5 px-5 py-4 text-xs">
        {filas.length === 0 ? (
          <p className="text-white/45">Completa los campos obligatorios para ver la orden.</p>
        ) : (
          filas.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="flex items-start justify-between gap-3">
              <span className="text-white/45">{etiqueta}</span>
              <span className="max-w-[62%] text-right font-medium">{valor}</span>
            </div>
          ))
        )}
        {orden && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/45">Cantidad</span>
              <span className="font-medium tabular-nums">{formatNumber(orden.cantidad)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/45">Entrega</span>
              <span className="font-medium">{formatDate(orden.fechaEntrega)}</span>
            </div>
          </>
        )}
        <div className="flex items-end justify-between gap-3 pt-2">
          <span className="text-white/45">Recibí conforme</span>
          <span className="h-4 w-32 border-b border-white/30" aria-hidden />
        </div>
      </div>

      <div className="mx-5 h-px bg-white/10" />

      <div className="px-5 py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">Total estimado</p>
            <p className="mt-1 font-display text-3xl font-semibold leading-none tabular-nums">
              {monto ? formatCurrency(monto.total) : "—"}
            </p>
          </div>
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <p className="mt-2 text-[10px] text-white/40">USD · no incluye IVA</p>
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
  const { form, isSubmitting, onCancel } = usePapeleriaForm();
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
        <p className={cn("flex items-start gap-1.5 text-[11px] leading-snug text-destructive")}>
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
