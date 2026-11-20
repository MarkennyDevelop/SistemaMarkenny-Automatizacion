import { api, ApiError } from "@/shared/api/cliente";
import type { UsuarioPublico } from "@/shared/domain";
import type {
  EmpleadoFormValues,
  LoginFormValues,
  SetupAdminFormValues,
} from "../types/schemas";

/**
 * Adaptador de identidad sobre el backend (`/api/v1/auth` y `/api/v1/usuarios`).
 * La sesión es una cookie httpOnly que gestiona el navegador: aquí no se
 * guardan tokens ni contraseñas.
 */
export const authApi = {
  /** Usuario de la sesión actual, o `null` si no hay sesión vigente. */
  async sesionActual(): Promise<UsuarioPublico | null> {
    try {
      return await api.sesionActual();
    } catch (error) {
      if (error instanceof ApiError && error.estado === 401) return null;
      throw error;
    }
  },

  async hayAdministrador(): Promise<boolean> {
    return (await api.estadoInstalacion()).hayAdministrador;
  },

  /** Registro único del administrador maestro; deja la sesión iniciada. */
  registrarAdministrador: ({ confirmar: _confirmar, ...datos }: SetupAdminFormValues) =>
    api.registrarAdministrador({ body: { ...datos, cargo: datos.cargo || undefined } }),

  login: (datos: LoginFormValues) => api.login({ body: datos }),

  logout: () => api.logout(),

  listarUsuarios: () => api.listarUsuarios(),

  crearEmpleado: ({ confirmar: _confirmar, ...datos }: EmpleadoFormValues) =>
    api.crearEmpleado({
      body: { ...datos, telefono: datos.telefono || undefined, cargo: datos.cargo || undefined },
    }),

  cambiarEstadoUsuario: (id: string, activo: boolean) =>
    api.cambiarEstadoUsuario({ params: { id }, body: { activo } }),

  restablecerPassword: (id: string, password: string) =>
    api.restablecerPassword({ params: { id }, body: { password } }),
};

export type { UsuarioPublico };
