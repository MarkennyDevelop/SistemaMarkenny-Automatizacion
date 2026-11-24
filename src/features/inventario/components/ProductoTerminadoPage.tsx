import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, PackageCheck, Search, Truck, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrdenesTrabajo } from "@/features/ventas";
import { diasHasta } from "@/lib/fechas";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { mensajeDeError } from "@/shared/api/cliente";
import {
  PRODUCTO_TERMINADO_LABEL,
  type ProductoTerminado,
  type ProductoTerminadoTipo,
} from "@/shared/domain";
import { RegistrarEntregaDialog } from "./RegistrarEntregaDialog";
import { useProductosPendientes, useRegistrarEntrega } from "../hooks/useInventario";

type FiltroTipo = ProductoTerminadoTipo | "TODOS";

/**
 * Producto terminado: órdenes de trabajo en fase EMPAQUETADO que siguen en
 * almacén pendientes de entrega al cliente. El servidor ya excluye fases
 * previas, registros sin orden y lo entregado; aquí se descarta además
 * cualquier orden cuya fase local no sea EMPAQUETADO (caché desfasada).
 * Los sellos vírgenes son materia prima y viven en Inventario.
 */
export function ProductoTerminadoPage() {
  const { data: pendientes = [], isLoading, isError, refetch } = useProductosPendientes();
  const { data: ordenes = [] } = useOrdenesTrabajo();
  const entregar = useRegistrarEntrega();
  const [entregaDe, setEntregaDe] = useState<ProductoTerminado | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("TODOS");

  const empaquetadas = useMemo(() => {
    const porId = new Map(ordenes.map((orden) => [orden.id, orden]));
    return pendientes
      .map((producto) => ({ producto, orden: producto.ordenId ? porId.get(producto.ordenId) : undefined }))
      .filter(
        ({ producto, orden }) =>
          producto.ordenId !== null &&
          producto.estadoEntrega !== "ENTREGADO" &&
          (!orden || orden.fase === "EMPAQUETADO"),
      )
      .sort((a, b) =>
        (a.orden?.fechaEntrega ?? a.producto.ingresadoEn).localeCompare(b.orden?.fechaEntrega ?? b.producto.ingresadoEn),
      );
  }, [pendientes, ordenes]);

  const tipos = useMemo(
    () => [...new Set(empaquetadas.map(({ producto }) => producto.tipo))],
    [empaquetadas],
  );

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return empaquetadas.filter(
      ({ producto }) =>
        (tipo === "TODOS" || producto.tipo === tipo) &&
        (!termino ||
          [producto.codigoOrden, producto.descripcion, producto.clienteNombre].some((texto) =>
            texto?.toLowerCase().includes(termino),
          )),
    );
  }, [empaquetadas, busqueda, tipo]);

  const unidades = empaquetadas.reduce((total, { producto }) => total + producto.cantidadPendiente, 0);
  const valor = empaquetadas.reduce((total, { orden }) => total + (orden?.montoTotal ?? 0), 0);
  const vencidas = empaquetadas.filter(({ orden }) => orden && diasHasta(orden.fechaEntrega) < 0).length;

  const resumen = [
    { titulo: "Órdenes empaquetadas", valor: String(empaquetadas.length).padStart(2, "0"), nota: "pendientes de entrega", icono: PackageCheck, destacado: true },
    { titulo: "Unidades sin entregar", valor: formatNumber(unidades), nota: "en almacén", icono: Truck, destacado: false },
    { titulo: "Valor por entregar", valor: formatCurrency(valor), nota: "monto de las órdenes", icono: Wallet, destacado: false },
    { titulo: "Entregas vencidas", valor: String(vencidas).padStart(2, "0"), nota: "fecha de entrega pasada", icono: AlertTriangle, destacado: vencidas > 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Almacén · Producto terminado"
        title="Producto terminado"
        description="Órdenes de trabajo empaquetadas que esperan ser entregadas al cliente: pliegos de stickers, talonarios, blocks, tarjetas, sellos personalizados, pendones y viniles."
        actions={
          <Button variant="outline" asChild>
            <Link to="/inventario">
              <ArrowLeft className="h-4 w-4" />
              Inventario general
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {resumen.map(({ titulo, valor: cifra, nota, icono: Icono, destacado }) => (
          <div
            key={titulo}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="section-label">{titulo}</p>
              <p
                className={cn(
                  "mt-1 truncate font-display text-2xl font-semibold tabular-nums",
                  destacado && "text-primary",
                )}
              >
                {cifra}
              </p>
              <p className="text-[9px] text-muted-foreground">{nota}</p>
            </div>
            <Icono className={cn("h-5 w-5 shrink-0", destacado ? "text-primary" : "text-muted-foreground")} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
          {(["TODOS", ...tipos] as FiltroTipo[]).map((valor) => {
            const activo = tipo === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => setTipo(valor)}
                aria-pressed={activo}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  activo
                    ? "border-markenny-ink bg-markenny-ink text-white dark:border-white dark:bg-white dark:text-markenny-ink"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                )}
              >
                {valor === "TODOS" ? "Todos" : PRODUCTO_TERMINADO_LABEL[valor]}
              </button>
            );
          })}
        </div>
        <div className="relative min-w-0 sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar OT, cliente o producto..."
            className="pl-9"
            aria-label="Buscar producto terminado"
          />
        </div>
      </div>

      {isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium">No se pudo cargar el producto terminado</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-48 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <PackageCheck className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {empaquetadas.length === 0 ? "Sin órdenes empaquetadas" : "Ninguna orden coincide con la búsqueda"}
          </p>
          <p className="text-xs text-muted-foreground">
            Una orden aparece aquí cuando producción la marca como Empaquetado y sale al
            registrar la entrega completa al cliente.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map(({ producto, orden }) => {
            const vencida = orden ? diasHasta(orden.fechaEntrega) < 0 : false;
            return (
              <Card key={producto.id} className="flex flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-semibold text-primary">{producto.codigoOrden}</span>
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
                <p className="mt-0.5 line-clamp-2 text-[12.5px] font-semibold leading-snug">{producto.descripcion}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{producto.clienteNombre ?? "—"}</p>

                <dl className="mt-3 space-y-1.5 text-[10.5px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Pendientes</dt>
                    <dd className="font-medium tabular-nums">
                      {formatNumber(producto.cantidadPendiente)} / {formatNumber(producto.cantidad)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Fecha de entrega</dt>
                    <dd className="font-medium">{orden ? formatDate(orden.fechaEntrega) : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Ubicación</dt>
                    <dd className="truncate font-medium">{producto.ubicacion ?? "Por asignar"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Monto</dt>
                    <dd className="font-semibold tabular-nums">{orden ? formatCurrency(orden.montoTotal) : "—"}</dd>
                  </div>
                </dl>

                <div className="mt-auto pt-3">
                  <Button size="sm" className="w-full" onClick={() => setEntregaDe(producto)}>
                    <Truck className="h-3.5 w-3.5" />
                    Registrar entrega
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
              { description: `${actualizado.codigoOrden ?? actualizado.descripcion} · ${formatNumber(cantidad)} unidades` },
            );
          } catch (error) {
            toast.error("No se pudo registrar la entrega", { description: mensajeDeError(error) });
            throw error;
          }
        }}
      />
    </div>
  );
}
