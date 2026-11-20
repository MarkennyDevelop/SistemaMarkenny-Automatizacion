import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/queryKeys";
import { authApi } from "../api/authApi";
import { AuthContext } from "../context";
import type { UsuarioPublico } from "../lib/authStore";
import type { LoginFormValues, SetupAdminFormValues } from "../types/schemas";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    authApi
      .sesionActual()
      .then((actual) => {
        if (vigente) setUsuario(actual);
      })
      .catch(() => {
        if (vigente) setUsuario(null);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const login = useCallback(async (values: LoginFormValues) => {
    const autenticado = await authApi.login(values);
    setUsuario(autenticado);
    return autenticado;
  }, []);

  const registrarAdministrador = useCallback(
    async (values: SetupAdminFormValues) => {
      const admin = await authApi.registrarAdministrador(values);
      queryClient.setQueryData(queryKeys.hayAdministrador, true);
      setUsuario(admin);
      return admin;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUsuario(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ usuario, cargando, login, registrarAdministrador, logout }),
    [usuario, cargando, login, registrarAdministrador, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
