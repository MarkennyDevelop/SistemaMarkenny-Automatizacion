import { useMemo } from "react";
import { ArrowLeft, Building2, FileText, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ACABADOS, SUSTRATOS } from "@/shared/catalogos";
import type { NuevaOrdenTrabajo } from "@/shared/domain";
import { OrdenTrabajoForm } from "../components/orden-trabajo/OrdenTrabajoForm";
import { useClientes } from "../hooks/useClientes";
import { useCrearOrdenTrabajo } from "../hooks/useOrdenesTrabajo";
import { estimarMontoOrden } from "../lib/cotizador";
import type { OrdenTrabajoFormValues } from "../types/schemas";

function fechaEnDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export function NuevaOrdenTrabajoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: clientes = [], isLoading } = useClientes();
  const crearOrden = useCrearOrdenTrabajo();

  const clientePreseleccionado = searchParams.get("cliente") ?? "";

  const defaultValues = useMemo<Partial<OrdenTrabajoFormValues>>(
    () => ({
      clienteId: clientePreseleccionado,
      fechaEntrega: fechaEnDias(7),
    }),
    [clientePreseleccionado],
  );

  const handleSubmit = async (values: OrdenTrabajoFormValues) => {
    const sustrato = SUSTRATOS.find((item) => item.id === values.sustratoId);
    const acabados = values.acabados.reduce<string[]>((lista, id) => {
      const nombre = ACABADOS.find((item) => item.id === id)?.nombre;
      if (nombre) lista.push(nombre);
      return lista;
    }, []);
    const tintas = [
      ...(values.tintasTiro > 0 ? ["CMYK"] : []),
      ...values.tintasPantone,
    ];

    const monto = estimarMontoOrden({
      tecnologia: values.tecnologia,
      cantidad: values.cantidad,
      anchoMm: values.anchoMm,
      altoMm: values.altoMm,
      tintasTiro: values.tintasTiro,
      tintasRetiro: values.tintasRetiro,
      sustratoId: values.sustratoId,
      acabados: values.acabados,
    });

    const payload: NuevaOrdenTrabajo = {
      clienteId: values.clienteId,
      producto: values.producto,
      descripcion:
        [values.descripcion, values.observaciones].filter(Boolean).join(" · ") ||
        "Sin descripción técnica",
      tecnologia: values.tecnologia,
      prioridad: values.prioridad,
      maquina: values.maquina,
      cantidad: values.cantidad,
      fechaEntrega: new Date(`${values.fechaEntrega}T12:00:00`).toISOString(),
      montoTotal: monto.total,
      sustrato: sustrato?.nombre ?? "Sustrato por definir",
      tintas,
      acabados,
    };

    try {
      const orden = await crearOrden.mutateAsync(payload);
      toast.success(`Orden ${orden.codigo} creada`, {
        description: `${orden.producto} · ingresa a la fase En Proceso`,
      });
      navigate("/ventas/ordenes");
    } catch (error) {
      toast.error("No se pudo generar la orden", {
        description:
          error instanceof Error ? error.message : "Verifica la conexión con el servidor.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ventas · Orden de trabajo"
        title="Nueva orden de producción"
        description="Construye la ficha técnica del trabajo. Las secciones comparten el mismo estado y el resumen se recalcula en vivo."
        actions={
          <Button variant="outline" asChild>
            <Link to="/ventas/ordenes">
              <ArrowLeft className="h-4 w-4" />
              Volver al listado
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-dashed border-border bg-card/60 px-4 py-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Código asignado al guardar
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          La orden reserva sustrato automáticamente
        </span>
        <span className="ml-auto hidden font-medium text-foreground sm:inline">
          {crearOrden.isPending ? "Guardando..." : `${clientes.length} clientes disponibles`}
        </span>
      </div>

      {isLoading ? (
        <Card className="flex h-72 flex-col items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Cargando catálogo de clientes...</p>
        </Card>
      ) : (
        <OrdenTrabajoForm.Root
          clientes={clientes}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/ventas/ordenes")}
          isSubmitting={crearOrden.isPending}
          defaultValues={defaultValues}
        >
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <OrdenTrabajoForm.ClienteProducto />
              <OrdenTrabajoForm.Especificaciones />
              <OrdenTrabajoForm.Sustrato />
              <OrdenTrabajoForm.Tintas />
              <OrdenTrabajoForm.Acabados />
            </div>

            <div className="space-y-4 xl:sticky xl:top-24">
              <OrdenTrabajoForm.Resumen />
              <OrdenTrabajoForm.Actions />
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
                <p className="font-semibold uppercase tracking-wide text-foreground">
                  Estimación referencial
                </p>
                <p className="mt-1">
                  El motor de costos aplica mermas por tecnología, planchas y tiempo
                  de máquina, con un margen comercial del 35%. Pre-prensa valida la
                  disponibilidad final antes de imprimir.
                </p>
              </div>
            </div>
          </div>
        </OrdenTrabajoForm.Root>
      )}
    </div>
  );
}
