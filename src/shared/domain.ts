/**
 * Tipos del dominio gráfico.
 *
 * Las entidades que viajan por la API se derivan del contrato
 * (`packages/contrato`): frontend y backend no pueden desincronizarse.
 * Aquí quedan además las etiquetas en español de la interfaz.
 */
import type { EntradaDeEndpoint, RespuestaDe } from "@markenny/cliente-http";
import { CATEGORIAS_INVENTARIO as CATEGORIAS, FASES, TIPOS_PAPEL as PAPELES } from "@markenny/contrato/dominio";

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
/** La máquina es una asignación opcional de taller (no está en el formato físico). */
export const SIN_MAQUINA = "Sin asignar";
export type TipoDocumento = NonNullable<EspecificacionesTrabajo["tipoDocumento"]>;
export type TipoPapel = NonNullable<MaterialInventario["subtipo"]>;
export type ColorTinta = NonNullable<EspecificacionesTrabajo["coloresTinta"]>[number];
export type TamanoPapeleria = NonNullable<EspecificacionesTrabajo["tamano"]>;
export type LugarEngomado = NonNullable<EspecificacionesTrabajo["engomado"]>;
export type ProductoTerminadoTipo = OrdenTrabajo["productoTerminado"];
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
/** Insumo disponible para las fichas de venta (sin costos). */
export type InsumoDisponible = RespuestaDe<"disponibilidadInventario">[number];
export type NotaOrden = OrdenTrabajo["notas"][number];
export type NuevaNotaOrden = EntradaDeEndpoint<"agregarNotaOrden">["body"];

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

/** Tipo de trabajo del formato físico: NE., RM., F., Otro. */
export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  NE: "NE. · Nota de entrega",
  RM: "RM. · Récipe médico",
  F: "F. · Factura",
  OTRO: "Otro",
};

export const COLOR_TINTA_LABEL: Record<ColorTinta, string> = {
  PANTONE: "Pantone",
  NEGRO: "Negro",
  AZUL: "Azul",
  VERDE: "Verde",
  ROJO: "Rojo",
  A_COLOR: "A Color",
  OTRO: "Otro",
};

export const TAMANO_PAPELERIA_LABEL: Record<TamanoPapeleria, string> = {
  CUARTO_CARTA: "1/4 Carta",
  MEDIA_CARTA: "1/2 Carta",
  CARTA: "Carta",
  OTRO: "Otro",
};

export const ENGOMADO_LABEL: Record<LugarEngomado, string> = {
  ARRIBA: "Arriba",
  ABAJO: "Abajo",
  DERECHA: "Der.",
  IZQUIERDA: "Izq.",
};

export const FORMATO_PAPELERIA_LABEL = { TALONARIO: "Talonario", BLOCK: "Block" } as const;
export const LAMINADO_LABEL = { BRILLANTE: "Brillante", MATE: "Mate" } as const;
export const PERFORACION_LABEL = { HORIZONTAL: "Horizontal", VERTICAL: "Vertical" } as const;

/** Resumen legible de la ficha técnica (detalle de planta y seguimiento). */
export function resumenEspecificaciones(e: EspecificacionesTrabajo): [string, string][] {
  const filas: [string, string][] = [];
  const agregar = (etiqueta: string, valor: string | undefined | false) => {
    if (valor) filas.push([etiqueta, valor]);
  };
  agregar("Documento", e.nombreDocumento);
  agregar(
    "Tipo de trabajo",
    e.tipoDocumento &&
      (e.tipoDocumento === "OTRO" ? `Otro: ${e.tipoDocumentoOtro ?? ""}` : TIPO_DOCUMENTO_LABEL[e.tipoDocumento]),
  );
  agregar("Presentación", e.formato && `${FORMATO_PAPELERIA_LABEL[e.formato]}${e.dobleCara ? " · Doble cara" : ""}`);
  agregar("Partes", e.partes !== undefined && String(e.partes));
  agregar(
    "Numeración",
    e.numeracionDesde !== undefined &&
      `N° ${e.numeracionPrefijo ?? ""}${e.numeracionDesde} → ${e.numeracionPrefijo ?? ""}${e.numeracionHasta ?? ""}`,
  );
  agregar(
    "Perforación",
    e.perforacion !== undefined &&
      (e.perforacion ? `Sí · ${e.perforacionOrientacion ? PERFORACION_LABEL[e.perforacionOrientacion] : ""}` : "No"),
  );
  agregar("Engomado", e.engomado && ENGOMADO_LABEL[e.engomado]);
  agregar("Laminado", e.laminado && LAMINADO_LABEL[e.laminado]);
  agregar(
    "Color de tinta",
    e.coloresTinta !== undefined &&
      e.coloresTinta.length > 0 &&
      e.coloresTinta
        .map((color) =>
          color === "PANTONE" ? `Pantone ${e.pantone ?? ""}` : color === "OTRO" ? e.colorTintaOtro ?? "Otro" : COLOR_TINTA_LABEL[color],
        )
        .join(", "),
  );
  agregar(
    "Papel",
    e.tipoPapel &&
      `${e.tipoPapel === "OTRO" ? e.tipoPapelOtro ?? "Otro" : TIPO_PAPEL_LABEL[e.tipoPapel]}${e.gramaje ? ` · ${e.gramaje} g` : ""}`,
  );
  agregar("Tamaño", e.tamano && (e.tamano === "OTRO" ? `Otro: ${e.tamanoOtro ?? ""}` : TAMANO_PAPELERIA_LABEL[e.tamano]));
  agregar("Pieza", e.tipoGranFormato && TIPO_GRAN_FORMATO_LABEL[e.tipoGranFormato]);
  agregar(
    "Medida",
    e.ancho !== undefined && e.alto !== undefined && `${e.ancho} × ${e.alto} ${e.unidadDimension ?? ""}`,
  );
  agregar("Resolución", e.resolucionDpi !== undefined && `${e.resolucionDpi} dpi`);
  return filas;
}

/* ------------------------------------------------------------------ */
/* Inventario de Markenny (solo materias primas, sin maquinaria)        */
/* ------------------------------------------------------------------ */

export const CATEGORIAS_INVENTARIO: readonly CategoriaInventario[] = CATEGORIAS;
export const TIPOS_PAPEL: readonly TipoPapel[] = PAPELES;

export const CATEGORIA_INVENTARIO_LABEL: Record<CategoriaInventario, string> = {
  PAPEL: "Papeles",
  VINIL: "Viniles",
  LONA: "Lonas",
  SELLO: "Sellos",
};

export const TIPO_PAPEL_LABEL: Record<TipoPapel, string> = {
  QUIMICO: "Químico",
  BOND: "Bond",
  GLASSE: "Glasse",
  BRISTOL: "Bristol",
  OPALINA: "Opalina",
  FOTOGRAFICO: "Fotográfico",
};

export const PRODUCTO_TERMINADO_LABEL: Record<ProductoTerminadoTipo, string> = {
  PLIEGO_STICKERS: "Pliego de stickers",
  TALONARIO: "Talonario",
  BLOCK: "Block",
  SELLO_PERSONALIZADO: "Sello personalizado",
  PENDON: "Pendón",
  VINIL_ROTULACION: "Vinil para rotulación",
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
