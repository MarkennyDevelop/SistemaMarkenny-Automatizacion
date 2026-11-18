import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { HardHat, Loader2, ShoppingBag, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField, FormGrid, ToggleCard } from "@/components/forms/primitives";
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
import { ROL_DESCRIPCION } from "@/shared/domain";
import { useCrearEmpleado } from "../hooks/useEmpleados";
import {
  EMPLEADO_DEFAULTS,
  empleadoSchema,
  type EmpleadoFormValues,
} from "../types/schemas";

interface NuevoEmpleadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NuevoEmpleadoDialog({
  open,
  onOpenChange,
}: NuevoEmpleadoDialogProps) {
  const crear = useCrearEmpleado();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmpleadoFormValues>({
    resolver: zodResolver(empleadoSchema),
    defaultValues: EMPLEADO_DEFAULTS,
    mode: "onTouched",
  });

  const rol = watch("rol");

  useEffect(() => {
    if (open) {
      reset(EMPLEADO_DEFAULTS);
    }
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await crear.mutateAsync(values);
      toast.success("Empleado registrado", {
        description: `${values.nombre} · ${values.rol === "VENDEDOR" ? "Vendedor" : "Producción"}`,
      });
      reset(EMPLEADO_DEFAULTS);
      onOpenChange(false);
    } catch (error) {
      toast.error("No se pudo registrar el empleado", {
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar empleado</DialogTitle>
          <DialogDescription>
            Solo el administrador puede crear cuentas. El empleado ingresa con el
            correo y la contraseña temporal definidos aquí.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormGrid>
            <FormField
              label="Nombre y apellido"
              htmlFor="emp-nombre"
              required
              error={errors.nombre?.message}
            >
              <Input id="emp-nombre" placeholder="María Pérez" {...register("nombre")} />
            </FormField>
            <FormField
              label="Correo corporativo"
              htmlFor="emp-email"
              required
              error={errors.email?.message}
            >
              <Input
                id="emp-email"
                type="email"
                placeholder="maria@markenny.com"
                {...register("email")}
              />
            </FormField>
          </FormGrid>

          <FormGrid>
            <FormField
              label="Teléfono"
              htmlFor="emp-telefono"
              error={errors.telefono?.message}
              hint="Opcional"
            >
              <Input
                id="emp-telefono"
                placeholder="+58 412-000-0000"
                {...register("telefono")}
              />
            </FormField>
            <FormField
              label="Cargo"
              htmlFor="emp-cargo"
              error={errors.cargo?.message}
              hint="Opcional"
            >
              <Input
                id="emp-cargo"
                placeholder="Ejecutivo de ventas"
                {...register("cargo")}
              />
            </FormField>
          </FormGrid>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label">Rol del empleado</span>
              {errors.rol && (
                <span className="text-[11px] text-destructive">
                  {errors.rol.message}
                </span>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleCard
                selected={rol === "VENDEDOR"}
                onToggle={() =>
                  setValue("rol", "VENDEDOR", { shouldValidate: true, shouldDirty: true })
                }
                icon={ShoppingBag}
                title="Vendedor"
                description={ROL_DESCRIPCION.VENDEDOR}
              />
              <ToggleCard
                selected={rol === "PRODUCCION"}
                onToggle={() =>
                  setValue("rol", "PRODUCCION", {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                icon={HardHat}
                title="Producción"
                description={ROL_DESCRIPCION.PRODUCCION}
              />
            </div>
          </div>

          <FormGrid>
            <FormField
              label="Contraseña temporal"
              htmlFor="emp-password"
              required
              error={errors.password?.message}
              hint="Mín. 8 · letra y número"
            >
              <Input
                id="emp-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("password")}
              />
            </FormField>
            <FormField
              label="Confirmar contraseña"
              htmlFor="emp-confirmar"
              required
              error={errors.confirmar?.message}
            >
              <Input
                id="emp-confirmar"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("confirmar")}
              />
            </FormField>
          </FormGrid>

          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            El vendedor ve clientes, cotizador, órdenes y seguimiento. Producción ve
            el tablero de taller, el control de calidad y el almacén.
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={crear.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Crear cuenta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
