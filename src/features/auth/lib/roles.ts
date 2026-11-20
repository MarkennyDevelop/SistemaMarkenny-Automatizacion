import type { Rol } from "@/shared/domain";

/** Ruta de aterrizaje según el rol autenticado. */
export function homeForRol(rol: Rol): string {
  switch (rol) {
    case "ADMIN":
      return "/admin";
    case "VENDEDOR":
      return "/ventas/dashboard";
    case "PRODUCCION":
      return "/produccion";
    default:
      return "/login";
  }
}
