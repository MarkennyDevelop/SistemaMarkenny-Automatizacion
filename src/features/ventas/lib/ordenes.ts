/**
 * Traducción de las fichas de venta al contrato `NuevaOrdenTrabajo`.
 *
 * Lógica pura (sin React): las tres páginas de "Nueva orden" la usan para que
 * todas las órdenes lleguen a planta con el mismo formato. Antes cada página
 * armaba el objeto a su manera y, por ejemplo, papelería y gran formato
 * enviaban los acabados como identificadores ("numerado") mientras la ficha
 * general enviaba nombres ("Numerado").
 */
import { fechaEntregaIso } from "@/lib/fechas";
import { ACABADOS, SUSTRATOS } from "@/shared/catalogos";
import type { NuevaOrdenTrabajo } from "@/shared/domain";
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

export function ordenDesdePapeleria(
  values: PapeleriaFormValues
): NuevaOrdenTrabajo {
  const sustrato = sustratoDe(values.sustratoId);
  const monto = estimarMontoOrden({
    tecnologia: values.tecnologia,
    cantidad: values.cantidad,
    anchoMm: values.anchoMm,
    altoMm: values.altoMm,
    tintasTiro: values.tintasTiro,
    tintasRetiro: 0,
    sustratoId: values.sustratoId,
    acabados: values.acabados,
  });

  return {
    clienteId: values.clienteId,
    producto: values.producto.trim(),
    descripcion: values.descripcion?.trim() ?? "",
    tecnologia: values.tecnologia,
    prioridad: values.prioridad,
    maquina: values.maquina,
    cantidad: values.cantidad,
    fechaEntrega: fechaEntregaIso(values.fechaEntrega),
    montoTotal: monto.total,
    sustrato: sustrato?.nombre ?? "Por definir",
    tintas:
      values.tintasPantone.length > 0 ? values.tintasPantone : ["CMYK proceso"],
    acabados: nombresAcabados(values.acabados),
    categoriaTrabajo: "PAPELERIA",
    especificaciones: {
      tipoPapeleria: values.tipoPapeleria,
      partes: values.partes,
      numeracionDesde: values.usaNumeracion ? values.numeracionDesde : undefined,
      numeracionHasta: values.usaNumeracion ? values.numeracionHasta : undefined,
      numeracionPrefijo: values.usaNumeracion
        ? textoOpcional(values.numeracionPrefijo)
        : undefined,
      tintasTiro: values.tintasTiro,
      gramaje: sustrato?.gramaje,
      pantones: values.tintasPantone,
      observaciones: textoOpcional(values.observaciones),
    },
  };
}

export function ordenDesdeGranFormato(
  values: GranFormatoFormValues
): NuevaOrdenTrabajo {
  const sustrato = sustratoDe(values.sustratoId);
  const monto = estimarMontoOrden({
    tecnologia: "GRAN_FORMATO",
    cantidad: values.cantidad,
    anchoMm: aMilimetros(values.ancho, values.unidadDimension),
    altoMm: aMilimetros(values.alto, values.unidadDimension),
    tintasTiro: 4,
    tintasRetiro: 0,
    sustratoId: values.sustratoId,
    acabados: values.acabados,
  });

  return {
    clienteId: values.clienteId,
    producto: values.producto.trim(),
    descripcion: values.descripcion?.trim() ?? "",
    tecnologia: "GRAN_FORMATO",
    prioridad: values.prioridad,
    maquina: values.maquina,
    cantidad: values.cantidad,
    fechaEntrega: fechaEntregaIso(values.fechaEntrega),
    montoTotal: monto.total,
    sustrato: sustrato?.nombre ?? "Por definir",
    tintas: ["CMYK alta cobertura"],
    acabados: nombresAcabados(values.acabados),
    categoriaTrabajo: "GRAN_FORMATO",
    especificaciones: {
      tipoGranFormato: values.tipoGranFormato,
      ancho: values.ancho,
      alto: values.alto,
      unidadDimension: values.unidadDimension,
      resolucionDpi: values.resolucionDpi,
      gramaje: sustrato?.gramaje,
      observaciones: textoOpcional(values.observaciones),
    },
  };
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
    maquina: values.maquina,
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
