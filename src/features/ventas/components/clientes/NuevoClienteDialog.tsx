import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField, FormGrid } from "@/components/forms/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CIUDADES } from "@/shared/catalogos";
import { useCrearCliente } from "../../hooks/useClientes";
import { clienteSchema, type ClienteFormValues } from "../../types/schemas";

const DEFAULTS: ClienteFormValues = {
  nombre: "",
  rif: "",
  contacto: "",
  telefono: "",
  email: "",
  ciudad: "Caracas",
};

export function NuevoClienteDialog() {
  const [open, setOpen] = useState(false);
  const crearCliente = useCrearCliente();

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: DEFAULTS,
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
  const ciudad = watch("ciudad");

  const onSubmit = async (values: ClienteFormValues) => {
    try {
      const cliente = await crearCliente.mutateAsync(values);
      toast.success("Cliente registrado", {
        description: `${cliente.nombre} · ${cliente.rif}`,
      });
      reset(DEFAULTS);
      setOpen(false);
    } catch (error) {
      toast.error("No se pudo registrar el cliente", {
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset(DEFAULTS);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Nuevo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar cliente</DialogTitle>
          <DialogDescription>
            Ficha comercial para asociar órdenes de trabajo y cotizaciones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormGrid>
            <FormField
              label="Razón social"
              htmlFor="cli-nombre"
              required
              error={errors.nombre?.message}
              className="sm:col-span-2"
            >
              <Input id="cli-nombre" placeholder="Inversiones ... C.A." {...register("nombre")} />
            </FormField>
            <FormField label="RIF" htmlFor="cli-rif" required error={errors.rif?.message}>
              <Input id="cli-rif" placeholder="J-40512336-7" {...register("rif")} />
            </FormField>
            <FormField
              label="Contacto"
              htmlFor="cli-contacto"
              required
              error={errors.contacto?.message}
            >
              <Input id="cli-contacto" placeholder="Nombre y apellido" {...register("contacto")} />
            </FormField>
            <FormField
              label="Teléfono"
              htmlFor="cli-telefono"
              required
              error={errors.telefono?.message}
            >
              <Input id="cli-telefono" placeholder="+58 412-000-0000" {...register("telefono")} />
            </FormField>
            <FormField
              label="Correo electrónico"
              htmlFor="cli-email"
              required
              error={errors.email?.message}
            >
              <Input
                id="cli-email"
                type="email"
                placeholder="compras@empresa.com"
                {...register("email")}
              />
            </FormField>
            <FormField
              label="Ciudad"
              htmlFor="cli-ciudad"
              required
              error={errors.ciudad?.message}
              className="sm:col-span-2"
            >
              <Select
                value={ciudad}
                onValueChange={(value) =>
                  setValue("ciudad", value, { shouldValidate: true, shouldDirty: true })
                }
              >
                <SelectTrigger id="cli-ciudad">
                  <SelectValue placeholder="Selecciona una ciudad" />
                </SelectTrigger>
                <SelectContent>
                  {CIUDADES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearCliente.isPending}>
              {crearCliente.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Guardar cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
