import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/shared/domain";
import {
  ORDEN_TRABAJO_DEFAULTS,
  ordenTrabajoSchema,
  type OrdenTrabajoFormValues,
} from "../../types/schemas";
import { OrdenTrabajoFormContext } from "./context";
import {
  AcabadosSection,
  Actions,
  ClienteProductoSection,
  EspecificacionesSection,
  ResumenSection,
  SustratoSection,
  TintasSection,
} from "./sections";

export interface OrdenTrabajoFormRootProps {
  clientes: Cliente[];
  onSubmit: (values: OrdenTrabajoFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<OrdenTrabajoFormValues>;
  className?: string;
  children: React.ReactNode;
}

/**
 * Compound Component raíz de la Orden de Trabajo.
 *
 * El contexto implícito (React Context + React Hook Form) permite que cada
 * sección —cliente, sustrato, tintas, acabados y resumen— lea y escriba el
 * mismo estado sin prop-drilling. El consumidor decide el orden y el layout.
 *
 * Ejemplo:
 *   <OrdenTrabajoForm.Root clientes={clientes} onSubmit={guardar}>
 *     <OrdenTrabajoForm.ClienteProducto />
 *     <OrdenTrabajoForm.Tintas />
 *     <OrdenTrabajoForm.Resumen />
 *   </OrdenTrabajoForm.Root>
 */
function OrdenTrabajoFormRoot({
  clientes,
  onSubmit,
  onCancel,
  isSubmitting = false,
  defaultValues,
  className,
  children,
}: OrdenTrabajoFormRootProps) {
  const form = useForm<OrdenTrabajoFormValues>({
    resolver: zodResolver(ordenTrabajoSchema),
    defaultValues: {
      ...ORDEN_TRABAJO_DEFAULTS,
      ...defaultValues,
    },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const contextValue = React.useMemo(
    () => ({ form, clientes, isSubmitting, onCancel }),
    [form, clientes, isSubmitting, onCancel],
  );

  return (
    <FormProvider {...form}>
      <OrdenTrabajoFormContext.Provider value={contextValue}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn("space-y-5", className)}
        >
          {children}
        </form>
      </OrdenTrabajoFormContext.Provider>
    </FormProvider>
  );
}

OrdenTrabajoFormRoot.displayName = "OrdenTrabajoForm.Root";

export const OrdenTrabajoForm = Object.assign(OrdenTrabajoFormRoot, {
  Root: OrdenTrabajoFormRoot,
  ClienteProducto: ClienteProductoSection,
  Especificaciones: EspecificacionesSection,
  Sustrato: SustratoSection,
  Tintas: TintasSection,
  Acabados: AcabadosSection,
  Resumen: ResumenSection,
  Actions,
});

export type OrdenTrabajoFormCompound = typeof OrdenTrabajoForm;
