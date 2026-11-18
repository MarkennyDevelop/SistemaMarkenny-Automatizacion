/**
 * Claves de caché de TanStack Query.
 * Centralizadas para que cualquier feature pueda invalidar el estado compartido
 * sin conocer los hooks de las demás.
 */
export const queryKeys = {
  clientes: ["clientes"] as const,
  ordenes: ["ordenes"] as const,
  inventario: ["inventario"] as const,
  movimientos: ["movimientos"] as const,
  dashboard: ["dashboard"] as const,
  notificaciones: ["notificaciones"] as const,
  empleados: ["empleados"] as const,
  sesion: ["sesion"] as const,
} as const;
