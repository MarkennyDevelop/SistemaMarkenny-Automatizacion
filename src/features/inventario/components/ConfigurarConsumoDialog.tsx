import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Ruler } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
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
import type { ConfiguracionConsumo, MaterialInventario } from "@/shared/domain";

const numeroOpcional = z.number().positive("Debe ser mayor a cero").optional().or(z.nan().transform(() => undefined));

const consumoSchema = z.object({
  anchoRollo: numeroOpcional,
  largoRollo: numeroOpcional,
  rendimiento: numeroOpcional,
  mermaPorcentaje: z
    .number({ error: "Indica la merma (0 si no aplica)" })
    .min(0, "No puede ser negativa")
    .max(100, "Máximo 100 %"),
});

type ConsumoInput = z.input<typeof consumoSchema>;
type ConsumoValues = z.output<typeof consumoSchema>;

interface ConfigurarConsumoDialogProps {
  material: MaterialInventario | null;
  isSubmitting?: boolean;
  onOpenChange: (abierto: boolean) => void;
  onSubmit: (datos: ConfiguracionConsumo) => Promise<void>;
}

/**
 * Rendimiento (m² por unidad de stock) y merma de un vinil o lona: con ellos
 * el servidor convierte los m² de cada orden de gran formato en la cantidad
 * que descuenta del almacén. El rendimiento puede escribirse directo o
 * calcularse con el ancho y el largo del rollo.
 */
export function ConfigurarConsumoDialog({ material, isSubmitting, onOpenChange, onSubmit }: ConfigurarConsumoDialogProps) {
  const form = useForm<ConsumoInput, unknown, ConsumoValues>({
    resolver: zodResolver(consumoSchema),
    defaultValues: { mermaPorcentaje: 0 },
  });
  const { register, control, setValue, reset, formState: { errors } } = form;
  const [anchoRollo, largoRollo] = useWatch({ control, name: ["anchoRollo", "largoRollo"] });

  useEffect(() => {
    reset({
      anchoRollo: undefined,
      largoRollo: undefined,
      rendimiento: material?.rendimiento ?? undefined,
      mermaPorcentaje: material?.mermaPorcentaje ?? 0,
    });
  }, [material, reset]);

  // Ancho × largo del rollo → m² por rollo.
  useEffect(() => {
    const ancho = Number(anchoRollo);
    const largo = Number(largoRollo);
    if (ancho > 0 && largo > 0) {
      setValue("rendimiento", Math.round(ancho * largo * 1000) / 1000, { shouldValidate: true, shouldDirty: true });
    }
  }, [anchoRollo, largoRollo, setValue]);

  if (!material) return null;

  const enviar = form.handleSubmit(async ({ rendimiento, mermaPorcentaje }) => {
    await onSubmit({ rendimiento: rendimiento ?? null, mermaPorcentaje });
    onOpenChange(false);
  });

  return (
    <Dialog open={Boolean(material)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            Consumo de «{material.nombre}»
          </DialogTitle>
          <DialogDescription>
            Cada orden de pendones, stickers o viniles descuenta: m² impresos × (1 + merma) ÷ m² por{" "}
            {material.unidad}. Sin rendimiento, las órdenes se crean sin descontar y Producción recibe un aviso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="space-y-4">
          <FormGrid>
            <FormField label="Ancho del rollo" htmlFor="consumo-ancho" hint="m · opcional" error={errors.anchoRollo?.message}>
              <Input id="consumo-ancho" type="number" inputMode="decimal" step="0.01" placeholder="Ej. 1,22" {...register("anchoRollo", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Largo del rollo" htmlFor="consumo-largo" hint="m · opcional" error={errors.largoRollo?.message}>
              <Input id="consumo-largo" type="number" inputMode="decimal" step="0.1" placeholder="Ej. 50" {...register("largoRollo", { valueAsNumber: true })} />
            </FormField>
          </FormGrid>
          <FormGrid>
            <FormField
              label={`Rendimiento · m²/${material.unidad}`}
              htmlFor="consumo-rendimiento"
              hint="Vacío = sin descuento"
              error={errors.rendimiento?.message}
            >
              <Input id="consumo-rendimiento" type="number" inputMode="decimal" step="0.001" {...register("rendimiento", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Merma" htmlFor="consumo-merma" hint="% de corte y pruebas" error={errors.mermaPorcentaje?.message}>
              <Input id="consumo-merma" type="number" inputMode="decimal" step="0.5" min={0} max={100} {...register("mermaPorcentaje", { valueAsNumber: true })} />
            </FormField>
          </FormGrid>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
