import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { Cliente } from "@/shared/domain";
import type { OrdenTrabajoFormValues } from "../../types/schemas";

export interface OrdenTrabajoFormContextValue {
  form: UseFormReturn<OrdenTrabajoFormValues>;
  clientes: Cliente[];
  isSubmitting: boolean;
  onCancel?: () => void;
}

export const OrdenTrabajoFormContext =
  React.createContext<OrdenTrabajoFormContextValue | null>(null);

export function useOrdenTrabajoForm() {
  const context = React.useContext(OrdenTrabajoFormContext);
  if (!context) {
    throw new Error(
      "Los componentes de OrdenTrabajoForm deben renderizarse dentro de <OrdenTrabajoForm.Root>",
    );
  }
  return context;
}
