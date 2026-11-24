/**
 * Traducción de las fichas de venta al contrato `NuevaOrdenTrabajo`.
 *
 * Lógica pura (sin React): las tres páginas de "Nueva orden" la usan para que
 * todas las órdenes lleguen a planta con el mismo formato. Antes cada página
 * armaba el objeto a su manera y, por ejemplo, papelería y gran formato
 * enviaban los acabados como identificadores ("numerado") mientras la ficha
 * general enviaba nombres ("Numerado").
 */
import { productoTerminadoDe } from "@markenny/contrato/dominio";
import { fechaEntregaIso } from "@/lib/fechas";
import { ACABADOS, SUSTRATOS } from "@/shared/catalogos";
import {
  COLOR_TINTA_LABEL,
  ENGOMADO_LABEL,
  LAMINADO_LABEL,
  TIPO_PAPEL_LABEL,
  type InsumoDisponible,
  type NuevaOrdenTrabajo,
} from "@/shared/domain";
import type {
  GranFormatoFormValues,
  OrdenTrabajoFormValues,
  PapeleriaFormValues,
} from "../types/schemas";
import { estimarMontoOrden } from "./cotizador";

/** Convierte la medida capturada a milímetros para el motor de costos. */
export function aMilimetros(valor: number, unidad: "cm" | "m") {
  return unidad === "m" ? valor * 1000 : valor * 10;
}

/** Nombres legibles de los acabados seleccionados (ignora ids desconocidos). */
export function nombresAcabados(ids: string[]): string[] {
  return ids.flatMap((id) => {
    const acabado = ACABADOS.find((item) => item.id === id);
    return acabado ? [acabado.nombre] : [];
  });
}

function sustratoDe(id: string) {
  return SUSTRATOS.find((item) => item.id === id);
}

function textoOpcional(valor?: string) {
  const limpio = valor?.trim();
  return limpio ? limpio : undefined;
}

/** Medida de referencia (mm) de cada tamaño del formato, para estimar el costo. */
const MEDIDAS_TAMANO: Record<PapeleriaFormValues["tamano"], [number, number]> = {
  CUARTO_CARTA: [108, 140],
  MEDIA_CARTA: [140, 216],
  CARTA: [216, 279],
  TABLOIDE: [279, 432],
  OTRO: [216, 279],
};

/** Papel del formato → sustrato del motor de costos. */
const SUSTRATO_COSTO: Record<PapeleriaFormValues["tipoPapel"], string> = {
  BOND: "bond-75",
  QUIMICO: "bond-90",
  GLASSE: "couche-150",
  BRISTOL: "cartulina-240",
  OPALINA: "cartulina-240",
  FOTOGRAFICO: "couche-300",
  OTRO: "bond-90",
};

/** Tintas por cara: "A color" es proceso CMYK; cada color directo cuenta uno. */
export function tintasDePapeleria(colores: PapeleriaFormValues["coloresTinta"]) {
  return colores.includes("A_COLOR") ? 4 + colores.length - 1 : colores.length;
}

const esTalonarioOBlock = (values: Pick<PapeleriaFormValues, "tipoDocumento">) =>
  values.tipoDocumento !== "TARJETAS";

/** Acabados del formato impreso, legibles para planta. */
export function acabadosDePapeleria(values: PapeleriaFormValues): string[] {
  const talonario = esTalonarioOBlock(values);
  return [
    talonario && values.usaNumeracion && "Numerado",
    talonario && values.usaNumeroControl && "Número de control",
    values.perforacion && "Perforación",
    talonario && values.formato === "BLOCK" && values.engomado && `Engomado ${ENGOMADO_LABEL[values.engomado].toLowerCase()}`,
    values.laminado && `Laminado ${LAMINADO_LABEL[values.laminado].toLowerCase()}`,
    values.dobleCara && "Doble cara",
  ].filter((acabado): acabado is string => Boolean(acabado));
}

