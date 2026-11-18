export { ClientesPage } from "./components/ClientesPage";
export { CotizadorPage } from "./components/CotizadorPage";
export { NuevaOrdenTrabajoPage } from "./components/NuevaOrdenTrabajoPage";
export { NuevaOrdenPapeleriaPage } from "./components/NuevaOrdenPapeleriaPage";
export { NuevaOrdenGranFormatoPage } from "./components/NuevaOrdenGranFormatoPage";
export { OrdenesTrabajoPage } from "./components/OrdenesTrabajoPage";
export { SeguimientoPage } from "./components/SeguimientoPage";
export { VentasDashboardPage } from "./components/VentasDashboardPage";
export { TipoTrabajoTabs } from "./components/TipoTrabajoTabs";

// Compound Components públicos de la feature
export { OrdenTrabajoForm } from "./components/orden-trabajo/OrdenTrabajoForm";
export type { OrdenTrabajoFormRootProps } from "./components/orden-trabajo/OrdenTrabajoForm";
export { CotizadorForm } from "./components/cotizador/CotizadorForm";
export { PapeleriaForm } from "./components/papeleria/PapeleriaForm";
export type { PapeleriaFormRootProps } from "./components/papeleria/PapeleriaForm";
export { GranFormatoForm } from "./components/gran-formato/GranFormatoForm";
export type { GranFormatoFormRootProps } from "./components/gran-formato/GranFormatoForm";

// Contratos y hooks
export {
  ordenTrabajoSchema,
  cotizacionSchema,
  clienteSchema,
  papeleriaSchema,
  granFormatoSchema,
} from "./types/schemas";
export type {
  OrdenTrabajoFormValues,
  CotizacionFormValues,
  ClienteFormValues,
  PapeleriaFormValues,
  GranFormatoFormValues,
} from "./types/schemas";
export { useClientes, useCrearCliente } from "./hooks/useClientes";
export { useOrdenesTrabajo, useCrearOrdenTrabajo } from "./hooks/useOrdenesTrabajo";
export { calcularCotizacion, estimarMontoOrden } from "./lib/cotizador";
