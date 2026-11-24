import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/shared/domain";
import {
  GRAN_FORMATO_DEFAULTS,
  granFormatoSchema,
  type GranFormatoFormValues,
} from "../../types/schemas";
import { GranFormatoFormContext } from "./context";
import {
  AcabadosSection,
  Acciones,
  DimensionesSection,
  PiezaSection,
  ResumenSection,
  SustratoSection,
} from "./sections";

export interface GranFormatoFormRootProps {
  clientes: Cliente[];
  onSubmit: (values: GranFormatoFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<GranFormatoFormValues>;
  className?: string;
  children: React.ReactNode;
}

/**
 * Compound Component de gran formato y adhesivos.
 *
 * Separado de la papelería corporativa porque su ficha técnica es distinta:
 * dimensiones en metros o centímetros, sustrato de lona/vinil y resolución
 * de salida. Comparte el mismo contrato de envío (NuevaOrdenTrabajo).
 */
function GranFormatoFormRoot({
  clientes,
  onSubmit,
  onCancel,
  isSubmitting = false,
  defaultValues,
  className,
  children,
}: GranFormatoFormRootProps) {
  const form = useForm<GranFormatoFormValues>({
    resolver: zodResolver(granFormatoSchema),
    defaultValues: { ...GRAN_FORMATO_DEFAULTS, ...defaultValues },
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
      <GranFormatoFormContext.Provider value={contextValue}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn("space-y-5", className)}
        >
          {children}
        </form>
      </GranFormatoFormContext.Provider>
    </FormProvider>
  );
}

GranFormatoFormRoot.displayName = "GranFormatoForm.Root";

export const GranFormatoForm = Object.assign(GranFormatoFormRoot, {
  Root: GranFormatoFormRoot,
  Pieza: PiezaSection,
  Dimensiones: DimensionesSection,
  Sustrato: SustratoSection,
  Acabados: AcabadosSection,
  Resumen: ResumenSection,
  Acciones,
});

