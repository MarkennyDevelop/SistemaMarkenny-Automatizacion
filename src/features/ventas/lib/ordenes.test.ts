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
  SustratoNoDisponibleError,
  estimarConsumoSustrato,
} from "./ordenes";

const CLIENTE = "cli-001";
const entrega = fechaEnDias(5);

const papeleria = papeleriaSchema.parse({
  ...PAPELERIA_DEFAULTS,
  clienteId: CLIENTE,
  nombreDocumento: "Nota de entrega Farmacia Central",
  tipoDocumento: "NE",
  cantidad: 10,
  orientacion: "VERTICAL",
  perforacion: true,
  formato: "TALONARIO",
  partes: 3,
  usaNumeracion: true,
  numeracionDesde: 1,
  numeracionHasta: 500,
  usaNumeroControl: true,
  numeroControlDesde: 1,
  numeroControlHasta: 500,
  coloresTinta: ["NEGRO", "OTRO"],
  colorTintaOtro: "Dorado",
  tipoPapel: "QUIMICO",
  gramaje: 56,
  tamano: "MEDIA_CARTA",
  fechaEntrega: entrega,
  observaciones: "  Logo centrado  ",
});

const INSUMOS: InsumoDisponible[] = [
  { id: "00000000-0000-4000-8000-0000000000a1", nombre: "Lona front 13 oz", categoria: "LONA", subtipo: null, unidad: "rollo", stock: 6, disponible: true, rendimiento: 80, mermaPorcentaje: 3 },
  { id: "00000000-0000-4000-8000-0000000000a2", nombre: "Vinil blanco", categoria: "VINIL", subtipo: null, unidad: "rollo", stock: 0, disponible: false, rendimiento: 61, mermaPorcentaje: 5 },
];

/** La orden que arma el frontend debe pasar el esquema real del contrato. */
const validarContrato = (orden: unknown) =>
  NuevaOrdenSchema.safeParse({ ...(orden as object), clienteId: "00000000-0000-4000-8000-000000000001" });

describe("ordenDesdePapeleria (formato impreso)", () => {
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
      tintas: ["Negro", "Dorado"],
      acabados: ["Numerado", "Número de control", "Perforación"],
      especificaciones: {
        tipoDocumento: "NE",
        orientacion: "VERTICAL",
        perforacion: true,
        formato: "TALONARIO",
        dobleCara: false,
        partes: 3,
        numeracionDesde: 1,
        numeracionHasta: 500,
        numeroControlPrefijo: "00-",
        numeroControlDesde: 1,
        numeroControlHasta: 500,
        coloresTinta: ["NEGRO", "OTRO"],
        colorTintaOtro: "Dorado",
        tipoPapel: "QUIMICO",
        gramaje: 56,
        tamano: "MEDIA_CARTA",
        observaciones: "Logo centrado",
      },
    });
    expect(orden.especificaciones).not.toHaveProperty("engomado");
    expect(orden.montoTotal).toBeGreaterThan(0);
  });

  it("guarda la fecha como ISO al mediodía del día elegido", () => {
    expect(formatDate(orden.fechaEntrega)).toBe(formatDate(entrega));
    expect(orden.fechaEntrega).toMatch(/T16:00:00\.000Z$/);
  });

  it("un Block lleva su engomado y entra como Block al almacén", () => {
    const block = ordenDesdePapeleria({ ...papeleria, formato: "BLOCK", engomado: "IZQUIERDA" });
    expect(block.productoTerminado).toBe("BLOCK");
    expect(block.especificaciones).toMatchObject({ formato: "BLOCK", engomado: "IZQUIERDA" });
    expect(block.acabados).toContain("Engomado izquierda");
    expect(validarContrato(block).success).toBe(true);
  });

  it("las tarjetas de presentación no llevan talonario, partes, numeración ni engomado", () => {
    const tarjetas = ordenDesdePapeleria({
      ...papeleria,
      tipoDocumento: "TARJETAS",
      formato: "BLOCK",
      engomado: "ARRIBA",
      tamano: "TABLOIDE",
    });
    expect(tarjetas.productoTerminado).toBe("TARJETAS_PRESENTACION");
    for (const campo of ["formato", "partes", "engomado", "numeracionDesde", "numeroControlDesde"]) {
      expect(tarjetas.especificaciones).not.toHaveProperty(campo);
    }
    expect(validarContrato(tarjetas).success).toBe(true);
  });

  it("omite la numeración y el número de control cuando están desactivados", () => {
    const sin = ordenDesdePapeleria({ ...papeleria, usaNumeracion: false, usaNumeroControl: false });
    expect(sin.especificaciones).not.toHaveProperty("numeracionDesde");
    expect(sin.especificaciones).not.toHaveProperty("numeroControlDesde");
    expect(sin.acabados).not.toContain("Numerado");
  });
});

