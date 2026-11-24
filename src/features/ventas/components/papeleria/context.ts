import { createContext, useContext } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { Cliente } from "@/shared/domain";
import type { PapeleriaFormInput, PapeleriaFormValues } from "../../types/schemas";

export interface PapeleriaFormContextValue {
  form: UseFormReturn<PapeleriaFormInput, unknown, PapeleriaFormValues>;
  clientes: Cliente[];
  isSubmitting: boolean;
  onCancel?: () => void;
}

export const PapeleriaFormContext =
  createContext<PapeleriaFormContextValue | null>(null);

export function usePapeleriaForm() {
  const contexto = useContext(PapeleriaFormContext);
  if (!contexto) {
    throw new Error(
      "Los componentes de PapeleriaForm deben usarse dentro de <PapeleriaForm.Root>.",
    );
  }
  return contexto;
}