/** Estimación de costo de la ficha de papelería (también la usa el resumen). */
export function estimarPapeleria(values: Pick<
  PapeleriaFormValues,
  "cantidad" | "partes" | "tamano" | "tipoPapel" | "coloresTinta" | "dobleCara" | "usaNumeracion" | "perforacion" | "laminado" | "tipoDocumento"
>) {
  const [anchoMm, altoMm] = MEDIDAS_TAMANO[values.tamano];
  const tintas = tintasDePapeleria(values.coloresTinta);
  return estimarMontoOrden({
    tecnologia: "OFFSET",
    cantidad: values.cantidad * (esTalonarioOBlock(values) ? values.partes : 1),
    anchoMm,
    altoMm,
    tintasTiro: tintas,
    tintasRetiro: values.dobleCara ? tintas : 0,
    sustratoId: SUSTRATO_COSTO[values.tipoPapel],
    acabados: [
      ...(esTalonarioOBlock(values) && values.usaNumeracion ? ["numerado"] : []),
      ...(values.perforacion ? ["perforado"] : []),
      ...(values.laminado === "MATE" ? ["laminado-mate"] : []),
      ...(values.laminado === "BRILLANTE" ? ["laminado-brillante"] : []),
    ],
  });
}

function nombrePapel(values: PapeleriaFormValues) {
  const papel = values.tipoPapel === "OTRO" ? values.tipoPapelOtro ?? "Otro" : TIPO_PAPEL_LABEL[values.tipoPapel];
  return `Papel ${papel}${values.gramaje ? ` ${values.gramaje} g` : ""}`;
}

function nombresTinta(values: PapeleriaFormValues) {
  return values.coloresTinta.map((color) =>
    color === "OTRO" ? textoOpcional(values.colorTintaOtro) ?? "Otro" : COLOR_TINTA_LABEL[color],
  );
}

export function ordenDesdePapeleria(values: PapeleriaFormValues): NuevaOrdenTrabajo {
  const talonario = esTalonarioOBlock(values);
  const numeracion = talonario && values.usaNumeracion;
  const control = talonario && values.usaNumeroControl;
  const especificaciones: NonNullable<NuevaOrdenTrabajo["especificaciones"]> = {
    nombreDocumento: values.nombreDocumento.trim(),
    tipoDocumento: values.tipoDocumento,
    tipoDocumentoOtro: values.tipoDocumento === "OTRO" ? textoOpcional(values.tipoDocumentoOtro) : undefined,
    orientacion: values.orientacion,
    perforacion: values.perforacion,
    formato: talonario ? values.formato : undefined,
    dobleCara: values.dobleCara,
    engomado: talonario && values.formato === "BLOCK" ? values.engomado : undefined,
    laminado: values.laminado,
    partes: talonario ? values.partes : undefined,
    numeracionDesde: numeracion ? values.numeracionDesde : undefined,
    numeracionHasta: numeracion ? values.numeracionHasta : undefined,
    numeroControlPrefijo: control ? textoOpcional(values.numeroControlPrefijo) : undefined,
    numeroControlDesde: control ? values.numeroControlDesde : undefined,
    numeroControlHasta: control ? values.numeroControlHasta : undefined,
    coloresTinta: values.coloresTinta,
    colorTintaOtro: values.coloresTinta.includes("OTRO") ? textoOpcional(values.colorTintaOtro) : undefined,
    tipoPapel: values.tipoPapel,
    tipoPapelOtro: values.tipoPapel === "OTRO" ? textoOpcional(values.tipoPapelOtro) : undefined,
    gramaje: values.gramaje,
    tamano: values.tamano,
    tamanoOtro: values.tamano === "OTRO" ? textoOpcional(values.tamanoOtro) : undefined,
    observaciones: textoOpcional(values.observaciones),
  };
  return {
    clienteId: values.clienteId,
    producto: values.nombreDocumento.trim(),
    categoriaTrabajo: "PAPELERIA",
    productoTerminado: productoTerminadoDe("PAPELERIA", especificaciones),
    cantidad: values.cantidad,
    fechaEntrega: fechaEntregaIso(values.fechaEntrega),
    montoTotal: estimarPapeleria(values).total,
    sustrato: nombrePapel(values),
    tintas: nombresTinta(values),
    acabados: acabadosDePapeleria(values),
    // Sin claves vacías: el contrato es estricto y la ficha queda limpia.
    especificaciones: Object.fromEntries(
      Object.entries(especificaciones).filter(([, valor]) => valor !== undefined),
    ),
  };
}

