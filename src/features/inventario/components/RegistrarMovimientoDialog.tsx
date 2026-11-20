import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { useAuth } from "@/features/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/utils";
import { stockTrasMovimiento, type MaterialInventario } from "@/shared/domain";
import { movimientoSchema, type MovimientoFormValues } from "../types/schema";

interface RegistrarMovimientoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materiales: MaterialInventario[];
  materialInicial?: string;
  /** Tipo preseleccionado (p. ej. "SALIDA" al despachar desde Sellos). */
  tipoInicial?: MovimientoFormValues["tipo"];
  isSubmitting?: boolean;
  onSubmit: (values: MovimientoFormValues) => Promise<void>;
}

const TIPOS = [
  { value: "ENTRADA", label: "Entrada de almacén" },
  { value: "SALIDA", label: "Salida / consumo" },
  { value: "AJUSTE", label: "Ajuste de inventario" },
  { value: "RESERVA", label: "Reserva para OT" },
] as const;

export function RegistrarMovimientoDialog({
  open,
  onOpenChange,
  materiales,
  materialInicial,
  tipoInicial = "ENTRADA",
  isSubmitting,
  onSubmit,
}: RegistrarMovimientoDialogProps) {
  const { usuario } = useAuth();
  const responsable = usuario?.nombre ?? "";
  const form = useForm<MovimientoFormValues>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: {
      materialId: materialInicial ?? "",
      tipo: tipoInicial,
      cantidad: 1,
      motivo: "",
      usuario: responsable,
    },
    mode: "onTouched",
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (open) {
      reset({
        materialId: materialInicial ?? "",
        tipo: tipoInicial,
        cantidad: 1,
        motivo: "",
        usuario: responsable,
      });
    }
  }, [open, materialInicial, tipoInicial, reset, responsable]);

  const materialId = watch("materialId");
  const tipo = watch("tipo");
  const cantidad = Number(watch("cantidad")) || 0;
  const material = materiales.find((item) => item.id === materialId);
  const stockResultante = material
    ? stockTrasMovimiento(material.stock, tipo, cantidad)
    : null;
  const stockInsuficiente = stockResultante !== null && stockResultante < 0;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // El contenedor ya notifica el error; se mantiene el diálogo abierto.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            Entradas, salidas, ajustes y reservas quedan auditadas con usuario y motivo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField
            label="Material"
            htmlFor="mov-material"
            required
            error={errors.materialId?.message}
          >
            <Select
              value={materialId}
              onValueChange={(value) =>
                setValue("materialId", value, { shouldValidate: true, shouldDirty: true })
              }
            >
              <SelectTrigger id="mov-material">
                <SelectValue placeholder="Selecciona un material" />
              </SelectTrigger>
              <SelectContent>
                {materiales.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nombre} · {formatNumber(item.stock)} {item.unidad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormGrid>
            <FormField label="Tipo" htmlFor="mov-tipo" required error={errors.tipo?.message}>
              <Select
                value={tipo}
                onValueChange={(value) =>
                  setValue(
                    "tipo",
                    value as MovimientoFormValues["tipo"],
                    { shouldValidate: true, shouldDirty: true },
                  )
                }
              >
                <SelectTrigger id="mov-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Cantidad"
              htmlFor="mov-cantidad"
              required
              error={errors.cantidad?.message}
              hint={material ? material.unidad : undefined}
            >
              <Input
                id="mov-cantidad"
                type="number"
                step="0.1"
                min={0.1}
                {...register("cantidad", { valueAsNumber: true })}
              />
            </FormField>
          </FormGrid>

          <FormField
            label="Motivo"
            htmlFor="mov-motivo"
            required
            error={errors.motivo?.message}
          >
            <Input
              id="mov-motivo"
              placeholder="Consumo OT-2026-0184 / compra proveedor..."
              {...register("motivo")}
            />
          </FormField>

          <FormField
            label="Responsable"
            htmlFor="mov-usuario"
            required
            error={errors.usuario?.message}
            hint="Usuario de la sesión"
          >
            <Input id="mov-usuario" readOnly className="bg-muted/50" {...register("usuario")} />
          </FormField>

          {material && (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-[11px]">
              <span className="text-muted-foreground">
                Stock actual: {formatNumber(material.stock)} {material.unidad}
              </span>
              <span
                className={
                  stockInsuficiente
                    ? "font-semibold tabular-nums text-destructive"
                    : "font-semibold tabular-nums"
                }
              >
                {stockInsuficiente
                  ? "Stock insuficiente"
                  : `Resultante: ${formatNumber(stockResultante ?? 0)} ${material.unidad}`}
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || stockInsuficiente}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownUp className="h-4 w-4" />
              )}
              Registrar movimiento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
