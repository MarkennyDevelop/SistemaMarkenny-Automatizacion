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

/** Roles que pueden ver cada sección protegida. */
export const PERMISOS = {
  admin: ["ADMIN"] as Rol[],
  empleados: ["ADMIN"] as Rol[],
  ventas: ["ADMIN", "VENDEDOR"] as Rol[],
  produccion: ["ADMIN", "PRODUCCION"] as Rol[],
  almacen: ["ADMIN", "PRODUCCION"] as Rol[],
};

export function tienePermiso(rol: Rol, permitidos: Rol[]): boolean {
  return permitidos.includes(rol);
}
