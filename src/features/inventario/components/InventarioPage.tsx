import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  PackageCheck,
  Search,
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
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { CATEGORIAS_INVENTARIO, type CategoriaInventario, type MaterialInventario } from "@/shared/domain";
import { CATEGORIA_LABEL, InventarioTable } from "./InventarioTable";
import { MovimientosPanel } from "./MovimientosPanel";
import { RegistrarMovimientoDialog } from "./RegistrarMovimientoDialog";
import { ConfigurarConsumoDialog } from "./ConfigurarConsumoDialog";
import {
  useConfigurarConsumo,
  useInventario,
  useMovimientos,
  useRegistrarMovimiento,
} from "../hooks/useInventario";
import type { MovimientoFormValues } from "../types/schema";

type FiltroCategoria = CategoriaInventario | "TODAS";

/** Solo materias primas de Markenny: el inventario no registra maquinaria ni equipos. */
const CATEGORIAS: FiltroCategoria[] = ["TODAS", ...CATEGORIAS_INVENTARIO];

export function InventarioPage() {
  const { materiales, porCategoria, criticos, valorInventario, isLoading, isError, refetch } =
    useInventario();
  const { movimientos, isLoading: cargandoMovimientos } = useMovimientos(12);
  const registrar = useRegistrarMovimiento();
  const configurar = useConfigurarConsumo();
  const [consumoDe, setConsumoDe] = useState<MaterialInventario | null>(null);

  const [tab, setTab] = useState("existencias");
  const [categoria, setCategoria] = useState<FiltroCategoria>("TODAS");
  const [busqueda, setBusqueda] = useState("");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [materialInicial, setMaterialInicial] = useState<string | undefined>();

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return materiales.filter((material) => {
      const coincideCategoria = categoria === "TODAS" || material.categoria === categoria;
      const coincideBusqueda =
        !termino ||
        material.nombre.toLowerCase().includes(termino) ||
        material.sku.toLowerCase().includes(termino) ||
        material.proveedor.toLowerCase().includes(termino);
      return coincideCategoria && coincideBusqueda;
    });
  }, [materiales, categoria, busqueda]);

  const sellos = materiales.filter((material) => material.categoria === "SELLO");
  const sellosValor = sellos.reduce(
    (total, material) => total + material.stock * material.costoUnitario,
    0,
  );

  const abrirMovimiento = (material?: MaterialInventario) => {
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
      toast.success("Movimiento registrado", {
        description: `${movimiento.materialNombre} · ${movimiento.tipo.toLowerCase()} de ${formatNumber(movimiento.cantidad)}`,
      });
    } catch (error) {
      toast.error("No se pudo registrar el movimiento", {
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
      throw error;
    }
  };

  const conteo = (valor: FiltroCategoria) =>
    valor === "TODAS" ? materiales.length : porCategoria[valor];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Almacén · Existencias"
        title="Inventario"
        description="Materias primas de Markenny: papeles, viniles, lonas y sellos. Sin maquinaria ni equipos."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/inventario/producto-terminado">
                <PackageCheck className="h-4 w-4" />
                Producto Terminado
              </Link>
            </Button>
            <Button variant="outline" onClick={() => void refetch()}>
              <Boxes className="h-4 w-4" />
              Actualizar
            </Button>
            <Button onClick={() => abrirMovimiento()}>
              <ArrowDownUp className="h-4 w-4" />
              Registrar movimiento
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Valor del inventario</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {formatCurrency(valorInventario)}
            </p>
          </div>
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">SKU registrados</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {String(materiales.length).padStart(2, "0")}
            </p>
          </div>
          <Boxes className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Bajo mínimo</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-primary">
              {String(criticos.length).padStart(2, "0")}
            </p>
          </div>
          <AlertTriangle className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Sellos (materia prima)</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {formatNumber(sellos.reduce((total, material) => total + material.stock, 0))}
            </p>
            <p className="text-[9px] text-muted-foreground">{formatCurrency(sellosValor)} en existencia</p>
          </div>
          <PackageCheck className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="existencias">Existencias</TabsTrigger>
            <TabsTrigger value="movimientos">
              Movimientos
              <span className="ml-1.5 rounded-sm bg-muted px-1 text-[9px] tabular-nums">
                {movimientos.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {tab === "existencias" && (
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar material, SKU o proveedor..."
                className="pl-9"
                aria-label="Buscar inventario"
              />
            </div>
          )}
        </div>

        <TabsContent value="existencias" className="space-y-4">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {CATEGORIAS.map((valor) => {
              const activo = categoria === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setCategoria(valor)}
                  aria-pressed={activo}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    activo
                      ? "border-markenny-ink bg-markenny-ink text-white dark:border-white dark:bg-white dark:text-markenny-ink"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                  )}
                >
                  {valor === "TODAS" ? "Todas" : CATEGORIA_LABEL[valor]}
                  <span
                    className={cn(
                      "rounded-sm px-1 text-[9px] tabular-nums",
                      activo ? "bg-white/15" : "bg-muted",
                    )}
                  >
                    {conteo(valor)}
                  </span>
                </button>
              );
            })}
            {categoria === "SELLO" && (
              <Badge variant="solid" className="ml-auto shrink-0">
                Sellos vírgenes · materia prima
              </Badge>
            )}
          </div>

          {isError ? (
            <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <AlertTriangle className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium">No se pudo cargar el inventario</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </Card>
          ) : (
            <InventarioTable
              materiales={filtrados}
              isLoading={isLoading}
              onRegistrar={abrirMovimiento}
              onConfigurarConsumo={setConsumoDe}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CATEGORIAS_INVENTARIO.map(
              (categoriaItem) => {
                const items = materiales.filter(
                  (material) => material.categoria === categoriaItem,
                );
                const valor = items.reduce(
                  (total, material) => total + material.stock * material.costoUnitario,
                  0,
                );
                return (
                  <div
                    key={categoriaItem}
                    className="rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <p className="section-label">{CATEGORIA_LABEL[categoriaItem]}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {formatCurrency(valor)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {items.length} SKU ·{" "}
                      {items.filter((item) => item.stock <= item.stockMinimo).length} en alerta
                    </p>
                  </div>
                );
              },
            )}
          </div>
        </TabsContent>

        <TabsContent value="movimientos">
          <MovimientosPanel movimientos={movimientos} isLoading={cargandoMovimientos} />
        </TabsContent>
      </Tabs>

      <ConfigurarConsumoDialog
        material={consumoDe}
        isSubmitting={configurar.isPending}
        onOpenChange={(abierto) => !abierto && setConsumoDe(null)}
        onSubmit={async (datos) => {
          if (!consumoDe) return;
          try {
            const material = await configurar.mutateAsync({ materialId: consumoDe.id, ...datos });
            toast.success("Consumo actualizado", {
              description: material.rendimiento
                ? `${material.nombre}: ${formatNumber(material.rendimiento)} m² por ${material.unidad}, merma ${formatNumber(material.mermaPorcentaje)} %`
                : `${material.nombre}: sin rendimiento, sus órdenes no descontarán stock`,
            });
          } catch (error) {
            toast.error("No se pudo guardar el consumo", {
              description: error instanceof Error ? error.message : "Intenta nuevamente.",
            });
            throw error;
          }
        }}
      />

      <RegistrarMovimientoDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        materiales={materiales}
        materialInicial={materialInicial}
        isSubmitting={registrar.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
