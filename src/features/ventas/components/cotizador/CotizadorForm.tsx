import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  COTIZACION_DEFAULTS,
  cotizacionSchema,
  type CotizacionFormValues,
} from "../../types/schemas";
import { CotizadorContext } from "./context";
import {
  AcabadosSection,
  MargenSection,
  ResumenCotizacion,
  SustratoSection,
  TecnologiaSection,
  TirajeSection,
} from "./sections";

interface CotizadorFormRootProps {
  children: React.ReactNode;
  defaultValues?: Partial<CotizacionFormValues>;
  className?: string;
}

/**
 * Compound Component del Cotizador.
 * El contexto comparte el formulario (React Hook Form) entre secciones;
 * el resumen consume el mismo estado y recalcula el precio en vivo.
 */
function CotizadorFormRoot({
  children,
  defaultValues,
  className,
}: CotizadorFormRootProps) {
  const form = useForm<CotizacionFormValues>({
    resolver: zodResolver(cotizacionSchema),
    defaultValues: { ...COTIZACION_DEFAULTS, ...defaultValues },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const contextValue = React.useMemo(() => ({ form }), [form]);

  return (
    <FormProvider {...form}>
      <CotizadorContext.Provider value={contextValue}>
        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className={cn("space-y-5", className)}
        >
          {children}
        </form>
      </CotizadorContext.Provider>
    </FormProvider>
  );
}

CotizadorFormRoot.displayName = "CotizadorForm.Root";

export const CotizadorForm = Object.assign(CotizadorFormRoot, {
  Root: CotizadorFormRoot,
  Tecnologia: TecnologiaSection,
  Tiraje: TirajeSection,
  Sustrato: SustratoSection,
  Acabados: AcabadosSection,
  Margen: MargenSection,
  Resumen: ResumenCotizacion,
});
