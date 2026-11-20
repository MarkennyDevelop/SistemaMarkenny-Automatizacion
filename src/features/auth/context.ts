import { createContext, useContext } from "react";
import type { UsuarioPublico } from "@/shared/domain";
import type { LoginFormValues, SetupAdminFormValues } from "./types/schemas";

export interface AuthContextValue {
  usuario: UsuarioPublico | null;
  cargando: boolean;
  login: (values: LoginFormValues) => Promise<UsuarioPublico>;
  registrarAdministrador: (
    values: SetupAdminFormValues,
  ) => Promise<UsuarioPublico>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  }
  return contexto;
}
