// Esquemas Zod del contrato. El backend los usa para validar peticiones y
// respuestas; el frontend, para validar sus formularios y lo que recibe.
//
// Convenciones:
//  - Ids: UUID generados por el servidor.
//  - Fechas: ISO 8601 con zona (`2026-11-25T16:00:00.000Z`).
//  - Dinero: número en USD con 2 decimales.
//  - Esquemas de entrada `.strict()`: un campo desconocido es un error 400,
//    así una errata en el nombre de un campo no se pierde en silencio.
import { z } from 'zod';
import {
  CATEGORIAS_INVENTARIO,
  CATEGORIAS_TRABAJO,
  ESTADOS_ENTREGA,
  FASES,
  PRIORIDADES,
  ROLES,
  ROLES_EMPLEADO,
  TECNOLOGIAS,
  TIPOS_GRAN_FORMATO,
  TIPOS_MOVIMIENTO,
  TIPOS_NOTIFICACION,
  TIPOS_PRODUCTO_TERMINADO,
  TIPOS_DOCUMENTO,
  FORMATOS_PAPELERIA,
  ORIENTACIONES,
  LUGARES_ENGOMADO,
  LAMINADOS,
  COLORES_TINTA,
  TIPOS_PAPEL,
  TAMANOS_PAPELERIA,
  ACABADOS_GRAN_FORMATO,
  UNIDADES_DIMENSION,
  UNIDADES_MEDIDA,
  CATEGORIAS_POR_SUPERFICIE,
} from './dominio.js';

/* ------------------------------------------------------------------ */
/* Comunes                                                             */
/* ------------------------------------------------------------------ */

export const IdSchema = z.string().uuid();
export const FechaIsoSchema = z.string().datetime({ offset: true });
export const MontoSchema = z.number().finite().min(0).max(100_000_000);
const texto = (max) => z.string().trim().min(1).max(max);
const textoOpcional = (max) => z.string().trim().max(max).optional();

export const RolSchema = z.enum(ROLES);
export const FaseSchema = z.enum(FASES);

export const ParamsIdSchema = z.object({ id: IdSchema }).strict();

/** Formato único de error de la API. */
export const ErrorApiSchema = z.object({
  error: z.string(),
  mensaje: z.string(),
  detalles: z.unknown().optional(),
});

/** Detalle de un error de validación (`error: "CONTRATO_INVALIDO"`). */
export const DetalleValidacionSchema = z.array(
  z.object({ ruta: z.string(), mensaje: z.string(), codigo: z.string() }),
);

/* ------------------------------------------------------------------ */
/* Autenticación y usuarios                                            */
/* ------------------------------------------------------------------ */

const EmailSchema = z.string().trim().toLowerCase().email('Correo electrónico inválido').max(150);

/** Misma política que el formulario del frontend. */
export const PasswordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número');

export const UsuarioPublicoSchema = z.object({
  id: IdSchema,
  nombre: z.string(),
  email: z.string(),
  telefono: z.string().nullable(),
  cargo: z.string().nullable(),
  rol: RolSchema,
  activo: z.boolean(),
  creadoEn: FechaIsoSchema,
  ultimoAcceso: FechaIsoSchema.nullable(),
  creadoPor: z.string().nullable(),
});

export const EstadoInstalacionSchema = z.object({ hayAdministrador: z.boolean() });

export const LoginSchema = z
  .object({ email: EmailSchema, password: z.string().min(1).max(72) })
  .strict();

export const SetupAdminSchema = z
  .object({
    nombre: texto(80).min(3),
    email: EmailSchema,
    telefono: z.string().trim().min(10).max(24),
    cargo: textoOpcional(60),
    password: PasswordSchema,
  })
  .strict();

export const CrearEmpleadoSchema = z
  .object({
    nombre: texto(80).min(3),
    email: EmailSchema,
    telefono: textoOpcional(24),
    cargo: textoOpcional(60),
    rol: z.enum(ROLES_EMPLEADO),
    password: PasswordSchema,
  })
  .strict();

