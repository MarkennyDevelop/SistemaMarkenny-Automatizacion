// Catálogo de eventos de integración entre módulos (contratos públicos).
//
// Regla: un módulo NO importa el dominio de otro. Se comunican publicando y
// consumiendo estos eventos, cuyo payload está validado con Zod tanto al
// publicar como (opcionalmente) al consumir.
import { z } from 'zod';
import { UsuarioRefSchema } from '../application/esquemas.js';

export const EVENTOS = Object.freeze({
  ORDEN_TRABAJO_APROBADA: 'produccion.orden_trabajo.aprobada',
  ORDEN_ESTADO_CAMBIADO: 'produccion.orden.estado_cambiado',
  ORDEN_EMPAQUETADA: 'produccion.orden.empaquetada',
  MATERIALES_DESCONTADOS: 'inventario.materiales.descontados',
  DESCUENTO_MATERIALES_FALLIDO: 'inventario.descuento_materiales.fallido',
});

const TipoProductoSchema = z.enum(['IMPRESO', 'SELLO']);

const MaterialRequeridoSchema = z.object({
  materialId: z.string().uuid(),
  cantidad: z.number().positive(),
});

export const EspecificacionSelloSchema = z
  .object({
    modelo: z.string().trim().min(1),
    anchoMm: z.number().positive().optional(),
    altoMm: z.number().positive().optional(),
    colorTinta: z.string().trim().min(1).optional(),
  })
  .strict();

export const PAYLOADS = Object.freeze({
  [EVENTOS.ORDEN_TRABAJO_APROBADA]: z.object({
    ordenId: z.string().uuid(),
    codigo: z.string(),
    pedidoId: z.string().uuid().nullable(),
    clienteId: z.string().uuid(),
    tipoProducto: TipoProductoSchema,
    cantidad: z.number().int().positive(),
    materiales: z.array(MaterialRequeridoSchema),
    aprobadaPor: UsuarioRefSchema,
    aprobadaEn: z.string().datetime(),
  }),
  [EVENTOS.ORDEN_ESTADO_CAMBIADO]: z.object({
    ordenId: z.string().uuid(),
    codigo: z.string(),
    desde: z.string().nullable(),
    hacia: z.string(),
    usuario: UsuarioRefSchema,
    fecha: z.string().datetime(),
    motivo: z.string().nullable(),
  }),
  [EVENTOS.ORDEN_EMPAQUETADA]: z.object({
    ordenId: z.string().uuid(),
    codigo: z.string(),
    pedidoId: z.string().uuid().nullable(),
    clienteId: z.string().uuid(),
    tipoProducto: TipoProductoSchema,
    descripcion: z.string(),
    cantidad: z.number().int().positive(),
    especificacionSello: EspecificacionSelloSchema.nullable(),
    usuario: UsuarioRefSchema,
    fecha: z.string().datetime(),
  }),
  [EVENTOS.MATERIALES_DESCONTADOS]: z.object({
    ordenId: z.string().uuid(),
    movimientos: z.array(
      z.object({ materialId: z.string().uuid(), cantidad: z.number().positive(), stockResultante: z.number() }),
    ),
  }),
  [EVENTOS.DESCUENTO_MATERIALES_FALLIDO]: z.object({
    ordenId: z.string().uuid(),
    codigoError: z.string(),
    mensaje: z.string(),
    detalles: z.unknown().optional(),
  }),
});
