import { EMPRESA } from "@markenny/contrato/dominio";

export const SISTEMA = {
  nombre: "Markenny Print MIS",
  empresa: EMPRESA.nombre,
  rif: EMPRESA.rif,
  telefono: "+58 424-651-2044",
  email: "produccion@markenny.com",
  direccion: "Caracas, Venezuela",
  version: "0.1.0 · Sprint 1",
} as const;

export const MAQUINAS = [
  "Heidelberg SM 52",
  "Heidelberg Speedmaster 74",
  "Konica Minolta C4080",
  "Mimaki JV300",
  "Guillotina Polar 92",
  "Troqueladora Bobst",
] as const;

export const SUSTRATOS = [
  { id: "couche-150", nombre: "Couché 150 g", gramaje: 150, precioHoja: 0.21 },
  { id: "couche-300", nombre: "Couché 300 g", gramaje: 300, precioHoja: 0.38 },
  { id: "bond-75", nombre: "Bond 75 g", gramaje: 75, precioHoja: 0.09 },
  { id: "bond-90", nombre: "Bond 90 g", gramaje: 90, precioHoja: 0.11 },
  { id: "cartulina-240", nombre: "Cartulina 240 g", gramaje: 240, precioHoja: 0.3 },
  { id: "adhesivo-80", nombre: "Adhesivo 80 g", gramaje: 80, precioHoja: 0.16 },
  { id: "vinilo-blanco", nombre: "Vinilo blanco brillante", gramaje: 100, precioHoja: 0.95 },
  { id: "lona-front", nombre: "Lona front 13 oz", gramaje: 440, precioHoja: 1.4 },
] as const;

export const ACABADOS = [
  { id: "barniz-uv", nombre: "Barniz UV", precio: 0.06 },
  { id: "laminado-mate", nombre: "Laminado mate", precio: 0.09 },
  { id: "troquelado", nombre: "Troquelado", precio: 0.12 },
  { id: "plegado", nombre: "Plegado", precio: 0.03 },
  { id: "engrapado", nombre: "Engrapado", precio: 0.04 },
  { id: "encuadernado", nombre: "Encuadernado hot-melt", precio: 0.22 },
  { id: "perforado", nombre: "Perforado", precio: 0.02 },
  { id: "numerado", nombre: "Numerado", precio: 0.05 },
  { id: "media-luna", nombre: "Media luna", precio: 0.03 },
  { id: "plastificado", nombre: "Plastificado", precio: 0.08 },
  { id: "ojales", nombre: "Ojales metálicos", precio: 0.35 },
  { id: "refuerzo", nombre: "Refuerzo perimetral", precio: 0.22 },
  { id: "laminado-brillante", nombre: "Laminado brillante", precio: 0.1 },
  { id: "doble-cara", nombre: "Impresión doble cara", precio: 0.14 },
] as const;

export const TINTAS_PANTONE = [
  { id: "pantone-032", nombre: "Pantone 032 C", hex: "#ED1B2E" },
  { id: "pantone-186", nombre: "Pantone 186 C", hex: "#C8102E" },
  { id: "pantone-485", nombre: "Pantone 485 C", hex: "#DA291C" },
  { id: "pantone-123", nombre: "Pantone 123 C", hex: "#FFC72C" },
  { id: "pantone-355", nombre: "Pantone 355 C", hex: "#009639" },
  { id: "pantone-293", nombre: "Pantone 293 C", hex: "#003DA5" },
  { id: "pantone-267", nombre: "Pantone 267 C", hex: "#5F259F" },
  { id: "pantone-430", nombre: "Pantone 430 C", hex: "#7C878E" },
  { id: "pantone-871", nombre: "Pantone 871 C", hex: "#85754E" },
  { id: "pantone-black", nombre: "Pantone Black C", hex: "#2D2926" },
] as const;

export const CIUDADES = [
  "Caracas",
  "Maracaibo",
  "Valencia",
  "Barquisimeto",
  "Maracay",
  "Puerto La Cruz",
  "El Tigre",
  "San Cristóbal",
] as const;
