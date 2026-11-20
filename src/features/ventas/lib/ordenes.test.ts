import { describe, expect, it } from "vitest";
import { fechaEnDias } from "@/lib/fechas";
import { formatDate } from "@/lib/utils";
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
  producto: "Facturas fiscales 2 partes",
  fechaEntrega: entrega,
  observaciones: "  Logo en Pantone 032  ",
  tintasPantone: ["Pantone 032 C"],
});

describe("ordenDesdePapeleria", () => {
  const orden = ordenDesdePapeleria(papeleria, "Valeria Rondón");

  it("envía nombres de acabados, no identificadores", () => {
    expect(orden.acabados).toEqual(["Numerado", "Engrapado", "Perforado"]);
  });

  it("guarda la fecha como ISO al mediodía del día elegido", () => {
    expect(formatDate(orden.fechaEntrega)).toBe(formatDate(entrega));
    expect(orden.fechaEntrega).toMatch(/T16:00:00\.000Z$/);
  });

  it("conserva numeración, partes, tintas y observaciones en la ficha técnica", () => {
    expect(orden).toMatchObject({
      categoriaTrabajo: "PAPELERIA",
      vendedor: "Valeria Rondón",
      tintas: ["Pantone 032 C"],
      especificaciones: {
        tipoPapeleria: "FACTURA",
        partes: 2,
        numeracionDesde: 1,
        numeracionHasta: 1000,
        tintasTiro: 2,
        gramaje: 75,
        observaciones: "Logo en Pantone 032",
      },
    });
    expect(orden.montoTotal).toBeGreaterThan(0);
  });

  it("omite la numeración cuando está desactivada", () => {
    const sinNumeracion = ordenDesdePapeleria({ ...papeleria, usaNumeracion: false });
    expect(sinNumeracion.especificaciones?.numeracionDesde).toBeUndefined();
    expect(sinNumeracion.especificaciones?.numeracionHasta).toBeUndefined();
  });
});

describe("ordenDesdeGranFormato", () => {
  it("convierte medidas, mantiene unidad y nombra los acabados", () => {
    const valores = granFormatoSchema.parse({
      ...GRAN_FORMATO_DEFAULTS,
      clienteId: CLIENTE,
      producto: "Pendón feria",
      fechaEntrega: entrega,
    });
    const orden = ordenDesdeGranFormato(valores);
    expect(orden.acabados).toEqual(["Ojales metálicos", "Refuerzo perimetral"]);
    expect(orden.especificaciones).toMatchObject({ ancho: 1, alto: 2, unidadDimension: "m", resolucionDpi: 720 });
    expect(orden.categoriaTrabajo).toBe("GRAN_FORMATO");
    expect(aMilimetros(1.5, "m")).toBe(1500);
    expect(aMilimetros(80, "cm")).toBe(800);
  });
});

describe("ordenDesdeFichaGeneral", () => {
  it("separa descripción y observaciones e identifica al vendedor", () => {
    const valores = ordenTrabajoSchema.parse({
      ...ORDEN_TRABAJO_DEFAULTS,
      clienteId: CLIENTE,
      producto: "Catálogo",
      descripcion: "16 páginas",
      observaciones: "Prueba de color antes de tirar",
      acabados: ["barniz-uv"],
      fechaEntrega: entrega,
    });
    const orden = ordenDesdeFichaGeneral(valores, "Kenny Hernández");
    expect(orden).toMatchObject({
      descripcion: "16 páginas",
      categoriaTrabajo: "GENERAL",
      vendedor: "Kenny Hernández",
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

  it("nombresAcabados ignora identificadores desconocidos", () => {
    expect(nombresAcabados(["ojales", "no-existe"])).toEqual(["Ojales metálicos"]);
  });
});
