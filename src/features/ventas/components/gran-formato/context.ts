import { createContext, useContext } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { Cliente } from "@/shared/domain";
import type { GranFormatoFormInput, GranFormatoFormValues } from "../../types/schemas";

export interface GranFormatoFormContextValue {
  form: UseFormReturn<GranFormatoFormInput, unknown, GranFormatoFormValues>;
  clientes: Cliente[];
  isSubmitting: boolean;
  onCancel?: () => void;
}

export const GranFormatoFormContext =
  createContext<GranFormatoFormContextValue | null>(null);

export function useGranFormatoForm() {
  const contexto = useContext(GranFormatoFormContext);
  if (!contexto) {
    throw new Error(
      "Los componentes de GranFormatoForm deben usarse dentro de <GranFormatoForm.Root>.",
    );
  }
  return contexto;
}
