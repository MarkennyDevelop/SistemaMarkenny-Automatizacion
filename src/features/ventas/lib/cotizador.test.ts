import { describe, expect, it } from "vitest";
import { calcularCotizacion } from "./cotizador";

const base = {
  tecnologia: "OFFSET" as const,
  tiraje: 1000,
  anchoMm: 210,
  altoMm: 297,
  tintasTiro: 4,
  tintasRetiro: 0,
  sustratoId: "couche-150",
  acabados: [] as string[],
  margen: 35,
};

describe("calcularCotizacion", () => {
  it("calcula mermas de offset: 150 pliegos por tinta + 2 % de tiraje", () => {
    const r = calcularCotizacion(base);
    expect(r.mermas).toBe(4 * 150 + 20);
    expect(r.totalPliegos).toBe(1620);
    expect(r.total).toBeCloseTo(r.costoDirecto * 1.35, 1);
  });

  it("un campo vacío (NaN) no produce NaN en el resumen", () => {
    const r = calcularCotizacion({ ...base, tiraje: Number.NaN });
    expect(Number.isNaN(r.total)).toBe(false);
    expect(r.costoUnitario).toBe(0);
  });
});
