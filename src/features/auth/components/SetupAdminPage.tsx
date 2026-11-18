import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldPlus,
  X,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FormField, FormGrid } from "@/components/forms/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { authApi } from "../api/authApi";
import { useAuth } from "../context";
import {
  SETUP_ADMIN_DEFAULTS,
  setupAdminSchema,
  type SetupAdminFormValues,
} from "../types/schemas";
import { AuthLayout } from "./AuthLayout";

const REQUISITOS = [
  { id: "largo", label: "Al menos 8 caracteres", test: (v: string) => v.length >= 8 },
  { id: "letra", label: "Una letra", test: (v: string) => /[A-Za-z]/.test(v) },
  { id: "numero", label: "Un número", test: (v: string) => /\d/.test(v) },
];

export function SetupAdminPage() {
  const navigate = useNavigate();
  const { registrarAdministrador } = useAuth();
  const [verPassword, setVerPassword] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const { data: hayAdmin, isLoading } = useQuery({
    queryKey: ["auth", "hay-admin"],
    queryFn: authApi.hayAdministrador,
    staleTime: 0,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SetupAdminFormValues>({
    resolver: zodResolver(setupAdminSchema),
    defaultValues: SETUP_ADMIN_DEFAULTS,
    mode: "onTouched",
  });

  const password = useWatch({ control, name: "password" }) ?? "";
  const confirmar = useWatch({ control, name: "confirmar" }) ?? "";

  useEffect(() => {
    setErrorGeneral(null);
  }, [password, confirmar]);

  if (!isLoading && hayAdmin) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setErrorGeneral(null);
    try {
      const admin = await registrarAdministrador(values);
      toast.success("Administrador maestro registrado", {
        description:
          "Esta cuenta es única. Desde ahora el formulario de instalación queda bloqueado.",
      });
      navigate("/admin/empleados", { replace: true });
      return admin;
    } catch (error) {
      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el administrador.",
      );
    }
  });

  return (
    <AuthLayout
      eyebrow="Instalación · Paso único"
      title="Registrar administrador"
      description="Esta pantalla se habilita una sola vez. La cuenta creada aquí gobierna usuarios, roles y permisos del sistema completo."
      volverA="/login"
      footer={
        <p className="flex items-start gap-2">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Al confirmar, el formulario de instalación desaparece de forma permanente.
          Solo el administrador podrá crear las cuentas de vendedores y producción.
        </p>
      }
    >
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            Verificando si el sistema ya fue instalado...
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField
            label="Nombre y apellido"
            htmlFor="admin-nombre"
            required
            error={errors.nombre?.message}
          >
            <Input
              id="admin-nombre"
              autoComplete="name"
              placeholder="Kenny Hernández"
              {...register("nombre")}
            />
          </FormField>

          <FormGrid>
            <FormField
              label="Correo corporativo"
              htmlFor="admin-email"
              required
              error={errors.email?.message}
            >
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="admin@markenny.com"
                {...register("email")}
              />
            </FormField>
            <FormField
              label="Teléfono"
              htmlFor="admin-telefono"
              required
              error={errors.telefono?.message}
            >
              <Input
                id="admin-telefono"
                autoComplete="tel"
                placeholder="+58 424-000-0000"
                {...register("telefono")}
              />
            </FormField>
          </FormGrid>

          <FormField
            label="Cargo"
            htmlFor="admin-cargo"
            error={errors.cargo?.message}
            hint="Opcional"
          >
            <Input
              id="admin-cargo"
              placeholder="Gerente general"
              {...register("cargo")}
            />
          </FormField>

          <FormField
            label="Contraseña maestra"
            htmlFor="admin-password"
            required
            error={errors.password?.message}
          >
            <div className="relative">
              <Input
                id="admin-password"
                type={verPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className="pr-10"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setVerPassword((valor) => !valor)}
                className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                aria-label={
                  verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {verPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormField>

          <div className="grid gap-1.5 sm:grid-cols-3">
            {REQUISITOS.map((requisito) => {
              const cumple = requisito.test(password);
              return (
                <span
                  key={requisito.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium",
                    cumple
                      ? "border-primary/25 bg-primary/[0.05] text-primary"
                      : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {cumple ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {requisito.label}
                </span>
              );
            })}
          </div>

          <FormField
            label="Confirmar contraseña"
            htmlFor="admin-confirmar"
            required
            error={errors.confirmar?.message}
          >
            <Input
              id="admin-confirmar"
              type={verPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("confirmar")}
            />
          </FormField>

          {errorGeneral && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-[12px] text-destructive"
            >
              {errorGeneral}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldPlus className="h-4 w-4" />
            )}
            {isSubmitting ? "Creando cuenta maestra..." : "Crear administrador único"}
          </Button>

          <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
            <KeyRound className="mt-0.5 h-3 w-3 shrink-0" />
            Guarda esta contraseña en un gestor seguro: sin administrador activo no
            es posible recuperar el acceso desde la interfaz.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
