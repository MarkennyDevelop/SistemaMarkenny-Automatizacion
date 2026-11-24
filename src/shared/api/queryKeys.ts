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
  disponibilidad: ["inventario", "disponibilidad"] as const,
  productosTerminados: ["productos-terminados"] as const,
  dashboard: ["dashboard"] as const,
  notificaciones: ["notificaciones"] as const,
  empleados: ["empleados"] as const,
  hayAdministrador: ["auth", "hay-admin"] as const,
} as const;
