import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardView } from "../components/DashboardView";
import { useDashboard } from "../hooks/useDashboard";

function fechaLarga() {
  const texto = new Intl.DateTimeFormat("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-72 animate-pulse rounded bg-muted" />
        <div className="h-4 w-[420px] max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-[138px] animate-pulse bg-muted/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="h-[320px] animate-pulse bg-muted/30" />
          <Card className="h-[300px] animate-pulse bg-muted/30" />
        </div>
        <div className="space-y-6">
          <Card className="h-[380px] animate-pulse bg-muted/30" />
          <Card className="h-[280px] animate-pulse bg-muted/30" />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboard();

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Centro de producción"
          title="Control de planta"
          description="No se pudo cargar la información consolidada."
        />
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <AlertCircle className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium">Error de conexión con producción</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Verifica la disponibilidad del API. La interfaz reintentará automáticamente.
          </p>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  return <DashboardView data={data} fecha={fechaLarga()} />;
}
