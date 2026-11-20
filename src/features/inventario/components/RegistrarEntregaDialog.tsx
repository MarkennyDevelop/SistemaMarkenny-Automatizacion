import { useEffect, useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { FormField, FormGrid } from "@/components/forms/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/utils";
import type { ProductoTerminado } from "@/shared/domain";

interface RegistrarEntregaDialogProps {
  producto: ProductoTerminado | null;
  isSubmitting?: boolean;
  onOpenChange: (abierto: boolean) => void;
  onSubmit: (datos: { cantidad: number; recibidoPor?: string }) => Promise<void>;
}

/** Entrega total o parcial al cliente de un producto que está en almacén. */
export function RegistrarEntregaDialog({
  producto,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: RegistrarEntregaDialogProps) {
  const [cantidad, setCantidad] = useState(0);
  const [recibidoPor, setRecibidoPor] = useState("");

  useEffect(() => {
    setCantidad(producto?.cantidadPendiente ?? 0);
    setRecibidoPor("");
  }, [producto?.id, producto?.cantidadPendiente]);

  if (!producto) return null;
  const pendiente = producto.cantidadPendiente;
  const valida = Number.isInteger(cantidad) && cantidad > 0 && cantidad <= pendiente;

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!valida) return;
    try {
      await onSubmit({ cantidad, recibidoPor: recibidoPor.trim() || undefined });
      onOpenChange(false);
    } catch {
      // El contenedor ya notifica el error; el diálogo queda abierto.
    }
  };

  return (
    <Dialog open={Boolean(producto)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar entrega</DialogTitle>
          <DialogDescription>
            {producto.codigoOrden ?? "Producto"} · {producto.descripcion}
            {producto.clienteNombre ? ` · ${producto.clienteNombre}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4" noValidate>
          <FormGrid>
            <FormField
              label="Unidades entregadas"
              htmlFor="entrega-cantidad"
              required
              hint={`Pendientes: ${formatNumber(pendiente)}`}
              error={valida ? undefined : `Indica un entero entre 1 y ${pendiente}`}
            >
              <Input
                id="entrega-cantidad"
                type="number"
                min={1}
                max={pendiente}
                step={1}
                value={Number.isNaN(cantidad) ? "" : cantidad}
                onChange={(evento) => setCantidad(evento.target.valueAsNumber)}
              />
            </FormField>
            <FormField label="Recibido por" htmlFor="entrega-recibe" hint="Opcional">
              <Input
                id="entrega-recibe"
                value={recibidoPor}
                maxLength={120}
                placeholder="Nombre de quien retira"
                onChange={(evento) => setRecibidoPor(evento.target.value)}
              />
            </FormField>
          </FormGrid>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valida || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              {cantidad === pendiente ? "Entregar todo" : "Registrar entrega parcial"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