/** Sustrato de costo para el insumo de gran formato elegido. */
export function sustratoCostoGranFormato(insumo?: Pick<InsumoDisponible, "categoria">) {
  return insumo?.categoria === "LONA" ? "lona-front" : "vinilo-blanco";
}

export class SustratoNoDisponibleError extends Error {
  constructor() {
    super("El sustrato elegido ya no tiene existencia en almacén. Elige otro.");
    this.name = "SustratoNoDisponibleError";
  }
}

export function ordenDesdeGranFormato(
  values: GranFormatoFormValues,
  insumos: InsumoDisponible[],
): NuevaOrdenTrabajo {
  // Solo un vinil o lona con existencia: si se agotó mientras se llenaba la
  // ficha, la orden no se arma con un sustrato que no hay.
  const insumo = insumos.find(
    (item) =>
      item.id === values.sustratoId &&
      (item.categoria === "VINIL" || item.categoria === "LONA") &&
      item.disponible &&
      item.stock > 0,
  );
  if (!insumo) throw new SustratoNoDisponibleError();
  const monto = estimarMontoOrden({
    tecnologia: "GRAN_FORMATO",
    cantidad: values.cantidad,
    anchoMm: aMilimetros(values.ancho, values.unidadDimension),
    altoMm: aMilimetros(values.alto, values.unidadDimension),
    tintasTiro: 4,
    tintasRetiro: 0,
    sustratoId: sustratoCostoGranFormato(insumo),
    acabados: idsAcabadosGranFormato(values.acabados),
  });

  return {
    clienteId: values.clienteId,
    producto: values.producto.trim(),
    descripcion: values.descripcion?.trim() ?? "",
    tecnologia: "GRAN_FORMATO",
    prioridad: values.prioridad,
    cantidad: values.cantidad,
    fechaEntrega: fechaEntregaIso(values.fechaEntrega),
    montoTotal: monto.total,
    sustrato: insumo.nombre,
    tintas: ["CMYK alta cobertura"],
    // Ya son los nombres exactos que exige el contrato (3 acabados del servicio).
    acabados: values.acabados,
    categoriaTrabajo: "GRAN_FORMATO",
    especificaciones: {
      tipoGranFormato: values.tipoGranFormato,
      ancho: values.ancho,
      alto: values.alto,
      unidadDimension: values.unidadDimension,
      resolucionDpi: values.resolucionDpi,
      observaciones: textoOpcional(values.observaciones),
    },
  };
}

/** Acabados de gran formato → ids del motor de costos. */
/** Acabados de gran formato → ids del motor de costos. */
export function idsAcabadosGranFormato(acabados: readonly GranFormatoFormValues["acabados"][number][]) {
  const ids: Record<GranFormatoFormValues["acabados"][number], string> = {
    "Corte con plotter": "troquelado",
  };
  return acabados.map((acabado) => ids[acabado]);
}

export function ordenDesdeFichaGeneral(
  values: OrdenTrabajoFormValues
): NuevaOrdenTrabajo {
  const sustrato = sustratoDe(values.sustratoId);
  const monto = estimarMontoOrden({
    tecnologia: values.tecnologia,
    cantidad: values.cantidad,
    anchoMm: values.anchoMm,
    altoMm: values.altoMm,
    tintasTiro: values.tintasTiro,
    tintasRetiro: values.tintasRetiro,
    sustratoId: values.sustratoId,
    acabados: values.acabados,
  });

  return {
    clienteId: values.clienteId,
    producto: values.producto.trim(),
    descripcion: values.descripcion?.trim() ?? "",
    tecnologia: values.tecnologia,
    prioridad: values.prioridad,
    maquina: textoOpcional(values.maquina),
    cantidad: values.cantidad,
    fechaEntrega: fechaEntregaIso(values.fechaEntrega),
    montoTotal: monto.total,
    sustrato: sustrato?.nombre ?? "Sustrato por definir",
    tintas: [...(values.tintasTiro > 0 ? ["CMYK"] : []), ...values.tintasPantone],
    acabados: nombresAcabados(values.acabados),
    categoriaTrabajo: "GENERAL",
    especificaciones: {
      tintasTiro: values.tintasTiro,
      tintasRetiro: values.tintasRetiro,
      gramaje: sustrato?.gramaje,
      pantones: values.tintasPantone,
      observaciones: textoOpcional(values.observaciones),
    },
  };
}
