import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  PackageCheck,
  Search,
  Stamp,
  Truck,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { diasHasta } from "@/lib/fechas";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { useOrdenesTrabajo } from "@/features/ventas";
import { mensajeDeError } from "@/shared/api/cliente";
import { PRODUCTO_TERMINADO_LABEL, type MaterialInventario, type ProductoTerminado } from "@/shared/domain";
import { RegistrarEntregaDialog } from "./RegistrarEntregaDialog";
import { RegistrarMovimientoDialog } from "./RegistrarMovimientoDialog";
import {
  useInventario,
  useProductosPendientes,
  useRegistrarEntrega,
  useRegistrarMovimiento,
} from "../hooks/useInventario";
import type { MovimientoFormValues } from "../types/schema";

export function SellosPage() {
  const { materiales, isLoading } = useInventario();
  const { data: ordenes = [] } = useOrdenesTrabajo();
  const { data: pendientes = [] } = useProductosPendientes();
  const registrar = useRegistrarMovimiento();
  const entregar = useRegistrarEntrega();
  const [entregaDe, setEntregaDe] = useState<ProductoTerminado | null>(null);

  const [tab, setTab] = useState("sellos");
  const [busqueda, setBusqueda] = useState("");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [materialInicial, setMaterialInicial] = useState<string | undefined>();

  const sellos = useMemo(
    () => materiales.filter((material) => material.categoria === "SELLO"),
    [materiales],
  );

  /**
   * Pedidos empaquetados que siguen en almacén (total o parcialmente). Salen
   * de la lista al registrar la entrega completa. Se cruzan con la orden para
   * mostrar fecha de entrega y monto.
   */
  const empaquetadas = useMemo(() => {
    const porId = new Map(ordenes.map((orden) => [orden.id, orden]));
    return pendientes
      .map((producto) => ({ producto, orden: producto.ordenId ? porId.get(producto.ordenId) : undefined }))
      .sort((a, b) =>
        (a.orden?.fechaEntrega ?? a.producto.ingresadoEn).localeCompare(b.orden?.fechaEntrega ?? b.producto.ingresadoEn),
      );
  }, [pendientes, ordenes]);

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return sellos;
    return sellos.filter(
      (material) =>
        material.nombre.toLowerCase().includes(termino) ||
        material.sku.toLowerCase().includes(termino) ||
        material.ubicacion.toLowerCase().includes(termino),
    );
  }, [sellos, busqueda]);

  const unidades = sellos.reduce((total, material) => total + material.stock, 0);
  const valor = sellos.reduce(
    (total, material) => total + material.stock * material.costoUnitario,
    0,
  );
  const criticos = sellos.filter(
    (material) => material.stock <= material.stockMinimo,
  ).length;

  const abrirSalida = (material?: MaterialInventario) => {
    setMaterialInicial(material?.id);
    setDialogoAbierto(true);
  };

  const handleSubmit = async (values: MovimientoFormValues) => {
    try {
      const movimiento = await registrar.mutateAsync({
        materialId: values.materialId,
        tipo: values.tipo,
        cantidad: values.cantidad,
        motivo: values.motivo,
      });
      toast.success(
        movimiento.tipo === "ENTRADA"
          ? "Entrada de almacén registrada"
          : "Salida de almacén registrada",
        {
          description: `${movimiento.materialNombre} · ${formatNumber(movimiento.cantidad)} unidades`,
        },
      );
      setDialogoAbierto(false);
    } catch (error) {
      toast.error("No se pudo registrar el movimiento", {
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Almacén · Producto terminado"
        title="Sellos y entregas"
        description="Productos terminados de Markenny en almacén sin entregar: pliegos de stickers, talonarios, blocks, sellos personalizados, pendones y viniles de rotulación."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/inventario">
                <ArrowLeft className="h-4 w-4" />
                Inventario general
              </Link>
            </Button>
            <Button onClick={() => abrirSalida()}>
              <Truck className="h-4 w-4" />
              Registrar despacho
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Referencias de sellos</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {String(sellos.length).padStart(2, "0")}
            </p>
            <p className="text-[9px] text-muted-foreground">SKU en almacén</p>
          </div>
          <Stamp className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Unidades sin entregar</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {formatNumber(unidades)}
            </p>
            <p className="text-[9px] text-muted-foreground">producto terminado</p>
          </div>
          <PackageCheck className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Valor en almacén</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {formatCurrency(valor)}
            </p>
            <p className="text-[9px] text-muted-foreground">costo de producción</p>
          </div>
          <Wallet className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Órdenes empaquetadas</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-primary">
              {String(empaquetadas.length).padStart(2, "0")}
            </p>
            <p className="text-[9px] text-muted-foreground">
              {criticos} referencia(s) bajo mínimo
            </p>
          </div>
          <Truck className="h-5 w-5 text-primary" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="sellos">
              Sellos
              <span className="ml-1.5 rounded-sm bg-muted px-1 text-[9px] tabular-nums">
                {sellos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="ordenes">
              Órdenes empaquetadas
              <span className="ml-1.5 rounded-sm bg-muted px-1 text-[9px] tabular-nums">
                {empaquetadas.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {tab === "sellos" && (
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar sello, SKU o ubicación..."
                className="pl-9"
                aria-label="Buscar sellos"
              />
            </div>
          )}
        </div>

        <TabsContent value="sellos" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="h-40 animate-pulse bg-muted/40" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <Boxes className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Sin sellos en almacén</p>
              <p className="text-xs text-muted-foreground">
                Cuando producción empaquete sellos aparecerán aquí para su entrega.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtrados.map((material) => {
                const critico = material.stock <= material.stockMinimo;
                return (
                  <Card
                    key={material.id}
                    className={cn(
                      "flex flex-col p-4",
                      critico && "border-primary/35",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold">
                          {material.nombre}
                        </p>
                        <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                          {material.sku} · lote {material.lote}
                        </p>
                      </div>
                      <Badge variant={critico ? "destructive" : "default"} className="shrink-0">
                        {critico ? "Bajo mínimo" : "Disponible"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="font-display text-3xl font-semibold leading-none tabular-nums">
                          {formatNumber(material.stock)}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {material.unidad} · mín. {formatNumber(material.stockMinimo)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold tabular-nums">
                          {formatCurrency(material.stock * material.costoUnitario)}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {formatCurrency(material.costoUnitario)} / {material.unidad}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Stamp className="h-3 w-3 shrink-0" />
                      <span className="truncate">{material.ubicacion}</span>
                      <span className="ml-auto shrink-0">
                        {formatDate(material.actualizadoEn, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => abrirSalida(material)}
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Despachar
                      </Button>
                      {!critico && (
                        <span className="inline-flex items-center gap-1 text-[9.5px] text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          Listo
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-border px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide text-foreground">
              Control de producto terminado
            </span>{" "}
            · Los sellos se registran como stock propio porque se producen por lote y se
            entregan contra pedido. Cada despacho genera un movimiento de salida
            auditable.
          </div>
        </TabsContent>

        <TabsContent value="ordenes" className="space-y-4">
          {empaquetadas.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <PackageCheck className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Sin órdenes empaquetadas</p>
              <p className="text-xs text-muted-foreground">
                Cuando producción complete las cuatro fases, la orden aparecerá aquí
                pendiente de entrega.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {empaquetadas.map(({ producto, orden }) => {
                const vencida = orden ? diasHasta(orden.fechaEntrega) < 0 : false;
                return (
                  <Card key={producto.id} className="flex flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold text-primary">
                        {producto.codigoOrden ?? "Sin orden"}
                      </span>
                      <Badge variant={vencida ? "destructive" : "solid"}>
                        {vencida
                          ? "Entrega vencida"
                          : producto.estadoEntrega === "PARCIAL"
                            ? "Entrega parcial"
                            : "Lista para entrega"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {PRODUCTO_TERMINADO_LABEL[producto.tipo]}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] font-semibold leading-snug">
                      {producto.descripcion}
                    </p>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                      {producto.clienteNombre ?? "—"}
                    </p>

                    <dl className="mt-3 space-y-1.5 text-[10.5px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Pendientes</dt>
                        <dd className="font-medium tabular-nums">
                          {formatNumber(producto.cantidadPendiente)} / {formatNumber(producto.cantidad)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Entrega</dt>
                        <dd className="font-medium">{orden ? formatDate(orden.fechaEntrega) : "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Monto</dt>
                        <dd className="font-semibold tabular-nums">
                          {orden ? formatCurrency(orden.montoTotal) : "—"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-3">
                      <Button size="sm" className="flex-1" onClick={() => setEntregaDe(producto)}>
                        <Truck className="h-3.5 w-3.5" />
                        Registrar entrega
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-border px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
            Las órdenes en fase <span className="font-semibold text-foreground">Empaquetado</span>{" "}
            permanecen en almacén hasta registrar la entrega al cliente (total o parcial).
            Al entregar todo, la orden queda como entregada en el seguimiento del vendedor.
          </div>
        </TabsContent>
      </Tabs>

      <RegistrarEntregaDialog
        producto={entregaDe}
        isSubmitting={entregar.isPending}
        onOpenChange={(abierto) => !abierto && setEntregaDe(null)}
        onSubmit={async ({ cantidad, recibidoPor }) => {
          if (!entregaDe) return;
          try {
            const actualizado = await entregar.mutateAsync({ productoId: entregaDe.id, cantidad, recibidoPor });
            toast.success(
              actualizado.estadoEntrega === "ENTREGADO" ? "Pedido entregado" : "Entrega parcial registrada",
              {
                description: `${actualizado.codigoOrden ?? actualizado.descripcion} · ${formatNumber(cantidad)} unidades`,
              },
            );
          } catch (error) {
            toast.error("No se pudo registrar la entrega", { description: mensajeDeError(error) });
            throw error;
          }
        }}
      />

      <RegistrarMovimientoDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        materiales={sellos}
        materialInicial={materialInicial}
        tipoInicial="SALIDA"
        isSubmitting={registrar.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
