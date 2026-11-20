import { ACABADOS, SUSTRATOS } from "@/shared/catalogos";
import type { Tecnologia } from "@/shared/domain";

export interface CotizacionInput {
  tecnologia: Tecnologia;
  tiraje: number;
  anchoMm: number;
  altoMm: number;
  tintasTiro: number;
  tintasRetiro: number;
  sustratoId: string;
  acabados: string[];
  margen: number;
}

export interface CotizacionConcepto {
  concepto: string;
  monto: number;
  nota?: string;
}

export interface CotizacionResultado {
  costoMateriales: number;
  costoProcesos: number;
  costoAcabados: number;
  costoDirecto: number;
  margenMonto: number;
  total: number;
  costoUnitario: number;
  totalPliegos: number;
  mermas: number;
  mermasPorcentaje: number;
  conceptos: CotizacionConcepto[];
}

const round = (value: number) => Math.round(value * 100) / 100;

const numeroSeguro = (value: number) => (Number.isFinite(value) ? value : 0);

function sustrato(id: string) {
  return SUSTRATOS.find((item) => item.id === id) ?? SUSTRATOS[0];
}

function cotizarOffset(
  input: CotizacionInput,
  precioHoja: number,
  tarifaHoraPrensa = 75,
  costoPlancha = 12.5,
): Pick<CotizacionResultado, "costoMateriales" | "costoProcesos" | "totalPliegos" | "mermas"> {
  const mermasAjuste = input.tintasTiro * 150;
  const mermasTiraje = Math.ceil(input.tiraje * 0.02);
  const mermas = mermasAjuste + mermasTiraje;
  const totalPliegos = input.tiraje + mermas;

  const costoMateriales = totalPliegos * precioHoja;
  const costoPlanchas =
    input.tintasTiro * costoPlancha + input.tintasRetiro * costoPlancha;
  const horasArreglo = (input.tintasTiro + input.tintasRetiro) * 0.25;
  const horasTiraje = totalPliegos / 8000;
  const costoPrensa = (horasArreglo + horasTiraje) * tarifaHoraPrensa;
  const costoProcesos = costoPlanchas + costoPrensa;

  return {
    costoMateriales,
    costoProcesos,
    totalPliegos,
    mermas,
  };
}

function cotizarDigital(
  input: CotizacionInput,
  precioHoja: number,
): Pick<CotizacionResultado, "costoMateriales" | "costoProcesos" | "totalPliegos" | "mermas"> {
  const mermas = 5 + Math.ceil(input.tiraje * 0.01);
  const totalPliegos = input.tiraje + mermas;
  const costoMateriales = totalPliegos * precioHoja;
  const caras = input.tintasRetiro > 0 ? 2 : 1;
  const costoClic = 0.09 * Math.max(1, input.tintasTiro) * caras;
  const costoProcesos = totalPliegos * costoClic;
  return { costoMateriales, costoProcesos, totalPliegos, mermas };
}

function cotizarGranFormato(
  input: CotizacionInput,
): Pick<CotizacionResultado, "costoMateriales" | "costoProcesos" | "totalPliegos" | "mermas"> {
  const m2PorUnidad = (input.anchoMm / 1000) * (input.altoMm / 1000);
  const m2Totales = m2PorUnidad * input.tiraje;
  const mermas = round(m2Totales * 0.05);
  const tarifaM2 = input.sustratoId === "lona-front" ? 6.2 : 8.9;
  const costoMateriales = (m2Totales + mermas) * tarifaM2;
  const costoProcesos = m2Totales * 2.1 + input.tintasTiro * 8;
  return {
    costoMateriales,
    costoProcesos,
    totalPliegos: round(m2Totales + mermas),
    mermas,
  };
}

/**
 * Motor de cálculo con patrón Strategy: cada tecnología de impresión
 * encapsula sus propias fórmulas de mermas, planchas y tiempo de máquina.
 * La interfaz de salida es común para la UI y para el resumen de la OT.
 */
export function calcularCotizacion(entrada: CotizacionInput): CotizacionResultado {
  // Un campo numérico vacío llega como NaN desde el formulario; se trata como 0
  // para que el resumen en vivo no muestre "NaN" mientras el usuario escribe.
  const input: CotizacionInput = {
    ...entrada,
    tiraje: numeroSeguro(entrada.tiraje),
    anchoMm: numeroSeguro(entrada.anchoMm),
    altoMm: numeroSeguro(entrada.altoMm),
    tintasTiro: numeroSeguro(entrada.tintasTiro),
    tintasRetiro: numeroSeguro(entrada.tintasRetiro),
    margen: numeroSeguro(entrada.margen),
    acabados: entrada.acabados ?? [],
  };
  const papel = sustrato(input.sustratoId);
  const base =
    input.tecnologia === "GRAN_FORMATO"
      ? cotizarGranFormato(input)
      : input.tecnologia === "DIGITAL"
        ? cotizarDigital(input, papel.precioHoja)
        : cotizarOffset(input, papel.precioHoja);

  const costoAcabados = input.acabados.reduce((total, id) => {
    const acabado = ACABADOS.find((item) => item.id === id);
    return total + (acabado ? acabado.precio * input.tiraje : 0);
  }, 0);

  const costoDirecto =
    base.costoMateriales + base.costoProcesos + costoAcabados;
  const margenMonto = costoDirecto * (input.margen / 100);
  const total = costoDirecto + margenMonto;
  const mermasPorcentaje = input.tiraje > 0 ? (base.mermas / input.tiraje) * 100 : 0;

  const conceptos: CotizacionConcepto[] = [
    {
      concepto: "Materiales y sustrato",
      monto: round(base.costoMateriales),
      nota: `${base.totalPliegos.toLocaleString("es-VE")} ${input.tecnologia === "GRAN_FORMATO" ? "m²" : "pliegos"} · ${papel.nombre}`,
    },
    {
      concepto: "Procesos de máquina",
      monto: round(base.costoProcesos),
      nota: `${input.tintasTiro} tiro · ${input.tintasRetiro} retiro`,
    },
    {
      concepto: "Acabados",
      monto: round(costoAcabados),
      nota: `${input.acabados.length} proceso(s) seleccionado(s)`,
    },
    {
      concepto: `Margen comercial (${input.margen}%)`,
      monto: round(margenMonto),
    },
  ];

  return {
    ...base,
    costoMateriales: round(base.costoMateriales),
    costoProcesos: round(base.costoProcesos),
    costoAcabados: round(costoAcabados),
    costoDirecto: round(costoDirecto),
    margenMonto: round(margenMonto),
    total: round(total),
    costoUnitario: input.tiraje > 0 ? round(total / input.tiraje) : 0,
    mermasPorcentaje: round(mermasPorcentaje),
    conceptos,
  };
}

/**
 * Estimación rápida para la Orden de Trabajo.
 * Usa el mismo motor que el cotizador para evitar dos fuentes de verdad.
 */
export function estimarMontoOrden(params: {
  tecnologia: Tecnologia;
  cantidad: number;
  anchoMm: number;
  altoMm: number;
  tintasTiro: number;
  tintasRetiro: number;
  sustratoId: string;
  acabados: string[];
}): CotizacionResultado {
  return calcularCotizacion({
    ...params,
    tiraje: params.cantidad,
    margen: 35,
  });
}
