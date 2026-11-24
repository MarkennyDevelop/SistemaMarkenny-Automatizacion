import { useMemo, useState } from "react";
import { AlertCircle, Search, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useClientes } from "../hooks/useClientes";
import { ClientesTable } from "./clientes/ClientesTable";
import { NuevoClienteDialog } from "./clientes/NuevoClienteDialog";

export function ClientesPage() {
  const { data: clientes = [], isLoading, isError, refetch } = useClientes();
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return clientes;
    return clientes.filter(
      (cliente) =>
        cliente.nombre.toLowerCase().includes(termino) ||
        cliente.rif.toLowerCase().includes(termino) ||
        cliente.contacto.toLowerCase().includes(termino),
    );
  }, [clientes, busqueda]);

  const saldoTotal = clientes.reduce((total, cliente) => total + cliente.saldoPendiente, 0);
  const conOrdenes = clientes.filter((cliente) => cliente.ordenesActivas > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ventas · Catálogo comercial"
        title="Clientes"
        description="Cartera de clientes de MARKENNY, C.A., con contacto y estado de cuenta."
        actions={<NuevoClienteDialog />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Clientes registrados</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {String(clientes.length).padStart(2, "0")}
            </p>
          </div>
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Con órdenes activas</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {String(conOrdenes).padStart(2, "0")}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-primary">
            En planta
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="section-label">Saldo por cobrar</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {formatCurrency(saldoTotal)}
            </p>
          </div>
          <Wallet className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre, RIF o contacto..."
            className="pl-9"
            aria-label="Buscar clientes"
          />
        </div>
        <p className="text-[11px] text-muted-foreground sm:ml-auto">
          {filtrados.length} de {clientes.length} clientes
        </p>
      </div>

      {isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <AlertCircle className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium">No se pudo cargar la cartera de clientes</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : (
        <ClientesTable clientes={filtrados} isLoading={isLoading} />
      )}
    </div>
  );
}
