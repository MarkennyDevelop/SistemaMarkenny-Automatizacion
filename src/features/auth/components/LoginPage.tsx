import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FormField } from "@/components/forms/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "../api/authApi";
import { useAuth } from "../context";
import { homeForRol } from "../lib/roles";
import { loginSchema, type LoginFormValues } from "../types/schemas";
import { AuthLayout } from "./AuthLayout";

const ROLES = [
  { label: "Administrador", detalle: "Usuarios y control general" },
  { label: "Vendedor", detalle: "Órdenes, clientes y seguimiento" },
  { label: "Producción", detalle: "Taller, calidad y almacén" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [verPassword, setVerPassword] = useState(false);
  const [errorCredenciales, setErrorCredenciales] = useState<string | null>(null);

  const { data: hayAdmin, isLoading: verificandoAdmin } = useQuery({
    queryKey: ["auth", "hay-admin"],
    queryFn: authApi.hayAdministrador,
    staleTime: 0,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const destino =
    (location.state as { from?: string } | null)?.from ?? null;

  /** Primer arranque: sin administrador se va directo al registro maestro. */
  useEffect(() => {
    if (!verificandoAdmin && hayAdmin === false) {
      navigate("/setup-admin", { replace: true });
    }
  }, [hayAdmin, verificandoAdmin, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setErrorCredenciales(null);
    try {
      const usuario = await login(values);
      toast.success(`Bienvenido, ${usuario.nombre.split(" ")[0]}`, {
        description: `Sesión iniciada como ${usuario.rol === "ADMIN" ? "administrador" : usuario.rol === "VENDEDOR" ? "vendedor" : "producción"}.`,
      });
      navigate(destino ?? homeForRol(usuario.rol), { replace: true });
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : "No se pudo iniciar sesión.";
      setErrorCredenciales(mensaje);
    }
  });

  return (
    <AuthLayout
      eyebrow="Acceso al sistema"
      title="Iniciar sesión"
      description="Ingresa con tu cuenta corporativa. El sistema te muestra únicamente los módulos que corresponden a tu rol."
      footer={
        hayAdmin === false && !verificandoAdmin ? (
          <p>
            Este sistema aún no tiene administrador.{" "}
            <Link
              to="/setup-admin"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Registra la cuenta maestra
            </Link>
            .
          </p>
        ) : (
          <p>
            ¿Olvidaste tu contraseña? Solicita el restablecimiento al
            administrador del sistema.
          </p>
        )
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField
          label="Correo corporativo"
          htmlFor="email"
          required
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@markenny.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Contraseña"
          htmlFor="password"
          required
          error={errors.password?.message}
        >
          <div className="relative">
            <Input
              id="password"
              type={verPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setVerPassword((valor) => !valor)}
              className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {verPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </FormField>

        {errorCredenciales && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-[12px] text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorCredenciales}</span>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {isSubmitting ? "Verificando..." : "Entrar al sistema"}
        </Button>
      </form>

      <div className="mt-7 rounded-lg border border-dashed border-border bg-muted/30 p-3.5">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Tres roles, tres alcances
        </p>
        <div className="mt-2.5 space-y-2">
          {ROLES.map((rol) => (
            <div key={rol.label} className="flex items-center justify-between gap-3">
              <Badge variant="outline" className="shrink-0">
                {rol.label}
              </Badge>
              <span className="text-right text-[11px] leading-snug text-muted-foreground">
                {rol.detalle}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
