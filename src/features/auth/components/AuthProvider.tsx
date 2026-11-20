import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { alExpirarSesion } from "@/shared/api/cliente";
import { queryKeys } from "@/shared/api/queryKeys";
import { authApi } from "../api/authApi";
import { AuthContext } from "../context";
import type { UsuarioPublico } from "@/shared/domain";
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

  // Si el backend responde 401 (sesión caducada, cuenta desactivada o
  // contraseña restablecida), se vuelve al login sin datos en caché.
  useEffect(
    () =>
      alExpirarSesion(() => {
        setUsuario(null);
        queryClient.clear();
      }),
    [queryClient],
  );

  const login = useCallback(
    async (values: LoginFormValues) => {
      const autenticado = await authApi.login(values);
      queryClient.clear(); // nada en caché de una sesión anterior
      setUsuario(autenticado);
      return autenticado;
    },
    [queryClient],
  );

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
    try {
      await authApi.logout();
    } finally {
      setUsuario(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ usuario, cargando, login, registrarAdministrador, logout }),
    [usuario, cargando, login, registrarAdministrador, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