export const CambiarEstadoUsuarioSchema = z.object({ activo: z.boolean() }).strict();
export const RestablecerPasswordSchema = z.object({ password: PasswordSchema }).strict();

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

export const ClienteSchema = z.object({
  id: IdSchema,
  nombre: z.string(),
  rif: z.string(),
  contacto: z.string(),
  telefono: z.string(),
  email: z.string(),
  ciudad: z.string(),
  ordenesActivas: z.number().int().min(0),
  saldoPendiente: MontoSchema,
  creadoEn: FechaIsoSchema,
});

export const NuevoClienteSchema = z
  .object({
    nombre: texto(150).min(3),
    rif: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[VJEGP]-?\d{6,9}-?\d?$/, 'Formato de RIF inválido (J-12345678-9)'),
    contacto: texto(120).min(3),
    telefono: z.string().trim().min(10).max(24),
    email: EmailSchema,
    ciudad: texto(80),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* Órdenes de trabajo                                                  */
/* ------------------------------------------------------------------ */

/**
 * Ficha técnica de la orden. Los campos de papelería reproducen el formato
 * físico de la Orden de Trabajo de MARKENNY, C.A.; los de gran formato, la
 * ficha de pendones y stickers.
 */
export const EspecificacionesSchema = z
  .object({
    /* Papelería corporativa (formato físico) */
    nombreDocumento: textoOpcional(120),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO).optional(),
    tipoDocumentoOtro: textoOpcional(60),
    formato: z.enum(FORMATOS_PAPELERIA).optional(),
    dobleCara: z.boolean().optional(),
    /** 1 a 4 partes, u "Otros" hasta 10. */
    partes: z.number().int().min(1).max(10).optional(),
    /** "N°" del encabezado de cada hoja. */
    numeracionDesde: z.number().int().min(0).optional(),
    numeracionHasta: z.number().int().min(0).optional(),
    numeracionPrefijo: textoOpcional(12),
    /** Número de control del pie de página ("00-"). */
    numeroControlDesde: z.number().int().min(0).optional(),
    numeroControlHasta: z.number().int().min(0).optional(),
    numeroControlPrefijo: textoOpcional(12),
    /** Vista del trabajo: horizontal o vertical. */
    orientacion: z.enum(ORIENTACIONES).optional(),
    perforacion: z.boolean().optional(),
    /** Solo en blocks. */
    engomado: z.enum(LUGARES_ENGOMADO).optional(),
    laminado: z.enum(LAMINADOS).optional(),
    coloresTinta: z.array(z.enum(COLORES_TINTA)).max(COLORES_TINTA.length).optional(),
    colorTintaOtro: textoOpcional(40),
    tipoPapel: z.enum([...TIPOS_PAPEL, 'OTRO']).optional(),
    tipoPapelOtro: textoOpcional(60),
    tamano: z.enum(TAMANOS_PAPELERIA).optional(),
    tamanoOtro: textoOpcional(40),
    /* Gran formato y adhesivos */
    tipoGranFormato: z.enum(TIPOS_GRAN_FORMATO).optional(),
    ancho: z.number().positive().max(10_000).optional(),
    alto: z.number().positive().max(10_000).optional(),
    unidadDimension: z.enum(UNIDADES_DIMENSION).optional(),
    resolucionDpi: z.number().int().min(72).max(1440).optional(),
    /* Comunes */
    tintasTiro: z.number().int().min(0).max(8).optional(),
    tintasRetiro: z.number().int().min(0).max(8).optional(),
    gramaje: z.number().positive().max(2000).optional(),
    pantones: z.array(texto(40)).max(20).optional(),
    observaciones: textoOpcional(500),
  })
  .strict()
  .superRefine((e, ctx) => {
    const exigir = (condicion, path, message) => {
      if (condicion) ctx.addIssue({ code: 'custom', path: [path], message });
    };
    exigir(
      e.numeracionDesde !== undefined && e.numeracionHasta !== undefined && e.numeracionHasta < e.numeracionDesde,
      'numeracionHasta',
      'El número final debe ser mayor o igual al inicial',
    );
    exigir(e.tipoDocumento === 'OTRO' && !e.tipoDocumentoOtro, 'tipoDocumentoOtro', 'Indica qué documento es');
    exigir(e.tipoPapel === 'OTRO' && !e.tipoPapelOtro, 'tipoPapelOtro', 'Indica qué papel');
    exigir(e.tamano === 'OTRO' && !e.tamanoOtro, 'tamanoOtro', 'Indica el tamaño');
    exigir(Boolean(e.coloresTinta?.includes('OTRO')) && !e.colorTintaOtro, 'colorTintaOtro', 'Indica el color');
    exigir(
      e.numeroControlDesde !== undefined && e.numeroControlHasta !== undefined && e.numeroControlHasta < e.numeroControlDesde,
      'numeroControlHasta',
      'El número de control final debe ser mayor o igual al inicial',
    );
    exigir(e.engomado !== undefined && e.formato !== 'BLOCK', 'engomado', 'El engomado solo aplica a blocks');
  });

