import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cliente } from "@/shared/domain";

interface ClienteSelectProps {
  clientes: Cliente[];
  value: string;
  onChange: (clienteId: string) => void;
  id?: string;
}

/**
 * Selector de cliente con opción de limpiar. Llega precargado cuando la orden
 * se crea desde Clientes ("Crear OT"), pero el vendedor puede cambiarlo o
 * dejarlo vacío.
 */
export function ClienteSelect({ clientes, value, onChange, id = "clienteId" }: ClienteSelectProps) {
  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label="Cliente" className="min-w-0 flex-1">
          <SelectValue placeholder="Selecciona un cliente" />
        </SelectTrigger>
        <SelectContent>
          {clientes.map((cliente) => (
            <SelectItem key={cliente.id} value={cliente.id}>
              {cliente.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Quitar cliente"
          onClick={() => onChange("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
