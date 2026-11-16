export { ClientesPage } from "./components/ClientesPage";
export { CotizadorPage } from "./components/CotizadorPage";
export { NuevaOrdenTrabajoPage } from "./components/NuevaOrdenTrabajoPage";
export { OrdenesTrabajoPage } from "./components/OrdenesTrabajoPage";

// Compound Components públicos de la feature
export { OrdenTrabajoForm } from "./components/orden-trabajo/OrdenTrabajoForm";
export type { OrdenTrabajoFormRootProps } from "./components/orden-trabajo/OrdenTrabajoForm";
export { CotizadorForm } from "./components/cotizador/CotizadorForm";

// Contratos y hooks
export { ordenTrabajoSchema, cotizacionSchema, clienteSchema } from "./types/schemas";
export type {
  OrdenTrabajoFormValues,
  CotizacionFormValues,
  ClienteFormValues,
} from "./types/schemas";
export { useClientes, useCrearCliente } from "./hooks/useClientes";
export { useOrdenesTrabajo, useCrearOrdenTrabajo } from "./hooks/useOrdenesTrabajo";
export { calcularCotizacion, estimarMontoOrden } from "./lib/cotizador";
