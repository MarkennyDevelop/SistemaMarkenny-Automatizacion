import { describe, expect, it } from "vitest";
import { fechaEnDias } from "@/lib/fechas";
import { formatDate } from "@/lib/utils";
import { NuevaOrdenSchema } from "@markenny/contrato";
import type { InsumoDisponible } from "@/shared/domain";
import {
  GRAN_FORMATO_DEFAULTS,
  ORDEN_TRABAJO_DEFAULTS,
  PAPELERIA_DEFAULTS,
  granFormatoSchema,
  ordenTrabajoSchema,
  papeleriaSchema,
} from "../types/schemas";
import {
  aMilimetros,
  nombresAcabados,
  ordenDesdeFichaGeneral,
  ordenDesdeGranFormato,
  ordenDesdePapeleria,
} from "./ordenes";

const CLIENTE = "cli-001";
const entrega = fechaEnDias(5);

const papeleria = papeleriaSchema.parse({
  ...PAPELERIA_DEFAULTS,
  clienteId: CLIENTE,
  nombreDocumento: "Nota de entrega Farmacia Central",
  tipoDocumento: "NE",
  formato: "TALONARIO",
  cantidad: 10,
  partes: 3,
  usaNumeracion: true,
  numeracionDesde: 1,
  numeracionHasta: 500,
  perforacion: true,
  perforacionOrientacion: "HORIZONTAL",
  coloresTinta: ["NEGRO", "PANTONE"],
  pantone: "186 C",
  tipoPapel: "QUIMICO",
  gramaje: 56,
  tamano: "MEDIA_CARTA",
  fechaEntrega: entrega,
  observaciones: "  Logo en Pantone 186  ",
});

const INSUMOS: InsumoDisponible[] = [
  { id: "mat-lona", nombre: "Lona front 13 oz", categoria: "LONA", subtipo: null, unidad: "metro", stock: 40, disponible: true },
  { id: "mat-vinil", nombre: "Vinil blanco", categoria: "VINIL", subtipo: null, unidad: "rollo", stock: 0, disponible: false },
];

/** La orden que arma el frontend debe pasar el esquema real del contrato. */
const validarContrato = (orden: unknown) =>
  NuevaOrdenSchema.safeParse({ ...(orden as object), clienteId: "00000000-0000-4000-8000-000000000001" });

describe("ordenDesdePapeleria (formato físico)", () => {
  const orden = ordenDesdePapeleria(papeleria);

  it("cumple el contrato de la API", () => {
    const r = validarContrato(orden);
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });

  it("copia los campos del formato impreso", () => {
    expect(orden).toMatchObject({
      producto: "Nota de entrega Farmacia Central",
      categoriaTrabajo: "PAPELERIA",
      productoTerminado: "TALONARIO",
      sustrato: "Papel Químico 56 g",
      tintas: ["Negro", "Pantone 186 C"],
      acabados: ["Numerado", "Perforación horizontal"],
      especificaciones: {
        tipoDocumento: "NE",
        formato: "TALONARIO",
        dobleCara: false,
        partes: 3,
        numeracionPrefijo: "00-",
        numeracionDesde: 1,
        numeracionHasta: 500,
        perforacion: true,
        perforacionOrientacion: "HORIZONTAL",
        coloresTinta: ["NEGRO", "PANTONE"],
        pantone: "186 C",
        tipoPapel: "QUIMICO",
        gramaje: 56,
        tamano: "MEDIA_CARTA",
        observaciones: "Logo en Pantone 186",
      },
    });
    expect(orden.montoTotal).toBeGreaterThan(0);
  });

  it("guarda la fecha como ISO al mediodía del día elegido", () => {
    expect(formatDate(orden.fechaEntrega)).toBe(formatDate(entrega));
    expect(orden.fechaEntrega).toMatch(/T16:00:00\.000Z$/);
  });

  it("un Block ingresa como Block al almacén", () => {
    expect(ordenDesdePapeleria({ ...papeleria, formato: "BLOCK" }).productoTerminado).toBe("BLOCK");
  });

  it("omite la numeración cuando está desactivada", () => {
    const sinNumeracion = ordenDesdePapeleria({ ...papeleria, usaNumeracion: false });
    expect(sinNumeracion.especificaciones?.numeracionDesde).toBeUndefined();
    expect(sinNumeracion.acabados).not.toContain("Numerado");
  });
});

