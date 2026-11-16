import { Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency, initials } from "@/lib/utils";
import type { Cliente } from "@/shared/domain";

interface ClientesTableProps {
  clientes: Cliente[];
  isLoading?: boolean;
}

export function ClientesTable({ clientes, isLoading }: ClientesTableProps) {
  if (isLoading) {
    return (
      <Card className="divide-y divide-border/70 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-5 py-4">
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </Card>
    );
  }

  if (clientes.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
          <Users className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium">No hay clientes que coincidan</p>
        <p className="text-xs text-muted-foreground">
          Ajusta la búsqueda o registra un cliente nuevo.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table className="min-w-[780px]">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-5">Cliente</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead className="text-center">OT activas</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="w-[110px] pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cliente) => (
            <TableRow key={cliente.id}>
              <TableCell className="pl-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-muted/60 font-display text-[11px] font-semibold">
                    {initials(cliente.nombre)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{cliente.nombre}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {cliente.rif}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-[11px] font-medium">{cliente.contacto}</p>
                <p className="text-[10px] text-muted-foreground">{cliente.telefono}</p>
              </TableCell>
              <TableCell>
                <span className="text-[11px] text-muted-foreground">{cliente.ciudad}</span>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={cliente.ordenesActivas > 0 ? "default" : "muted"}>
                  {cliente.ordenesActivas}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "text-[12px] font-semibold tabular-nums",
                    cliente.saldoPendiente > 0 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {formatCurrency(cliente.saldoPendiente)}
                </span>
              </TableCell>
              <TableCell className="pr-5">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/ventas/nueva-orden?cliente=${cliente.id}`}>
                    <Plus className="h-3 w-3" />
                    Crear OT
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
