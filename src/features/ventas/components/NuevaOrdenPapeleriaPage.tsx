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
import type { PapeleriaFormValues } from "../types/schemas";
import { PapeleriaForm } from "./papeleria/PapeleriaForm";
import { TipoTrabajoTabs } from "./TipoTrabajoTabs";

function fechaEnDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export function NuevaOrdenPapeleriaPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { data: clientes = [], isLoading: cargandoClientes } = useClientes();
  const crear = useCrearOrdenTrabajo();

  const handleSubmit = async (values: PapeleriaFormValues) => {
    const sustrato = SUSTRATOS.find((item) => item.id === values.sustratoId);
    const monto = estimarMontoOrden({
      tecnologia: values.tecnologia,
      cantidad: values.cantidad,
      anchoMm: values.anchoMm,
      altoMm: values.altoMm,
      tintasTiro: values.tintasTiro,
      tintasRetiro: 0,
      sustratoId: values.sustratoId,
      acabados: values.acabados,
    });

    const orden: NuevaOrdenTrabajo = {
      clienteId: values.clienteId,
      producto: values.producto,
      descripcion: values.descripcion ?? "",
      tecnologia: values.tecnologia,
      prioridad: values.prioridad,
      maquina: values.maquina,
      cantidad: values.cantidad,
      fechaEntrega: values.fechaEntrega,
      montoTotal: monto.total,
      sustrato: sustrato?.nombre ?? "Por definir",
      tintas:
        values.tintasPantone.length > 0 ? values.tintasPantone : ["CMYK proceso"],
      acabados: values.acabados,
      categoriaTrabajo: "PAPELERIA",
      vendedor: usuario?.nombre,
      especificaciones: {
        tipoPapeleria: values.tipoPapeleria,
        partes: values.partes,
        numeracionDesde: values.usaNumeracion ? values.numeracionDesde : undefined,
        numeracionHasta: values.usaNumeracion ? values.numeracionHasta : undefined,
        numeracionPrefijo: values.usaNumeracion
          ? values.numeracionPrefijo || undefined
          : undefined,
        gramaje: sustrato?.gramaje,
        pantones: values.tintasPantone,
        observaciones: values.observaciones || undefined,
      },
    };

    try {
      const creada = await crear.mutateAsync(orden);
      toast.success(`Orden ${creada.codigo} enviada a producción`, {
        description: "El taller ya recibe la ficha técnica y el vendedor puede seguir sus 4 fases.",
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
        title="Papelería corporativa"
        description="Ficha técnica del formato físico de Markenny: partes, numeración, papel, Pantone y acabados."
        actions={
          <Button variant="outline" asChild>
            <Link to="/ventas/ordenes">
              <ArrowLeft className="h-4 w-4" />
              Volver a órdenes
            </Link>
          </Button>
        }
      />

      <TipoTrabajoTabs activo="papeleria" />

      <PapeleriaForm.Root
        clientes={clientes}
        isSubmitting={crear.isPending || cargandoClientes}
        onCancel={() => navigate("/ventas/ordenes")}
        onSubmit={handleSubmit}
        defaultValues={{ fechaEntrega: fechaEnDias(7) }}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <PapeleriaForm.ClienteDocumento />
            <PapeleriaForm.Tiraje />
            <PapeleriaForm.Numeracion />
            <PapeleriaForm.Papel />
            <PapeleriaForm.Tintas />
            <PapeleriaForm.Acabados />
          </div>
          <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <PapeleriaForm.Resumen />
            <PapeleriaForm.Acciones />
          </div>
        </div>
      </PapeleriaForm.Root>
    </div>
  );
}