describe("ordenDesdeGranFormato", () => {
  const valores = granFormatoSchema.parse({
    ...GRAN_FORMATO_DEFAULTS,
    clienteId: CLIENTE,
    producto: "Pendón feria",
    tipoGranFormato: "PENDON",
    ancho: 1,
    alto: 2,
    unidadDimension: "m",
    sustratoId: "00000000-0000-4000-8000-0000000000a1",
    acabados: ["Corte con plotter"],
    fechaEntrega: entrega,
  });
  const orden = ordenDesdeGranFormato(valores, INSUMOS);

  it("usa el insumo real del almacén y solo corte con plotter", () => {
    expect(orden).toMatchObject({
      sustrato: "Lona front 13 oz",
      acabados: ["Corte con plotter"],
      categoriaTrabajo: "GRAN_FORMATO",
      materialId: "00000000-0000-4000-8000-0000000000a1",
    });
    expect(orden).not.toHaveProperty("maquina");
    expect(orden.especificaciones).toMatchObject({ ancho: 1, alto: 2, unidadDimension: "m", resolucionDpi: 720 });
    expect(validarContrato(orden).success).toBe(true);
    expect(aMilimetros(1.5, "m")).toBe(1500);
    expect(aMilimetros(80, "cm")).toBe(800);
  });

  it("estima el consumo con las reglas del servidor y avisa si no alcanza", () => {
    const [lona] = INSUMOS;
    // 1 × 2 m = 2 m²; +3 % = 2,06 m² ÷ 80 = 0,02575 → 0,026 rollo
    expect(estimarConsumoSustrato(lona, { ancho: 1, alto: 2, unidadDimension: "m", cantidad: 1 })).toEqual({
      m2: 2,
      cantidad: 0.026,
      alcanza: true,
    });
    expect(estimarConsumoSustrato(lona, { ancho: 10, alto: 10, unidadDimension: "m", cantidad: 50 })?.alcanza).toBe(false);
    expect(estimarConsumoSustrato({ ...lona, rendimiento: null }, { ancho: 1, alto: 2, unidadDimension: "m", cantidad: 1 })).toEqual({
      m2: 2,
      cantidad: null,
      alcanza: true,
    });
    expect(estimarConsumoSustrato(lona, { ancho: 1, cantidad: 1 })).toBeNull();
  });

  it("el laminado mate o brillante ya no es un acabado: viene en el sustrato", () => {
    for (const acabado of ["Laminado mate", "Laminado brillante", "Ojales metálicos"]) {
      expect(granFormatoSchema.safeParse({ ...valores, acabados: [acabado] }).success).toBe(false);
    }
  });

  it("no arma la orden con un sustrato agotado o que no existe en almacén", () => {
    expect(() => ordenDesdeGranFormato({ ...valores, sustratoId: "00000000-0000-4000-8000-0000000000a2" }, INSUMOS)).toThrow(
      SustratoNoDisponibleError,
    );
    expect(() => ordenDesdeGranFormato({ ...valores, sustratoId: "no-existe" }, INSUMOS)).toThrow(
      SustratoNoDisponibleError,
    );
  });

  it("la ficha llega en blanco: sin tipo, medidas, unidad, sustrato ni acabado", () => {
    expect(GRAN_FORMATO_DEFAULTS).not.toHaveProperty("tipoGranFormato");
    expect(GRAN_FORMATO_DEFAULTS).not.toHaveProperty("unidadDimension");
    expect(GRAN_FORMATO_DEFAULTS).not.toHaveProperty("ancho");
    expect(GRAN_FORMATO_DEFAULTS.acabados).toEqual([]);
    expect(GRAN_FORMATO_DEFAULTS.sustratoId).toBe("");
    const r = granFormatoSchema.safeParse({ ...GRAN_FORMATO_DEFAULTS, clienteId: CLIENTE, producto: "Pendón", fechaEntrega: entrega });
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual(
      expect.arrayContaining(["tipoGranFormato", "unidadDimension", "ancho", "alto", "sustratoId"]),
    );
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

  it("el formato en blanco no viene marcado: exige tipo, vista, presentación, tinta, papel y tamaño", () => {
    const r = papeleriaSchema.safeParse({
      ...PAPELERIA_DEFAULTS,
      clienteId: CLIENTE,
      nombreDocumento: "Factura",
      fechaEntrega: entrega,
    });
    expect(r.success).toBe(false);
    const campos = r.error?.issues.map((i) => i.path.join("."));
    expect(campos).toEqual(
      expect.arrayContaining(["tipoDocumento", "orientacion", "coloresTinta", "tipoPapel", "tamano"]),
    );
  });

  it("exige Talonario o Block salvo en tarjetas de presentación", () => {
    const sinFormato = { ...papeleria, formato: undefined };
    expect(papeleriaSchema.safeParse(sinFormato).error?.issues.map((i) => i.path.join("."))).toContain("formato");
    expect(papeleriaSchema.safeParse({ ...sinFormato, tipoDocumento: "TARJETAS" }).success).toBe(true);
  });

  it("el engomado solo se admite en blocks", () => {
    const r = papeleriaSchema.safeParse({ ...papeleria, engomado: "ARRIBA" });
    expect(r.error?.issues.map((i) => i.path.join("."))).toContain("engomado");
  });

  it("no bloquean el envío si la numeración está desactivada y vacía", () => {
    const r = papeleriaSchema.safeParse({
      ...papeleria,
      usaNumeracion: false,
      numeracionDesde: Number.NaN,
      numeracionHasta: Number.NaN,
      usaNumeroControl: false,
      numeroControlDesde: Number.NaN,
    });
    expect(r.success).toBe(true);
  });

  it("validan el N° del encabezado y el de control por separado", () => {
    const r = papeleriaSchema.safeParse({ ...papeleria, numeracionHasta: Number.NaN, numeroControlHasta: 0 });
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual(
      expect.arrayContaining(["numeracionHasta", "numeroControlHasta"]),
    );
  });

  it("piden el nombre en las casillas 'Otro'", () => {
    const r = papeleriaSchema.safeParse({
      ...papeleria,
      tipoDocumento: "OTRO",
      tipoPapel: "OTRO",
      tamano: "OTRO",
      colorTintaOtro: "",
    });
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual(
      expect.arrayContaining(["tipoDocumentoOtro", "tipoPapelOtro", "tamanoOtro", "colorTintaOtro"]),
    );
  });

  it("nombresAcabados ignora identificadores desconocidos", () => {
    expect(nombresAcabados(["ojales", "no-existe"])).toEqual(["Ojales metálicos"]);
  });
});
