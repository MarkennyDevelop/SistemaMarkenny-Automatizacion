/**
 * Cliente HTTP del frontend para la API del Print MIS.
 *
 * Genera un método por cada endpoint de `@markenny/contrato`, con tipos de
 * entrada y salida inferidos de los esquemas Zod. Así el frontend no puede
 * llamar a una ruta inexistente ni enviar un cuerpo con otra forma: el error
 * aparece en `tsc`, no en producción.
 *
 * - Valida la entrada antes de enviarla (aplica los mismos defaults que el servidor).
 * - Valida la respuesta: si el backend cambia de forma, falla aquí con un error claro.
 * - Sesión por cookie httpOnly (`credentials: "include"`): no guarda tokens en JS.
 */
import { z, type ZodTypeAny } from "zod";
import {
  ENDPOINTS,
  ErrorApiSchema,
  PREFIJO_API,
  SSE_PRODUCCION,
  construirRuta,
} from "@markenny/contrato";

type Endpoints = typeof ENDPOINTS;
export type NombreEndpoint = keyof Endpoints;

type EntradaDe<E> = (E extends { params: ZodTypeAny } ? { params: z.input<E["params"]> } : unknown) &
  (E extends { query: ZodTypeAny } ? { query?: z.input<E["query"]> } : unknown) &
  (E extends { body: ZodTypeAny } ? { body: z.input<E["body"]> } : unknown);

type SalidaDe<E> = E extends { respuesta: infer R } ? (R extends ZodTypeAny ? z.output<R> : void) : void;

type TieneEntrada<E> = E extends { params: ZodTypeAny } | { body: ZodTypeAny } ? true : false;

/** Firma de cada método: sin argumento si el endpoint no recibe datos obligatorios. */
type Metodo<E> = TieneEntrada<E> extends true
  ? (entrada: EntradaDe<E>, opciones?: OpcionesPeticion) => Promise<SalidaDe<E>>
  : (entrada?: EntradaDe<E>, opciones?: OpcionesPeticion) => Promise<SalidaDe<E>>;

export type ClienteApi = { [K in NombreEndpoint]: Metodo<Endpoints[K]> };

/** Tipo de respuesta de un endpoint, p. ej. `RespuestaDe<"listarOrdenes">`. */
export type RespuestaDe<K extends NombreEndpoint> = SalidaDe<Endpoints[K]>;
/** Tipo de entrada de un endpoint. */
export type EntradaDeEndpoint<K extends NombreEndpoint> = EntradaDe<Endpoints[K]>;

export interface OpcionesPeticion {
  signal?: AbortSignal;
}

export interface OpcionesCliente {
  /** Origen del backend, p. ej. `import.meta.env.VITE_API_URL`. Vacío = mismo origen. */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Se llama ante un 401 en una ruta protegida (sesión expirada). */
  onNoAutenticado?: () => void;
}

/** Error de la API con el código estable del contrato (`TRANSICION_NO_PERMITIDA`, ...). */
export class ApiError extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = "ApiError";
  }
}

function construirQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query)) {
    if (valor !== undefined && valor !== null && valor !== "") parametros.set(clave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

function validar(esquema: ZodTypeAny, datos: unknown, nombre: string, parte: string) {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    throw new ApiError(
      0,
      "CONTRATO_INVALIDO",
      `Datos inválidos para ${nombre} (${parte})`,
      resultado.error.issues.map((issue) => ({
        ruta: issue.path.join("."),
        mensaje: issue.message,
        codigo: issue.code,
      })),
    );
  }
  return resultado.data;
}

export function crearClienteApi(opciones: OpcionesCliente = {}): ClienteApi {
  const baseUrl = (opciones.baseUrl ?? "").replace(/\/$/, "");
  const fetchFn = opciones.fetch ?? globalThis.fetch.bind(globalThis);
  const cliente: Record<string, unknown> = {};

  for (const [nombre, ep] of Object.entries(ENDPOINTS) as [string, Record<string, unknown>][]) {
    const params = ep.params as ZodTypeAny | undefined;
    const query = ep.query as ZodTypeAny | undefined;
    const body = ep.body as ZodTypeAny | undefined;
    const respuesta = ep.respuesta as ZodTypeAny | null;

    cliente[nombre] = async (
      entrada: { params?: unknown; query?: unknown; body?: unknown } = {},
      opcionesPeticion: OpcionesPeticion = {},
    ) => {
      const p = params ? validar(params, entrada.params, nombre, "params") : {};
      const q = query ? validar(query, entrada.query ?? {}, nombre, "query") : undefined;
      const b = body ? validar(body, entrada.body, nombre, "body") : undefined;

      const url = baseUrl + construirRuta(ep, p) + construirQuery(q);
      let res: Response;
      try {
        res = await fetchFn(url, {
          method: ep.metodo as string,
          credentials: "include",
          headers: b !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: b !== undefined ? JSON.stringify(b) : undefined,
          signal: opcionesPeticion.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        throw new ApiError(0, "SIN_CONEXION", "No se pudo conectar con el servidor.");
      }

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        const error = ErrorApiSchema.safeParse(cuerpo);
        if (res.status === 401 && ep.roles !== null) opciones.onNoAutenticado?.();
        throw error.success
          ? new ApiError(res.status, error.data.error, error.data.mensaje, error.data.detalles)
          : new ApiError(res.status, "ERROR_HTTP", `El servidor respondió ${res.status}.`);
      }

      if (!respuesta || res.status === 204) return undefined;
      return validar(respuesta, await res.json(), nombre, "respuesta");
    };
  }

  return cliente as ClienteApi;
}

export type EventoOrdenActualizada = z.output<typeof SSE_PRODUCCION.datos>;

/**
 * Se suscribe al flujo SSE de planta. Devuelve la función para cerrarlo.
 * El navegador reconecta solo si se corta la red.
 */
export function suscribirEventosProduccion(
  alRecibir: (evento: EventoOrdenActualizada) => void,
  opciones: { baseUrl?: string; EventSource?: typeof EventSource } = {},
): () => void {
  const Fuente = opciones.EventSource ?? globalThis.EventSource;
  const url = `${(opciones.baseUrl ?? "").replace(/\/$/, "")}${PREFIJO_API}${SSE_PRODUCCION.ruta}`;
  const fuente = new Fuente(url, { withCredentials: true });
  const manejar = (mensaje: MessageEvent<string>) => {
    try {
      const datos = SSE_PRODUCCION.datos.safeParse(JSON.parse(mensaje.data));
      if (datos.success) alRecibir(datos.data);
    } catch {
      /* mensaje malformado: se ignora */
    }
  };
  fuente.addEventListener(SSE_PRODUCCION.evento, manejar as EventListener);
  return () => {
    fuente.removeEventListener(SSE_PRODUCCION.evento, manejar as EventListener);
    fuente.close();
  };
}