export const EventoOrdenSchema = z.object({
  id: IdSchema,
  fase: FaseSchema,
  anterior: FaseSchema.nullable(),
  usuarioId: IdSchema,
  usuario: z.string(),
  rol: RolSchema,
  fecha: FechaIsoSchema,
  nota: z.string().nullable(),
});

/**
 * Nota sobre una orden. El vendedor no puede cambiar la fase, pero sí dejar
 * una observación o pedir a Producción que revise y autorice un retrabajo.
 */
export const NotaOrdenSchema = z.object({
  id: IdSchema,
  mensaje: z.string(),
  solicitaRetrabajo: z.boolean(),
  usuarioId: IdSchema,
  usuario: z.string(),
  rol: RolSchema,
  fecha: FechaIsoSchema,
});

export const NuevaNotaSchema = z
  .object({
    mensaje: texto(500).min(3, 'Escribe al menos 3 caracteres'),
    solicitaRetrabajo: z.boolean().default(false),
  })
  .strict();

export const OrdenTrabajoSchema = z.object({
  id: IdSchema,
  codigo: z.string().regex(/^OT-\d{4}-\d{4,}$/),
  clienteId: IdSchema,
  clienteNombre: z.string(),
  clienteTelefono: z.string().nullable(),
  producto: z.string(),
  descripcion: z.string(),
  tecnologia: z.enum(TECNOLOGIAS),
  categoriaTrabajo: z.enum(CATEGORIAS_TRABAJO),
  /** Producto terminado que ingresa al almacén al empaquetar. */
  productoTerminado: z.enum(TIPOS_PRODUCTO_TERMINADO),
  prioridad: z.enum(PRIORIDADES),
  /** Material del almacén usado como sustrato (gran formato). */
  materialId: IdSchema.nullable(),
  /** Cantidad descontada de ese material, en su unidad (null si no se descontó). */
  consumoSustrato: z.number().positive().nullable(),
  /** Asignación de taller (opcional). No es inventario. */
  maquina: z.string().nullable(),
  operador: z.string().nullable(),
  cantidad: z.number().int().positive(),
  sustrato: z.string(),
  tintas: z.array(z.string()),
  acabados: z.array(z.string()),
  especificaciones: EspecificacionesSchema,
  montoTotal: MontoSchema,
  fase: FaseSchema,
  /** Derivado de la fase (AVANCE_POR_FASE). */
  avance: z.number().int().min(0).max(100),
  estadoEntrega: z.enum(ESTADOS_ENTREGA),
  vendedorId: IdSchema,
  vendedor: z.string(),
  fechaCreacion: FechaIsoSchema,
  /** "Fecha de finalizado" del formato físico (null si aún no finaliza). */
  fechaFinalizado: FechaIsoSchema.nullable(),
  fechaEntrega: FechaIsoSchema,
  /** Bloqueo optimista: se incrementa en cada cambio de fase. */
  version: z.number().int().positive(),
  historial: z.array(EventoOrdenSchema),
  notas: z.array(NotaOrdenSchema),
});

