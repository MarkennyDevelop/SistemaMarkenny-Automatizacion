import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/shared/domain";
import {
  PAPELERIA_DEFAULTS,
  papeleriaSchema,
  type PapeleriaFormInput,
  type PapeleriaFormValues,
} from "../../types/schemas";
import { PapeleriaFormContext } from "./context";
import {
  Acciones,
  ClienteDocumentoSection,
  EntregaSection,
  PapelSection,
  PresentacionSection,
  ResumenSection,
  TintasSection,
  TrabajoSection,
} from "./sections";

export interface PapeleriaFormRootProps {
  clientes: Cliente[];
  onSubmit: (values: PapeleriaFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<PapeleriaFormInput>;
  className?: string;
  children: React.ReactNode;
}

/**
 * Compound Component de la ficha de papelería corporativa.
 *
 * Reproduce la Orden de Trabajo impresa de MARKENNY, C.A.: cliente y
 * vendedor, tipo de trabajo, cantidad, vista, perforación, talonario o block,
 * doble cara, engomado, laminado, partes, N° de encabezado y de control,
 * color de tinta, papel con gramaje, tamaño, observaciones y entrega. Cada sección
 * lee y escribe el mismo formulario mediante contexto; el consumidor decide
 * el orden y el layout.
 */
function PapeleriaFormRoot({
  clientes,
  onSubmit,
  onCancel,
  isSubmitting = false,
  defaultValues,
  className,
  children,
}: PapeleriaFormRootProps) {
  const form = useForm<PapeleriaFormInput, unknown, PapeleriaFormValues>({
    resolver: zodResolver(papeleriaSchema),
    defaultValues: { ...PAPELERIA_DEFAULTS, ...defaultValues },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  // "Crear OT" desde Clientes: el id llega cuando la cartera termina de
  // cargar. Se aplica una sola vez por cliente y no pisa lo que el vendedor
  // ya eligió o borró a mano.
  const clienteInicial = defaultValues?.clienteId ?? "";
  React.useEffect(() => {
    if (clienteInicial && !form.getFieldState("clienteId").isDirty) {
      form.setValue("clienteId", clienteInicial);
    }
  }, [clienteInicial, form]);

  const contextValue = React.useMemo(
    () => ({ form, clientes, isSubmitting, onCancel }),
    [form, clientes, isSubmitting, onCancel],
  );

  return (
    <FormProvider {...form}>
      <PapeleriaFormContext.Provider value={contextValue}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn("space-y-5", className)}
        >
          {children}
        </form>
      </PapeleriaFormContext.Provider>
    </FormProvider>
  );
}

PapeleriaFormRoot.displayName = "PapeleriaForm.Root";

export const PapeleriaForm = Object.assign(PapeleriaFormRoot, {
  Root: PapeleriaFormRoot,
  ClienteDocumento: ClienteDocumentoSection,
  Trabajo: TrabajoSection,
  Presentacion: PresentacionSection,
  Tintas: TintasSection,
  Papel: PapelSection,
  Entrega: EntregaSection,
  Resumen: ResumenSection,
  Acciones,
});
