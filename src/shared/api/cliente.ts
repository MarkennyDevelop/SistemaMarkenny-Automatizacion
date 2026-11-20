/**
 * Cliente único de la API del backend (Fastify).
 *
 * Generado desde el contrato (`packages/contrato`): cada método valida lo que
 * envía y lo que recibe. La sesión viaja en una cookie httpOnly; el navegador
 * la envía solo, el código nunca ve el token.
 *
 * En desarrollo, Vite reenvía `/api` al backend (ver `vite.config.ts`).
 */
import { ApiError, crearClienteApi } from "@markenny/cliente-http";

const oyentesSesionExpirada = new Set<() => void>();

export const api = crearClienteApi({
  baseUrl: import.meta.env.VITE_API_URL ?? "",
  onNoAutenticado: () => oyentesSesionExpirada.forEach((oyente) => oyente()),
});

/** Se ejecuta cuando el backend responde 401 en una ruta protegida. */
export function alExpirarSesion(oyente: () => void): () => void {
  oyentesSesionExpirada.add(oyente);
  return () => {
    oyentesSesionExpirada.delete(oyente);
  };
}

/** Mensaje legible de cualquier error (los de la API ya vienen en español). */
export function mensajeDeError(error: unknown, porDefecto = "Intenta nuevamente."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return porDefecto;
}

export { ApiError };
