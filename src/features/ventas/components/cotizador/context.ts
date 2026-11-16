import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CotizacionFormValues } from "../../types/schemas";

export interface CotizadorContextValue {
  form: UseFormReturn<CotizacionFormValues>;
}

export const CotizadorContext = React.createContext<CotizadorContextValue | null>(null);

export function useCotizadorForm() {
  const context = React.useContext(CotizadorContext);
  if (!context) {
    throw new Error(
      "Los componentes de CotizadorForm deben renderizarse dentro de <CotizadorForm.Root>",
    );
  }
  return context;
}
