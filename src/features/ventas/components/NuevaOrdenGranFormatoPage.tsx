import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { fechaEnDias } from "@/lib/fechas";
import { useClientePreseleccionado } from "../hooks/useClientePreseleccionado";
import { useClientes } from "../hooks/useClientes";
import { useCrearOrdenTrabajo } from "../hooks/useOrdenesTrabajo";
import { useDisponibilidad } from "../hooks/useDisponibilidad";
import { ordenDesdeGranFormato } from "../lib/ordenes";
import type { GranFormatoFormValues } from "../types/schemas";
import { GranFormatoForm } from "./gran-formato/GranFormatoForm";
import { TipoTrabajoTabs } from "./TipoTrabajoTabs";

export function NuevaOrdenGranFormatoPage() {
  const navigate = useNavigate();
  const { data: clientes = [], isLoading: cargandoClientes } = useClientes();
  const crear = useCrearOrdenTrabajo();
  const { insumos } = useDisponibilidad();
  const clientePreseleccionado = useClientePreseleccionado(clientes);

  const handleSubmit = async (values: GranFormatoFormValues) => {
    try {
      const orden = ordenDesdeGranFormato(values, insumos);
      const creada = await crear.mutateAsync(orden);
      toast.success(`Orden ${creada.codigo} enviada a producción`, {
        description: "El taller recibe la pieza con medidas, sustrato y resolución de salida.",
      });
      navigate(`/ventas/seguimiento?ot=${creada.codigo}`);
    } catch (error) {
      toast.error("No se pudo generar la orden", {
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ventas · Nueva orden"
        title="Pendones, stickers y viniles"
        description="Ficha de gran formato: medidas, sustrato con existencia en almacén y corte con plotter."
        actions={
          <Button variant="outline" asChild>
            <Link to="/ventas/ordenes">
              <ArrowLeft className="h-4 w-4" />
              Volver a órdenes
            </Link>
          </Button>
        }
      />

      <TipoTrabajoTabs activo="gran-formato" />

      <GranFormatoForm.Root
        clientes={clientes}
        isSubmitting={crear.isPending || cargandoClientes}
        onCancel={() => navigate("/ventas/ordenes")}
        onSubmit={handleSubmit}
        defaultValues={{ clienteId: clientePreseleccionado, fechaEntrega: fechaEnDias(5) }}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <GranFormatoForm.Pieza />
            <GranFormatoForm.Dimensiones />
            <GranFormatoForm.Sustrato />
            <GranFormatoForm.Acabados />
          </div>
          <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <GranFormatoForm.Resumen />
            <GranFormatoForm.Acciones />
          </div>
        </div>
      </GranFormatoForm.Root>
    </div>
  );
}