/**
 * Alta de orden. El servidor asigna id, código `OT-AAAA-NNNN`, vendedor (el
 * usuario de la sesión), fase inicial y fechas de auditoría. Tecnología,
 * prioridad y producto terminado se deducen de la ficha si no se indican.
 */
export const NuevaOrdenSchema = z
  .object({
    clienteId: IdSchema,
    producto: texto(120).min(3),
    descripcion: z.string().trim().max(280).default(''),
    tecnologia: z.enum(TECNOLOGIAS).optional(),
    categoriaTrabajo: z.enum(CATEGORIAS_TRABAJO),
    productoTerminado: z.enum(TIPOS_PRODUCTO_TERMINADO).optional(),
    prioridad: z.enum(PRIORIDADES).default('MEDIA'),
    /**
     * Sustrato del almacén (gran formato). El servidor calcula el consumo con
     * las medidas, la cantidad y el rendimiento del material, y lo descuenta
     * al crear la orden; si no alcanza el stock, rechaza la orden.
     */
    materialId: IdSchema.optional(),
    maquina: textoOpcional(80),
    cantidad: z.number().int().min(1).max(1_000_000),
    sustrato: texto(120),
    tintas: z.array(texto(40)).max(20),
    acabados: z.array(texto(60)).max(20),
    especificaciones: EspecificacionesSchema.default({}),
    montoTotal: MontoSchema,
    fechaEntrega: FechaIsoSchema,
  })
  .strict()
  .superRefine((o, ctx) => {
    if (o.materialId && o.categoriaTrabajo !== 'GRAN_FORMATO') {
      ctx.addIssue({ code: 'custom', path: ['materialId'], message: 'El sustrato del almacén solo aplica a gran formato' });
    }
    if (o.categoriaTrabajo === 'GRAN_FORMATO') {
      const ajenos = o.acabados.filter((a) => !ACABADOS_GRAN_FORMATO.includes(a));
      if (ajenos.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['acabados'],
          message: `Pendones y stickers solo admiten: ${ACABADOS_GRAN_FORMATO.join(', ')}`,
        });
      }
    }
    if (o.categoriaTrabajo === 'PAPELERIA') {
      // Las tarjetas de presentación no son talonario ni block.
      const obligatorios = o.especificaciones?.tipoDocumento === 'TARJETAS'
        ? ['tipoDocumento', 'tipoPapel', 'tamano']
        : ['tipoDocumento', 'formato', 'partes', 'tipoPapel', 'tamano'];
      for (const campo of obligatorios) {
        if (o.especificaciones?.[campo] === undefined) {
          ctx.addIssue({ code: 'custom', path: ['especificaciones', campo], message: 'Campo obligatorio de la orden de papelería' });
        }
      }
    }
  });

export const FiltroOrdenesSchema = z
  .object({
    fase: FaseSchema.optional(),
    categoria: z.enum(CATEGORIAS_TRABAJO).optional(),
    estadoEntrega: z.enum(ESTADOS_ENTREGA).optional(),
    q: z.string().trim().max(80).optional(),
    limite: z.coerce.number().int().min(1).max(500).default(200),
  })
  .strict();

