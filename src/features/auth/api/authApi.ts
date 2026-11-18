import type { Rol } from "@/shared/domain";
import {
  buscarPorEmail,
  crearSalt,
  escribirAuth,
  hashPassword,
  leerAuth,
  sinSecretos,
  type Usuario,
  type UsuarioPublico,
} from "../lib/authStore";
import type {
  EmpleadoFormValues,
  LoginFormValues,
  SetupAdminFormValues,
} from "../types/schemas";

function delay(ms = 420) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nuevoId(prefijo: string) {
  return `${prefijo}-${crypto.randomUUID().slice(0, 8)}`;
}

async function construirUsuario(input: {
  nombre: string;
  email: string;
  telefono?: string;
  cargo?: string;
  rol: Rol;
  password: string;
  creadoPor?: string;
}): Promise<Usuario> {
  const salt = crearSalt();
  return {
    id: nuevoId("usr"),
    nombre: input.nombre.trim(),
    email: input.email.trim().toLowerCase(),
    telefono: input.telefono?.trim() || undefined,
    cargo: input.cargo?.trim() || undefined,
    rol: input.rol,
    activo: true,
    passwordHash: await hashPassword(input.password, salt),
    salt,
    creadoEn: new Date().toISOString(),
    creadoPor: input.creadoPor,
  };
}

function sesionUsuario(): Usuario | null {
  const db = leerAuth();
  if (!db.sesion) return null;
  return db.usuarios.find((usuario) => usuario.id === db.sesion?.usuarioId) ?? null;
}

export const authApi = {
  async sesionActual(): Promise<UsuarioPublico | null> {
    await delay(120);
    const usuario = sesionUsuario();
    return usuario && usuario.activo ? sinSecretos(usuario) : null;
  },

  async hayAdministrador(): Promise<boolean> {
    await delay(100);
    return leerAuth().usuarios.some((usuario) => usuario.rol === "ADMIN");
  },

  /**
   * Registro único del administrador maestro. Si ya existe un administrador
   * —aunque esté inactivo— la operación se rechaza y el formulario se bloquea.
   */
  async registrarAdministrador(
    input: SetupAdminFormValues,
  ): Promise<UsuarioPublico> {
    await delay(520);
    const db = leerAuth();
    if (db.usuarios.some((usuario) => usuario.rol === "ADMIN")) {
      throw new Error("El administrador maestro ya fue registrado en este sistema.");
    }
    if (buscarPorEmail(db, input.email)) {
      throw new Error("Ese correo ya está registrado.");
    }

    const admin = await construirUsuario({
      nombre: input.nombre,
      email: input.email,
      telefono: input.telefono,
      cargo: input.cargo || "Administrador general",
      rol: "ADMIN",
      password: input.password,
    });
    admin.ultimoAcceso = new Date().toISOString();

    escribirAuth({
      usuarios: [admin, ...db.usuarios],
      sesion: { usuarioId: admin.id, iniciadoEn: new Date().toISOString() },
    });
    return sinSecretos(admin);
  },

  async login(input: LoginFormValues): Promise<UsuarioPublico> {
    await delay(480);
    const db = leerAuth();
    const usuario = buscarPorEmail(db, input.email);
    if (!usuario) throw new Error("Credenciales inválidas. Verifica tu correo.");
    if (!usuario.activo) {
      throw new Error("Tu cuenta está desactivada. Contacta al administrador.");
    }

    const hash = await hashPassword(input.password, usuario.salt);
    if (hash !== usuario.passwordHash) {
      throw new Error("Credenciales inválidas. Verifica tu contraseña.");
    }

    usuario.ultimoAcceso = new Date().toISOString();
    escribirAuth({
      ...db,
      usuarios: db.usuarios.map((item) => (item.id === usuario.id ? usuario : item)),
      sesion: { usuarioId: usuario.id, iniciadoEn: new Date().toISOString() },
    });
    return sinSecretos(usuario);
  },

  async logout(): Promise<void> {
    await delay(120);
    const db = leerAuth();
    escribirAuth({ ...db, sesion: null });
  },

  async listarUsuarios(): Promise<UsuarioPublico[]> {
    await delay(280);
    return leerAuth()
      .usuarios.map(sinSecretos)
      .sort((a, b) => {
        if (a.rol !== b.rol) return a.rol === "ADMIN" ? -1 : 1;
        return a.nombre.localeCompare(b.nombre);
      });
  },

  async crearEmpleado(input: EmpleadoFormValues): Promise<UsuarioPublico> {
    await delay(460);
    const db = leerAuth();
    const actual = sesionUsuario();
    if (!actual || actual.rol !== "ADMIN") {
      throw new Error("Solo el administrador puede registrar empleados.");
    }
    if (buscarPorEmail(db, input.email)) {
      throw new Error("Ese correo ya está registrado.");
    }

    const empleado = await construirUsuario({
      nombre: input.nombre,
      email: input.email,
      telefono: input.telefono || undefined,
      cargo: input.cargo || (input.rol === "VENDEDOR" ? "Ejecutivo de ventas" : "Operario de planta"),
      rol: input.rol,
      password: input.password,
      creadoPor: actual.nombre,
    });

    escribirAuth({ ...db, usuarios: [...db.usuarios, empleado] });
    return sinSecretos(empleado);
  },

  async cambiarEstadoUsuario(id: string, activo: boolean): Promise<UsuarioPublico> {
    await delay(280);
    const db = leerAuth();
    const actual = sesionUsuario();
    if (!actual || actual.rol !== "ADMIN") {
      throw new Error("Solo el administrador puede modificar usuarios.");
    }
    if (actual.id === id && !activo) {
      throw new Error("No puedes desactivar tu propia cuenta.");
    }

    const objetivo = db.usuarios.find((usuario) => usuario.id === id);
    if (!objetivo) throw new Error("El usuario no existe.");
    if (objetivo.rol === "ADMIN" && !activo) {
      const adminsActivos = db.usuarios.filter(
        (usuario) => usuario.rol === "ADMIN" && usuario.activo,
      );
      if (adminsActivos.length <= 1) {
        throw new Error("Debe existir al menos un administrador activo.");
      }
    }

    const actualizado: Usuario = { ...objetivo, activo };
    escribirAuth({
      ...db,
      usuarios: db.usuarios.map((usuario) =>
        usuario.id === id ? actualizado : usuario,
      ),
    });
    return sinSecretos(actualizado);
  },

  async restablecerPassword(id: string, password: string): Promise<void> {
    await delay(320);
    const db = leerAuth();
    const actual = sesionUsuario();
    if (!actual || actual.rol !== "ADMIN") {
      throw new Error("Solo el administrador puede restablecer contraseñas.");
    }
    const objetivo = db.usuarios.find((usuario) => usuario.id === id);
    if (!objetivo) throw new Error("El usuario no existe.");

    const salt = crearSalt();
    const passwordHash = await hashPassword(password, salt);
    escribirAuth({
      ...db,
      usuarios: db.usuarios.map((usuario) =>
        usuario.id === id ? { ...usuario, salt, passwordHash } : usuario,
      ),
    });
  },
};

export type { UsuarioPublico };
