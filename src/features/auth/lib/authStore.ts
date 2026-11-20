import type { Rol } from "@/shared/domain";

/**
 * Persistencia local de identidad mientras no existe el backend.
 *
 * El día que Fastify exponga /auth, este archivo se sustituye por llamadas HTTP.
 * El hash es SHA-256 con sal por usuario; sigue siendo un mock local y no debe
 * considerarse seguridad de producción.
 */

export const AUTH_KEY = "markenny.print-mis.auth.v1";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  cargo?: string;
  rol: Rol;
  activo: boolean;
  passwordHash: string;
  salt: string;
  creadoEn: string;
  ultimoAcceso?: string;
  creadoPor?: string;
}

export type UsuarioPublico = Omit<Usuario, "passwordHash" | "salt">;

export interface Sesion {
  usuarioId: string;
  iniciadoEn: string;
}

export interface AuthDatabase {
  usuarios: Usuario[];
  sesion: Sesion | null;
}

const EMPTY: AuthDatabase = { usuarios: [], sesion: null };

export function leerAuth(): AuthDatabase {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<AuthDatabase>;
    if (!Array.isArray(parsed.usuarios)) return { ...EMPTY };
    return {
      usuarios: parsed.usuarios,
      sesion: parsed.sesion ?? null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function escribirAuth(db: AuthDatabase) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(db));
}

export function sinSecretos(usuario: Usuario): UsuarioPublico {
  const { passwordHash: _hash, salt: _salt, ...publico } = usuario;
  return publico;
}

export function crearSalt(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }
  return Math.random().toString(36).slice(2);
}

/** SHA-256 hex con respaldo determinista para contextos sin Web Crypto. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const material = `${salt}::${password}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const bytes = new TextEncoder().encode(material);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      /* cae al respaldo */
    }
  }
  let hash = 5381;
  for (let i = 0; i < material.length; i += 1) {
    hash = (hash * 33) ^ material.charCodeAt(i);
  }
  return `fallback-${(hash >>> 0).toString(16)}`;
}

export function buscarPorEmail(db: AuthDatabase, email: string): Usuario | undefined {
  const normalizado = email.trim().toLowerCase();
  return db.usuarios.find((usuario) => usuario.email === normalizado);
}
