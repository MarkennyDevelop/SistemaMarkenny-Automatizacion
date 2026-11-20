import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { ApiError, crearClienteApi, type RespuestaDe } from "./index";

const UUID = "11111111-1111-4111-8111-111111111111";
const FECHA = "2026-11-20T12:00:00.000Z";

function respuestaJson(cuerpo: unknown, estado = 200) {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  });
}

const usuario = {
  id: UUID,
  nombre: "Kenny Hernández",
  email: "admin@markenny.com",
  telefono: null,
  cargo: "Gerente",
  rol: "ADMIN",
  activo: true,
  creadoEn: FECHA,
  ultimoAcceso: null,
  creadoPor: null,
};

describe("tipos inferidos desde el contrato", () => {
  it("las respuestas no son any", () => {
    expectTypeOf<RespuestaDe<"sesionActual">["rol"]>().toEqualTypeOf<"ADMIN" | "VENDEDOR" | "PRODUCCION">();
    expectTypeOf<RespuestaDe<"listarOrdenes">[number]["fase"]>().toEqualTypeOf<
      "EN_PROCESO" | "EN_REVISION" | "FINALIZADO" | "EMPAQUETADO"
    >();
    expectTypeOf<RespuestaDe<"logout">>().toEqualTypeOf<void>();
  });

  it("los errores de forma se detectan en compilación", () => {
    const api = crearClienteApi({ fetch: vi.fn() });
    // @ts-expect-error falta el cuerpo obligatorio del login
    void (() => api.login());
    type Login = Parameters<typeof api.login>[0];
    // @ts-expect-error "EMPACADO" ya no es una fase válida
    const mala: Parameters<typeof api.cambiarFaseOrden>[0] = { params: { id: UUID }, body: { fase: "EMPACADO" } };
    expectTypeOf<Login>().toHaveProperty("body");
    void mala;
  });
});

describe("crearClienteApi", () => {
  it("llama al endpoint con cookie, cuerpo validado y respuesta validada", async () => {
    const fetch = vi.fn().mockResolvedValue(respuestaJson(usuario));
    const api = crearClienteApi({ baseUrl: "http://api.local/", fetch });
    const u = await api.login({ body: { email: " Admin@Markenny.com ", password: "Markenny2026" } });
    expect(u.nombre).toBe("Kenny Hernández");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://api.local/api/v1/auth/login");
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(init.body)).toEqual({ email: "admin@markenny.com", password: "Markenny2026" });
  });

  it("construye params y query, omitiendo valores vacíos", async () => {
    const fetch = vi.fn().mockResolvedValue(respuestaJson([]));
    const api = crearClienteApi({ fetch });
    await api.listarOrdenes({ query: { fase: "EN_REVISION", q: "" } });
    expect(fetch.mock.calls[0][0]).toBe("/api/v1/ordenes?fase=EN_REVISION&limite=200");
  });

  it("no envía nada si la entrada no cumple el contrato", async () => {
    const fetch = vi.fn();
    const api = crearClienteApi({ fetch });
    await expect(
      api.cambiarFaseOrden({ params: { id: "no-uuid" }, body: { fase: "EN_REVISION" } }),
    ).rejects.toMatchObject({ codigo: "CONTRATO_INVALIDO" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("convierte el error de la API en ApiError con su código", async () => {
    const fetch = vi.fn().mockResolvedValue(
      respuestaJson({ error: "TRANSICION_NO_PERMITIDA", mensaje: "No se puede saltar fases" }, 409),
    );
    const api = crearClienteApi({ fetch });
    const error = await api
      .cambiarFaseOrden({ params: { id: UUID }, body: { fase: "FINALIZADO" } })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ estado: 409, codigo: "TRANSICION_NO_PERMITIDA", message: "No se puede saltar fases" });
  });

  it("avisa de sesión expirada en rutas protegidas, no en el login", async () => {
    const onNoAutenticado = vi.fn();
    const fetch = vi.fn().mockImplementation(async () =>
      respuestaJson({ error: "NO_AUTENTICADO", mensaje: "Inicia sesión" }, 401),
    );
    const api = crearClienteApi({ fetch, onNoAutenticado });
    await api.listarClientes().catch(() => {});
    await api.login({ body: { email: "a@b.com", password: "x" } }).catch(() => {});
    expect(onNoAutenticado).toHaveBeenCalledTimes(1);
  });

  it("detecta una respuesta del servidor con forma distinta al contrato", async () => {
    const fetch = vi.fn().mockResolvedValue(respuestaJson({ ...usuario, rol: "ADMINISTRADOR" }));
    const api = crearClienteApi({ fetch });
    await expect(api.sesionActual()).rejects.toMatchObject({ codigo: "CONTRATO_INVALIDO" });
  });

  it("responde 204 sin cuerpo y reporta falta de conexión", async () => {
    const api = crearClienteApi({ fetch: vi.fn().mockResolvedValue(new Response(null, { status: 204 })) });
    await expect(api.logout()).resolves.toBeUndefined();
    const sinRed = crearClienteApi({ fetch: vi.fn().mockRejectedValue(new TypeError("fetch failed")) });
    await expect(sinRed.listarClientes()).rejects.toMatchObject({ codigo: "SIN_CONEXION" });
  });
});
