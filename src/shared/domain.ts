/**
 * Tipos del dominio gráfico.
 *
 * Las entidades que viajan por la API se derivan del contrato
 * (`packages/contrato`): frontend y backend no pueden desincronizarse.
 * Aquí quedan además las etiquetas en español de la interfaz.
 */
import type { EntradaDeEndpoint, RespuestaDe } from "@markenny/cliente-http";
import { FASES } from "@markenny/contrato/dominio";

export { stockTrasMovimiento } from "@markenny/contrato/dominio";

/* ------------------------------------------------------------------ */
/* Identidad y roles                                                   */
/* ------------------------------------------------------------------ */

export type UsuarioPublico = RespuestaDe<"sesionActual">;
export type Rol = UsuarioPublico["rol"];

export const ROL_LABEL: Record<Rol, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  PRODUCCION: "Producción",
};

export const ROL_DESCRIPCION: Record<Rol, string> = {
  ADMIN: "Control total: usuarios, ventas, planta e inventario",
  VENDEDOR: "Clientes, cotizaciones, órdenes y seguimiento",
  PRODUCCION: "Tablero de taller, control de calidad y almacén",
};

/* ------------------------------------------------------------------ */
/* Órdenes de trabajo y producción                                     */
/* ------------------------------------------------------------------ */

export type OrdenTrabajo = RespuestaDe<"obtenerOrden">;
export type EventoOrden = OrdenTrabajo["historial"][number];
export type EspecificacionesTrabajo = OrdenTrabajo["especificaciones"];
export type FasePlanta = OrdenTrabajo["fase"];
export type EstadoEntrega = OrdenTrabajo["estadoEntrega"];
export type Tecnologia = OrdenTrabajo["tecnologia"];
export type Prioridad = OrdenTrabajo["prioridad"];
/**
 * Familia del trabajo: determina la ficha técnica del vendedor (papelería
 * corporativa o gran formato/adhesivos) y cómo se muestra la orden en planta.
 */
export type CategoriaTrabajo = OrdenTrabajo["categoriaTrabajo"];
export type TipoPapeleria = NonNullable<EspecificacionesTrabajo["tipoPapeleria"]>;
export type TipoGranFormato = NonNullable<EspecificacionesTrabajo["tipoGranFormato"]>;
/** Cuerpo de `POST /ordenes`: el vendedor lo asigna el servidor (usuario de la sesión). */
export type NuevaOrdenTrabajo = EntradaDeEndpoint<"crearOrden">["body"];

/* ------------------------------------------------------------------ */
/* Ventas                                                              */
/* ------------------------------------------------------------------ */

export type Cliente = RespuestaDe<"listarClientes">[number];
export type NuevoCliente = EntradaDeEndpoint<"crearCliente">["body"];

/* ------------------------------------------------------------------ */
/* Inventario                                                          */
/* ------------------------------------------------------------------ */

export type MaterialInventario = RespuestaDe<"listarMateriales">[number];
export type CategoriaInventario = MaterialInventario["categoria"];
export type UnidadMedida = MaterialInventario["unidad"];
export type MovimientoInventario = RespuestaDe<"registrarMovimiento">;
export type TipoMovimiento = MovimientoInventario["tipo"];
/** Cuerpo de `POST /inventario/movimientos`: el responsable es el usuario de la sesión. */
export type NuevoMovimiento = EntradaDeEndpoint<"registrarMovimiento">["body"];
/** Sellos y productos terminados en almacén pendientes de entrega. */
export type ProductoTerminado = RespuestaDe<"listarProductosTerminados">[number];

/* ------------------------------------------------------------------ */
/* Notificaciones                                                      */
/* ------------------------------------------------------------------ */

export type Notificacion = RespuestaDe<"listarNotificaciones">[number];
export type TipoNotificacion = Notificacion["tipo"];

/* ------------------------------------------------------------------ */
/* Etiquetas                                                           */
/* ------------------------------------------------------------------ */

export const FASE_PLANTA: Record<
  FasePlanta,
  { label: string; short: string; description: string }
> = {
  EN_PROCESO: {
    label: "En Proceso",
    short: "Proceso",
    description: "Pre-prensa, impresión y acabados en máquina",
  },
  EN_REVISION: {
    label: "En Revisión",
    short: "Revisión",
    description: "Control de calidad y aprobación de color",
  },
  FINALIZADO: {
    label: "Finalizado",
    short: "Finalizado",
    description: "Producción terminada, lista para empacar",
  },
  EMPAQUETADO: {
    label: "Empaquetado",
    short: "Empaque",
    description: "Producto final embalado para despacho",
  },
};

/** Orden de las 4 fases, tomado del contrato. */
export const FASES_PLANTA: readonly FasePlanta[] = FASES;

export const ESTADO_ENTREGA_LABEL: Record<EstadoEntrega, string> = {
  NO_APLICA: "En producción",
  PENDIENTE: "Pendiente de entrega",
  PARCIAL: "Entrega parcial",
  ENTREGADO: "Entregado",
};

export const CATEGORIA_TRABAJO_LABEL: Record<CategoriaTrabajo, string> = {
  PAPELERIA: "Papelería corporativa",
  GRAN_FORMATO: "Gran formato / adhesivos",
  GENERAL: "Trabajo general",
};

export const TIPO_PAPELERIA_LABEL: Record<TipoPapeleria, string> = {
  FACTURA: "Facturas",
  TALONARIO: "Talonarios",
  RECIPE: "Récipes / recetas",
  NOTA: "Notas de entrega",
  ORDEN_COMPRA: "Órdenes de compra",
  RECIBO: "Recibos de pago",
  CARTA: "Papelería de carta",
  OTRO: "Otro documento",
};

export const TIPO_GRAN_FORMATO_LABEL: Record<TipoGranFormato, string> = {
  PENDON: "Pendón",
  STICKER: "Sticker / calcomanía",
  VINIL: "Vinil adhesivo",
  LONA: "Lona impresa",
  BACKING: "Backing / valla",
  ROTULO: "Rótulo",
  OTRO: "Otro gran formato",
};

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export const TECNOLOGIA_LABEL: Record<Tecnologia, string> = {
  OFFSET: "Offset",
  DIGITAL: "Digital",
  GRAN_FORMATO: "Gran formato",
  FLEXOGRAFIA: "Flexografía",
};