describe("ordenDesdeGranFormato", () => {
  const valores = granFormatoSchema.parse({
    ...GRAN_FORMATO_DEFAULTS,
    clienteId: CLIENTE,
    producto: "Pendón feria",
    sustratoId: "mat-lona",
    acabados: ["Laminado mate", "Corte con plotter"],
    fechaEntrega: entrega,
  });
  const orden = ordenDesdeGranFormato(valores, INSUMOS);

  it("usa el insumo real y solo los acabados del servicio", () => {
    expect(orden).toMatchObject({
      sustrato: "Lona front 13 oz",
      acabados: ["Laminado mate", "Corte con plotter"],
      categoriaTrabajo: "GRAN_FORMATO",
    });
    expect(orden).not.toHaveProperty("maquina");
    expect(orden.especificaciones).toMatchObject({ ancho: 1, alto: 2, unidadDimension: "m", resolucionDpi: 720 });
    expect(validarContrato(orden).success).toBe(true);
    expect(aMilimetros(1.5, "m")).toBe(1500);
    expect(aMilimetros(80, "cm")).toBe(800);
  });

  it("rechaza acabados fuera del servicio", () => {
    const r = granFormatoSchema.safeParse({ ...valores, acabados: ["Ojales metálicos"] });
    expect(r.success).toBe(false);
  });

  it("no trae acabados ni sustrato marcados de antemano", () => {
    expect(GRAN_FORMATO_DEFAULTS.acabados).toEqual([]);
    expect(GRAN_FORMATO_DEFAULTS.sustratoId).toBe("");
  });
});

describe("ordenDesdeFichaGeneral", () => {
  it("separa descripción y observaciones", () => {
    const valores = ordenTrabajoSchema.parse({
      ...ORDEN_TRABAJO_DEFAULTS,
      clienteId: CLIENTE,
      producto: "Catálogo",
      descripcion: "16 páginas",
      observaciones: "Prueba de color antes de tirar",
      acabados: ["barniz-uv"],
      fechaEntrega: entrega,
    });
    const orden = ordenDesdeFichaGeneral(valores);
    expect(orden).toMatchObject({
      descripcion: "16 páginas",
      categoriaTrabajo: "GENERAL",
      acabados: ["Barniz UV"],
      especificaciones: { observaciones: "Prueba de color antes de tirar" },
    });
  });
});

describe("esquemas de las fichas", () => {
  it("rechazan una fecha de entrega pasada", () => {
    const r = papeleriaSchema.safeParse({ ...papeleria, fechaEntrega: fechaEnDias(-1) });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ["fechaEntrega"] });
  });

  it("el formato en blanco no viene marcado: exige tipo, presentación, tinta, papel y tamaño", () => {
    const r = papeleriaSchema.safeParse({
      ...PAPELERIA_DEFAULTS,
      clienteId: CLIENTE,
      nombreDocumento: "Factura",
      fechaEntrega: entrega,
    });
    expect(r.success).toBe(false);
    const campos = r.error?.issues.map((i) => i.path.join("."));
    expect(campos).toEqual(expect.arrayContaining(["tipoDocumento", "formato", "coloresTinta", "tipoPapel", "tamano"]));
  });

  it("no bloquean el envío si la numeración está desactivada y vacía", () => {
    const r = papeleriaSchema.safeParse({
      ...papeleria,
      usaNumeracion: false,
      numeracionDesde: Number.NaN,
      numeracionHasta: Number.NaN,
    });
    expect(r.success).toBe(true);
  });

  it("exigen la numeración cuando está activada", () => {
    const r = papeleriaSchema.safeParse({ ...papeleria, numeracionHasta: Number.NaN });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join("."))).toContain("numeracionHasta");
  });

  it("piden el detalle de las casillas 'Otro', Pantone y perforación", () => {
    const r = papeleriaSchema.safeParse({
      ...papeleria,
      tipoDocumento: "OTRO",
      tipoPapel: "OTRO",
      tamano: "OTRO",
      pantone: "",
      perforacionOrientacion: undefined,
    });
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual(
      expect.arrayContaining(["tipoDocumentoOtro", "tipoPapelOtro", "tamanoOtro", "pantone", "perforacionOrientacion"]),
    );
  });

  it("nombresAcabados ignora identificadores desconocidos", () => {
    expect(nombresAcabados(["ojales", "no-existe"])).toEqual(["Ojales metálicos"]);
  });
});
