import { beforeEach, describe, expect, it, vi } from "vitest";
import { instalarLocalStorage } from "@/test/localStorage";
import type { NuevaOrdenTrabajo } from "@/shared/domain";

const almacen = instalarLocalStorage();
const { mockDb } = await import("./db");

/** El mock simula latencia con setTimeout: se adelanta el reloj falso. */
async function ejecutar<T>(promesa: Promise<T>): Promise<T> {
  const resultado = promesa.then(
    (valor) => ({ ok: true as const, valor }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.runAllTimersAsync();
  const r = await resultado;
  if (!r.ok) throw r.error;
  return r.valor;
}

const VENDEDOR = { usuario: "Valeria Rondón", rol: "VENDEDOR" as const };
const PLANTA = { usuario: "Luis Pérez", rol: "PRODUCCION" as const };

function nuevaOrden(clienteId: string): NuevaOrdenTrabajo {
  return {
    clienteId,
    producto: "Talonarios",
    descripcion: "",
    tecnologia: "OFFSET",
    prioridad: "MEDIA",
    maquina: "Heidelberg SM 52",
    cantidad: 100,
    fechaEntrega: "2026-12-01T16:00:00.000Z",
    montoTotal: 50,
    sustrato: "Bond 75 g",
    tintas: ["CMYK proceso"],
    acabados: ["Numerado"],
    categoriaTrabajo: "PAPELERIA",
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  almacen.clear();
});

describe("mockDb · órdenes", () => {
  it("rechaza una orden con un cliente inexistente", async () => {
    await expect(ejecutar(mockDb.crearOrden(nuevaOrden("no-existe"), VENDEDOR))).rejects.toThrow(
      /cliente seleccionado no existe/,
    );
  });

  it("solo ventas o administración crean órdenes; el evento lleva el rol real", async () => {
    const [cliente] = await ejecutar(mockDb.listarClientes());
    await expect(ejecutar(mockDb.crearOrden(nuevaOrden(cliente.id), PLANTA))).rejects.toThrow();

    const admin = { usuario: "Kenny Hernández", rol: "ADMIN" as const };
    const orden = await ejecutar(mockDb.crearOrden(nuevaOrden(cliente.id), admin));
    expect(orden.historial?.[0]).toMatchObject({ usuario: "Kenny Hernández", rol: "ADMIN" });
    expect(orden.vendedor).toBe("Kenny Hernández");

    const [actualizado] = (await ejecutar(mockDb.listarClientes())).filter((c) => c.id === cliente.id);
    expect(actualizado.ordenesActivas).toBe(cliente.ordenesActivas + 1);
  });

  it("avanza las 4 fases en orden, sin saltos, y solo producción o admin", async () => {
    const [cliente] = await ejecutar(mockDb.listarClientes());
    const orden = await ejecutar(mockDb.crearOrden(nuevaOrden(cliente.id), VENDEDOR));

    await expect(ejecutar(mockDb.actualizarFaseOrden(orden.id, "EN_REVISION", VENDEDOR))).rejects.toThrow(
      /Solo producción/,
    );
    await expect(ejecutar(mockDb.actualizarFaseOrden(orden.id, "FINALIZADO", PLANTA))).rejects.toThrow(
      /En Revisión/,
    );

    for (const fase of ["EN_REVISION", "FINALIZADO", "EMPAQUETADO"] as const) {
      await ejecutar(mockDb.actualizarFaseOrden(orden.id, fase, PLANTA, `ok ${fase}`));
    }
    const final = (await ejecutar(mockDb.listarOrdenes())).find((o) => o.id === orden.id)!;
    expect(final.fase).toBe("EMPAQUETADO");
    expect(final.historial?.map((e) => e.fase)).toEqual(["EN_PROCESO", "EN_REVISION", "FINALIZADO", "EMPAQUETADO"]);

    await expect(ejecutar(mockDb.actualizarFaseOrden(orden.id, "EN_PROCESO", PLANTA))).rejects.toThrow(/empaquetada/);
    const avisos = await ejecutar(mockDb.listarNotificaciones("VENDEDOR"));
    expect(avisos.filter((n) => n.ordenId === orden.id)).toHaveLength(2);
  });

  it("migra la fase antigua EMPACADO a EMPAQUETADO al leer datos guardados", async () => {
    await ejecutar(mockDb.listarOrdenes()); // siembra
    const guardado = JSON.parse(almacen.getItem("markenny.print-mis.db.v1")!);
    guardado.ordenes[0].fase = "EMPACADO";
    guardado.ordenes[0].historial = [{ ...guardado.ordenes[0].historial[0], fase: "EMPACADO", anterior: "EMPACADO" }];
    almacen.setItem("markenny.print-mis.db.v1", JSON.stringify(guardado));

    const [primera] = await ejecutar(mockDb.listarOrdenes());
    expect(primera.fase).toBe("EMPAQUETADO");
    expect(primera.historial?.[0]).toMatchObject({ fase: "EMPAQUETADO", anterior: "EMPAQUETADO" });
  });
});

describe("mockDb · inventario", () => {
  it("rechaza una salida mayor al stock en lugar de dejarlo en cero", async () => {
    const [material] = await ejecutar(mockDb.listarInventario());
    await expect(
      ejecutar(
        mockDb.registrarMovimiento({
          materialId: material.id,
          tipo: "SALIDA",
          cantidad: material.stock + 1,
          motivo: "Prueba",
          usuario: "Luis Pérez",
        }),
      ),
    ).rejects.toThrow(/Stock insuficiente/);
    const [igual] = (await ejecutar(mockDb.listarInventario())).filter((m) => m.id === material.id);
    expect(igual.stock).toBe(material.stock);
  });

  it("una entrada suma al stock y queda auditada", async () => {
    const [material] = await ejecutar(mockDb.listarInventario());
    const mov = await ejecutar(
      mockDb.registrarMovimiento({ materialId: material.id, tipo: "ENTRADA", cantidad: 10, motivo: "Compra", usuario: "Luis Pérez" }),
    );
    expect(mov).toMatchObject({ tipo: "ENTRADA", cantidad: 10, usuario: "Luis Pérez" });
    const [actual] = (await ejecutar(mockDb.listarInventario())).filter((m) => m.id === material.id);
    expect(actual.stock).toBe(material.stock + 10);
  });
});
