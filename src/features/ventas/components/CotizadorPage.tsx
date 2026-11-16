import { Calculator, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CotizadorForm } from "./cotizador/CotizadorForm";

export function CotizadorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ventas · Motor de cálculo"
        title="Cotizador gráfico"
        description="Simula costos por tecnología con mermas, planchas, acabados y margen comercial. Cada tecnología aplica su propia estrategia de cálculo."
        actions={
          <>
            <Badge variant="outline" className="hidden sm:inline-flex">
              <Calculator className="h-3 w-3" />
              Strategy pattern
            </Badge>
            <Button variant="outline" asChild>
              <Link to="/ventas/nueva-orden">
                <Plus className="h-4 w-4" />
                Crear orden
              </Link>
            </Button>
          </>
        }
      />

      <CotizadorForm.Root>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <CotizadorForm.Tecnologia />
            <CotizadorForm.Tiraje />
            <CotizadorForm.Sustrato />
            <CotizadorForm.Acabados />
            <CotizadorForm.Margen />
          </div>
          <div className="space-y-4 xl:sticky xl:top-24">
            <CotizadorForm.Resumen />
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
              <p className="font-semibold uppercase tracking-wide text-foreground">
                Cómo se calcula
              </p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  Offset: planchas CTP + arreglo de prensa + 2% de merma de tiraje.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  Digital: costo por clic y merma fija de calibración.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  Gran formato: área en m² con 5% de desperdicio de material.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CotizadorForm.Root>
    </div>
  );
}
