import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "El correo es obligatorio")
  .email("Correo electrónico inválido");

const password = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[A-Za-z]/, "Debe incluir al menos una letra")
  .regex(/\d/, "Debe incluir al menos un número");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const setupAdminSchema = z
  .object({
    nombre: z.string().trim().min(3, "Nombre y apellido requeridos").max(80),
    email,
    telefono: z
      .string()
      .trim()
      .min(10, "Teléfono requerido")
      .max(24, "Teléfono demasiado largo"),
    cargo: z.string().trim().max(60).optional().or(z.literal("")),
    password,
    confirmar: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((values) => values.password === values.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  });

export type SetupAdminFormValues = z.infer<typeof setupAdminSchema>;

export const empleadoSchema = z
  .object({
    nombre: z.string().trim().min(3, "Nombre y apellido requeridos").max(80),
    email,
    telefono: z
      .string()
      .trim()
      .max(24, "Teléfono demasiado largo")
      .optional()
      .or(z.literal("")),
    cargo: z.string().trim().max(60).optional().or(z.literal("")),
    rol: z.enum(["VENDEDOR", "PRODUCCION"], { error: "Selecciona Vendedor o Producción" }),
    password: password,
    confirmar: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((values) => values.password === values.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  });

export type EmpleadoFormValues = z.infer<typeof empleadoSchema>;

export const SETUP_ADMIN_DEFAULTS: Partial<SetupAdminFormValues> = {
  nombre: "",
  email: "",
  telefono: "",
  cargo: "Administrador general",
  password: "",
  confirmar: "",
};

export const EMPLEADO_DEFAULTS: Partial<EmpleadoFormValues> = {
  nombre: "",
  email: "",
  telefono: "",
  cargo: "",
  rol: "VENDEDOR",
  password: "",
  confirmar: "",
};
