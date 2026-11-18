import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { SUSTRATOS } from "@/shared/catalogos";
import type { NuevaOrdenTrabajo } from "@/shared/domain";
import { useClientes } from "../hooks/useClientes";
import { useCrearOrdenTrabajo } from "../hooks/useOrdenesTrabajo";
import { estimarMontoOrden } from "../lib/cotizador";
import type { GranFormatoFormValues } from "../types/schemas";
import { aMilimetros, GranFormatoForm } from "./gran-formato/GranFormatoForm";
import { TipoTrabajoTabs } from "./TipoTrabajoTabs";

function fechaEnDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export function NuevaOrdenGranFormatoPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { data: clientes = [], isLoading: cargandoClientes } = useClientes();
  const crear = useCrearOrdenTrabajo();

  const handleSubmit = async (values: GranFormatoFormValues) => {
    const sustrato = SUSTRATOS.find((item) => item.id === values.sustratoId);
    const anchoMm = aMilimetros(values.ancho, values.unidadDimension);
    const altoMm = aMilimetros(values.alto, values.unidadDimension);
    const monto = estimarMontoOrden({
      tecnologia: "GRAN_FORMATO",
      cantidad: values.cantidad,
      anchoMm,
      altoMm,
      tintasTiro: 4,
      tintasRetiro: 0,
      sustratoId: values.sustratoId,
      acabados: values.acabados,
    });

    const orden: NuevaOrdenTrabajo = {
      clienteId: values.clienteId,
      producto: values.producto,
      descripcion: values.descripcion ?? "",
      tecnologia: "GRAN_FORMATO",
      prioridad: values.prioridad,
      maquina: values.maquina,
      cantidad: values.cantidad,
      fechaEntrega: values.fechaEntrega,
      montoTotal: monto.total,
      sustrato: sustrato?.nombre ?? "Por definir",
      tintas: ["CMYK alta cobertura"],
      acabados: values.acabados,
      categoriaTrabajo: "GRAN_FORMATO",
      vendedor: usuario?.nombre,
      especificaciones: {
        tipoGranFormato: values.tipoGranFormato,
        ancho: values.ancho,
        alto: values.alto,
        unidadDimension: values.unidadDimension,
        resolucionDpi: values.resolucionDpi,
        gramaje: sustrato?.gramaje,
        observaciones: values.observaciones || undefined,
      },
    };

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
