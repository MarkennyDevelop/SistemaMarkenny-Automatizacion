/**
 * Núcleo compartido de tipos del dominio gráfico.
 * Los features consumen estas entidades y las exponen en su propio index.ts.
 */

export type FasePlanta = "EN_PROCESO" | "EN_REVISION" | "FINALIZADO" | "EMPACADO";

export type Tecnologia = "OFFSET" | "DIGITAL" | "GRAN_FORMATO" | "FLEXOGRAFIA";

export type Prioridad = "BAJA" | "MEDIA" | "ALTA" | "URGENTE";

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
}

export type CategoriaInventario = "PAPEL" | "TINTAS" | "SELLOS" | "ALMACEN";

export type UnidadMedida = "resma" | "pliego" | "kg" | "litro" | "unidad" | "rollo" | "caja";

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
