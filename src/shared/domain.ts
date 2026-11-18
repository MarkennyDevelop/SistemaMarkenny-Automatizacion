/**
 * Núcleo compartido de tipos del dominio gráfico.
 * Los features consumen estas entidades y las exponen en su propio index.ts.
 */

/* ------------------------------------------------------------------ */
/* Identidad y roles                                                   */
/* ------------------------------------------------------------------ */

export type Rol = "ADMIN" | "VENDEDOR" | "PRODUCCION";

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
/* Producción                                                          */
/* ------------------------------------------------------------------ */

export type FasePlanta = "EN_PROCESO" | "EN_REVISION" | "FINALIZADO" | "EMPACADO";

export type Tecnologia = "OFFSET" | "DIGITAL" | "GRAN_FORMATO" | "FLEXOGRAFIA";

export type Prioridad = "BAJA" | "MEDIA" | "ALTA" | "URGENTE";

/**
 * Familia del trabajo. Determina qué ficha técnica usa el vendedor
 * (papelería corporativa vs. gran formato/adhesivos) y cómo se muestra
 * la orden en planta.
 */
export type CategoriaTrabajo = "PAPELERIA" | "GRAN_FORMATO" | "GENERAL";

export type TipoPapeleria =
  | "FACTURA"
  | "TALONARIO"
  | "RECIPE"
  | "NOTA"
  | "ORDEN_COMPRA"
  | "RECIBO"
  | "CARTA"
  | "OTRO";

export type TipoGranFormato =
  | "PENDON"
  | "STICKER"
  | "VINIL"
  | "LONA"
  | "BACKING"
  | "ROTULO"
  | "OTRO";

export interface EspecificacionesTrabajo {
  /* Papelería corporativa */
  tipoPapeleria?: TipoPapeleria;
  partes?: number;
  numeracionDesde?: number;
  numeracionHasta?: number;
  numeracionPrefijo?: string;
  /* Gran formato y adhesivos */
  tipoGranFormato?: TipoGranFormato;
  ancho?: number;
  alto?: number;
  unidadDimension?: "cm" | "m";
  resolucionDpi?: number;
  /* Comunes */
  gramaje?: number;
  pantones?: string[];
  observaciones?: string;
}

export interface EventoOrden {
  id: string;
  fase: FasePlanta;
  anterior: FasePlanta | null;
  usuario: string;
  rol: Rol;
  fecha: string;
  nota?: string;
}

/** Identidad mínima del operario que ejecuta un cambio de fase. */
export interface ActorOrden {
  usuario: string;
  rol: Rol;
}

/* ------------------------------------------------------------------ */
/* Ventas                                                              */
/* ------------------------------------------------------------------ */

export interface Cliente {
  id: string;
  nombre: string;
  rif: string;
  contacto: string;
  telefono: string;
  email: string;
  ciudad: string;
  ordenesActivas: number;
  saldoPendiente: number;
  creadoEn: string;
}

export type NuevoCliente = Omit<
  Cliente,
  "id" | "creadoEn" | "ordenesActivas" | "saldoPendiente"
>;

export interface NuevaOrdenTrabajo {
  clienteId: string;
  producto: string;
  descripcion: string;
  tecnologia: Tecnologia;
  prioridad: Prioridad;
  maquina: string;
  cantidad: number;
  fechaEntrega: string;
  montoTotal: number;
  sustrato: string;
  tintas: string[];
  acabados: string[];
  categoriaTrabajo?: CategoriaTrabajo;
  especificaciones?: EspecificacionesTrabajo;
  vendedor?: string;
}

export interface OrdenTrabajo {
  id: string;
  codigo: string;
  clienteId: string;
  clienteNombre: string;
  producto: string;
  descripcion: string;
  tecnologia: Tecnologia;
  fase: FasePlanta;
  prioridad: Prioridad;
  maquina: string;
  operador: string;
  cantidad: number;
  avance: number;
  montoTotal: number;
  sustrato: string;
  tintas: string[];
  acabados: string[];
  fechaCreacion: string;
  fechaEntrega: string;
  categoriaTrabajo?: CategoriaTrabajo;
  especificaciones?: EspecificacionesTrabajo;
  vendedor?: string;
  historial?: EventoOrden[];
}

/* ------------------------------------------------------------------ */
/* Inventario                                                          */
/* ------------------------------------------------------------------ */

export type CategoriaInventario =
  | "PAPEL"
  | "TINTAS"
  | "PLANCHAS"
  | "VINILOS"
  | "SELLOS"
  | "ALMACEN";

export type UnidadMedida =
  | "resma"
  | "pliego"
  | "kg"
  | "litro"
  | "unidad"
  | "rollo"
  | "caja";

export interface MaterialInventario {
  id: string;
  sku: string;
  nombre: string;
  categoria: CategoriaInventario;
  unidad: UnidadMedida;
  stock: number;
  stockMinimo: number;
  costoUnitario: number;
  ubicacion: string;
  proveedor: string;
  lote: string;
  actualizadoEn: string;
}

export type TipoMovimiento = "ENTRADA" | "SALIDA" | "AJUSTE" | "RESERVA";

export interface MovimientoInventario {
  id: string;
  materialId: string;
  materialNombre: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  usuario: string;
  fecha: string;
}

/* ------------------------------------------------------------------ */
/* Notificaciones                                                      */
/* ------------------------------------------------------------------ */

export type TipoNotificacion = "PEDIDO_LISTO" | "FASE" | "STOCK" | "SISTEMA";

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string;
  ordenId?: string;
  codigo?: string;
  /** Roles que deben ver la notificación. */
  roles: Rol[];
  /** IDs de usuarios que ya la marcaron como leída. */
  leidaPor: string[];
  creadaEn: string;
}

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
  EMPACADO: {
    label: "Empaquetado",
    short: "Empaque",
    description: "Producto final embalado para despacho",
  },
};

export const FASES_PLANTA: FasePlanta[] = [
  "EN_PROCESO",
  "EN_REVISION",
  "FINALIZADO",
  "EMPACADO",
];

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