/** Cambio de fase de control de calidad. */
export const TransicionSchema = z
  .object({
    fase: FaseSchema,
    /** Nota de calidad. Obligatoria (min. 3 caracteres) en todo retrabajo hacia EN_PROCESO. */
    nota: textoOpcional(500),
    /** Versión que vio el operario; si no coincide, 409 CONFLICTO_CONCURRENCIA. */
    versionEsperada: z.number().int().positive().optional(),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* Inventario                                                          */
/* ------------------------------------------------------------------ */

const RendimientoSchema = z.number().positive('El rendimiento debe ser mayor a cero').max(100_000);
const MermaSchema = z.number().min(0, 'La merma no puede ser negativa').max(100, 'Máximo 100 %');

export const MaterialSchema = z.object({
  id: IdSchema,
  sku: z.string(),
  nombre: z.string(),
  categoria: z.enum(CATEGORIAS_INVENTARIO),
  /** Para PAPEL: Químico, Bond, Glasse, Bristol, Opalina o Fotográfico. */
  subtipo: z.enum(TIPOS_PAPEL).nullable(),
  unidad: z.enum(UNIDADES_MEDIDA),
  stock: z.number().min(0),
  stockMinimo: z.number().min(0),
  costoUnitario: MontoSchema,
  /** Viniles y lonas: m² que rinde una unidad de stock (p. ej. rollo 1,22 × 50 m = 61). */
  rendimiento: z.number().positive().nullable(),
  /** Desperdicio que se suma al consumo calculado (corte, pruebas), en %. */
  mermaPorcentaje: z.number().min(0).max(100),
  ubicacion: z.string(),
  proveedor: z.string(),
  lote: z.string(),
  actualizadoEn: FechaIsoSchema,
});

export const NuevoMaterialSchema = z
  .object({
    sku: texto(50),
    nombre: texto(100),
    categoria: z.enum(CATEGORIAS_INVENTARIO),
    subtipo: z.enum(TIPOS_PAPEL).optional(),
    unidad: z.enum(UNIDADES_MEDIDA),
    stockMinimo: z.number().min(0).default(0),
    costoUnitario: MontoSchema.default(0),
    rendimiento: RendimientoSchema.optional(),
    mermaPorcentaje: MermaSchema.default(0),
    ubicacion: z.string().trim().max(100).default(''),
    proveedor: z.string().trim().max(120).default(''),
    lote: z.string().trim().max(60).default(''),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.categoria === 'PAPEL' && !m.subtipo) {
      ctx.addIssue({ code: 'custom', path: ['subtipo'], message: 'Indica el tipo de papel' });
    }
    if (m.categoria !== 'PAPEL' && m.subtipo) {
      ctx.addIssue({ code: 'custom', path: ['subtipo'], message: 'El tipo de papel solo aplica a materiales PAPEL' });
    }
    if (m.rendimiento != null && !CATEGORIAS_POR_SUPERFICIE.includes(m.categoria)) {
      ctx.addIssue({ code: 'custom', path: ['rendimiento'], message: 'El rendimiento en m² solo aplica a viniles y lonas' });
    }
  });

/** Rendimiento y merma de un material (configurables desde Inventario). */
export const ConfiguracionConsumoSchema = z
  .object({
    rendimiento: RendimientoSchema.nullable(),
    mermaPorcentaje: MermaSchema,
  })
  .strict();

/**
 * Disponibilidad de insumos para las fichas de venta. No expone costos,
 * proveedores ni lotes: la puede consultar cualquier rol.
 */
export const DisponibilidadSchema = z.object({
  id: IdSchema,
  nombre: z.string(),
  categoria: z.enum(CATEGORIAS_INVENTARIO),
  subtipo: z.enum(TIPOS_PAPEL).nullable(),
  unidad: z.enum(UNIDADES_MEDIDA),
  stock: z.number().min(0),
  disponible: z.boolean(),
  /** Para estimar el consumo en la ficha de venta (el cálculo definitivo lo hace el servidor). */
  rendimiento: z.number().positive().nullable(),
  mermaPorcentaje: z.number().min(0).max(100),
});

export const FiltroMaterialesSchema = z
  .object({
    categoria: z.enum(CATEGORIAS_INVENTARIO).optional(),
    q: z.string().trim().max(80).optional(),
  })
  .strict();

export const MovimientoSchema = z.object({
  id: IdSchema,
  materialId: IdSchema,
  materialNombre: z.string(),
  tipo: z.enum(TIPOS_MOVIMIENTO),
  cantidad: z.number().positive(),
  stockResultante: z.number().min(0),
  motivo: z.string(),
  /** Orden asociada (p. ej. consumo de papel de una OT), si aplica. */
  ordenId: IdSchema.nullable(),
  usuarioId: IdSchema,
  usuario: z.string(),
  fecha: FechaIsoSchema,
});

/** El responsable es siempre el usuario de la sesión: no viaja en el cuerpo. */
export const NuevoMovimientoSchema = z
  .object({
    materialId: IdSchema,
    tipo: z.enum(TIPOS_MOVIMIENTO),
    cantidad: z.number().positive().max(10_000_000),
    motivo: texto(160).min(3),
    ordenId: IdSchema.optional(),
  })
  .strict();

export const FiltroMovimientosSchema = z
  .object({
    materialId: IdSchema.optional(),
    limite: z.coerce.number().int().min(1).max(500).default(50),
  })
  .strict();

/** Stock específico: sellos y productos terminados pendientes de entrega. */
export const ProductoTerminadoSchema = z.object({
  id: IdSchema,
  tipo: z.enum(TIPOS_PRODUCTO_TERMINADO),
  ordenId: IdSchema.nullable(),
  codigoOrden: z.string().nullable(),
  clienteId: IdSchema.nullable(),
  clienteNombre: z.string().nullable(),
  descripcion: z.string(),
  cantidad: z.number().int().positive(),
  cantidadEntregada: z.number().int().min(0),
  cantidadPendiente: z.number().int().min(0),
  ubicacion: z.string().nullable(),
  estadoEntrega: z.enum(['PENDIENTE', 'PARCIAL', 'ENTREGADO']),
  ingresadoEn: FechaIsoSchema,
  entregas: z.array(
    z.object({
      cantidad: z.number().int().positive(),
      recibidoPor: z.string().nullable(),
      usuarioId: IdSchema,
      usuario: z.string(),
      fecha: FechaIsoSchema,
    }),
  ),
});

export const FiltroProductosTerminadosSchema = z
  .object({
    tipo: z.enum(TIPOS_PRODUCTO_TERMINADO).optional(),
    /**
     * Por defecto solo lo que falta por entregar. Acepta el texto de la query
     * ("true"/"false") o un booleano, para que validar dos veces (HTTP y caso
     * de uso) dé el mismo resultado.
     */
    soloPendientes: z
      .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
      .default(true),
  })
  .strict();

export const NuevaEntregaSchema = z
  .object({
    cantidad: z.number().int().positive(),
    recibidoPor: textoOpcional(120),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* Notificaciones                                                      */
/* ------------------------------------------------------------------ */

/** Notificación vista por el usuario de la sesión. */
export const NotificacionSchema = z.object({
  id: IdSchema,
  tipo: z.enum(TIPOS_NOTIFICACION),
  titulo: z.string(),
  detalle: z.string(),
  ordenId: IdSchema.nullable(),
  codigo: z.string().nullable(),
  leida: z.boolean(),
  creadaEn: FechaIsoSchema,
});

export const ResultadoMarcarLeidasSchema = z.object({ marcadas: z.number().int().min(0) });

/* ------------------------------------------------------------------ */
/* Tiempo real (Server-Sent Events)                                    */
/* ------------------------------------------------------------------ */

/** Evento `orden.actualizada` del flujo SSE de planta. */
export const EventoOrdenActualizadaSchema = z.object({
  ordenId: IdSchema,
  codigo: z.string(),
  fase: FaseSchema,
  anterior: FaseSchema.nullable(),
  version: z.number().int().positive(),
  usuario: z.string(),
  fecha: FechaIsoSchema,
});
