import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/shared/domain";
import {
  PAPELERIA_DEFAULTS,
  papeleriaSchema,
  type PapeleriaFormValues,
} from "../../types/schemas";
import { PapeleriaFormContext } from "./context";
import {
  AcabadosSection,
  Acciones,
  ClienteDocumentoSection,
  NumeracionSection,
  PapelSection,
  ResumenSection,
  TintasSection,
  TirajeSection,
} from "./sections";

export interface PapeleriaFormRootProps {
  clientes: Cliente[];
  onSubmit: (values: PapeleriaFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<PapeleriaFormValues>;
  className?: string;
  children: React.ReactNode;
}

/**
 * Compound Component de la ficha de papelería corporativa.
 *
 * Reproduce el formato físico de Markenny: cliente, tipo de documento,
 * partes, numeración, papel/gramaje, tinta Pantone y acabados. Cada sección
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
  const form = useForm<PapeleriaFormValues>({
    resolver: zodResolver(papeleriaSchema),
    defaultValues: { ...PAPELERIA_DEFAULTS, ...defaultValues },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

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
  Tiraje: TirajeSection,
  Numeracion: NumeracionSection,
  Papel: PapelSection,
  Tintas: TintasSection,
  Acabados: AcabadosSection,
  Resumen: ResumenSection,
  Acciones,
});
