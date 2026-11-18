import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { MarkennyLogo } from "@/components/brand/MarkennyLogo";
import type { Rol } from "@/shared/domain";
import { useAuth } from "../context";
import { homeForRol } from "../lib/roles";

export function PantallaCarga({ mensaje }: { mensaje?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-markenny-ink text-white">
      <MarkennyLogo variant="light" size="md" />
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        {mensaje ?? "Verificando sesión..."}
      </div>
    </div>
  );
}

/** Exige sesión activa; recuerda la ruta de origen para volver tras el login. */
export function RequireAuth() {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return <PantallaCarga />;
  if (!usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <Outlet />;
}

/** Restringe un árbol de rutas a los roles indicados. */
export function RequireRole({
  roles,
  children,
}: {
  roles: Rol[];
  children: ReactNode;
}) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (!roles.includes(usuario.rol)) {
    return <Navigate to={homeForRol(usuario.rol)} replace />;
  }
  return <>{children}</>;
}

/** Login y setup solo son accesibles sin sesión. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <PantallaCarga />;
  if (usuario) return <Navigate to={homeForRol(usuario.rol)} replace />;
  return <>{children}</>;
}
