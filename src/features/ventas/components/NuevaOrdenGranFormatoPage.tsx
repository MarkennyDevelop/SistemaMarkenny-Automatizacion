import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { fechaEnDias } from "@/lib/fechas";
import { useClientes } from "../hooks/useClientes";
import { useCrearOrdenTrabajo } from "../hooks/useOrdenesTrabajo";
import { ordenDesdeGranFormato } from "../lib/ordenes";
import type { GranFormatoFormValues } from "../types/schemas";
import { GranFormatoForm } from "./gran-formato/GranFormatoForm";
import { TipoTrabajoTabs } from "./TipoTrabajoTabs";

export function NuevaOrdenGranFormatoPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { data: clientes = [], isLoading: cargandoClientes } = useClientes();
  const crear = useCrearOrdenTrabajo();

  const handleSubmit = async (values: GranFormatoFormValues) => {
    const orden = ordenDesdeGranFormato(values, usuario?.nombre);

    try {
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
        title="Pendones y stickers"
        description="Ficha independiente para gran formato y adhesivos: dimensiones, sustrato de lona o vinil y resolución de impresión."
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
        defaultValues={{ fechaEntrega: fechaEnDias(5) }}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
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
