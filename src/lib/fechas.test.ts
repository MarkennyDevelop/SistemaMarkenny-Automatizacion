import { describe, expect, it } from "vitest";
import { formatDate } from "./utils";
import { esAnteriorAHoy, fechaEnDias, fechaEntregaIso, fechaInputLocal, parseFecha } from "./fechas";

describe("fechas sin desfase de zona horaria (America/Caracas, UTC-4)", () => {
  it("la zona horaria de la prueba es la de Venezuela", () => {
    expect(new Date("2026-11-25T12:00:00Z").getTimezoneOffset()).toBe(240);
  });

  it("muestra el mismo día elegido en el input (antes salía el día anterior)", () => {
    expect(new Intl.DateTimeFormat("es-VE").format(new Date("2026-11-25"))).toContain("24");
    expect(formatDate("2026-11-25")).toContain("25");
  });

  it("parseFecha interpreta 'AAAA-MM-DD' como fecha local", () => {
    const fecha = parseFecha("2026-11-25");
    expect([fecha.getFullYear(), fecha.getMonth(), fecha.getDate()]).toEqual([2026, 10, 25]);
  });

  it("fechaEntregaIso conserva el día al volver a formatear", () => {
    const iso = fechaEntregaIso("2026-11-25");
    expect(iso).toBe("2026-11-25T16:00:00.000Z");
    expect(formatDate(iso)).toContain("25");
  });

  it("fechaInputLocal y fechaEnDias usan el día local, no el de UTC", () => {
    expect(fechaInputLocal(new Date(2026, 10, 25, 22, 30))).toBe("2026-11-25");
    expect(fechaEnDias(0)).toBe(fechaInputLocal());
  });

  it("esAnteriorAHoy", () => {
    expect(esAnteriorAHoy(fechaEnDias(-1))).toBe(true);
    expect(esAnteriorAHoy(fechaEnDias(0))).toBe(false);
    expect(esAnteriorAHoy(fechaEnDias(3))).toBe(false);
  });
});
