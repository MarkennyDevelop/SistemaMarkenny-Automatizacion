// Contratos Zod de entrada/salida de los casos de uso del módulo de Producción.
import { z } from 'zod';
import { UsuarioRefSchema, IdSchema } from '../../../shared/application/esquemas.js';
import { EspecificacionSelloSchema } from '../../../shared/events/catalogo.js';
import { ESTADOS_PRODUCCION } from '../domain/estados.js';
import { TIPOS_PRODUCTO } from '../domain/ordenProduccion.js';

export const EstadoProduccionSchema = z.nativeEnum(ESTADOS_PRODUCCION);
export const TipoProductoSchema = z.nativeEnum(TIPOS_PRODUCTO);

export const MaterialRequeridoSchema = z
  .object({
    materialId: IdSchema,
    cantidad: z.number().positive(),
  })
  .strict();

export const AprobarOrdenTrabajoSchema = z
  .object({
    pedidoId: IdSchema.nullable().default(null),
    clienteId: IdSchema,
    tipoProducto: TipoProductoSchema,
    descripcion: z.string().trim().min(3).max(500),
    cantidad: z.number().int().positive(),
    materiales: z.array(MaterialRequeridoSchema).max(100).default([]),
    especificacionSello: EspecificacionSelloSchema.nullable().default(null),
    usuario: UsuarioRefSchema,
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.tipoProducto === 'SELLO' && !d.especificacionSello) {
      ctx.addIssue({ code: 'custom', path: ['especificacionSello'], message: 'Requerida para órdenes de tipo SELLO' });
    }
    if (d.tipoProducto !== 'SELLO' && d.especificacionSello) {
      ctx.addIssue({ code: 'custom', path: ['especificacionSello'], message: 'Solo aplica a órdenes de tipo SELLO' });
    }
    const ids = d.materiales.map((m) => m.materialId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', path: ['materiales'], message: 'Hay materiales repetidos' });
    }
  });

export const CambiarEstadoOrdenSchema = z
  .object({
    ordenId: IdSchema,
    hacia: EstadoProduccionSchema,
    usuario: UsuarioRefSchema,
    motivo: z.string().trim().min(3).max(500).optional(),
    /** Versión que el cliente vio; si se envía, protege contra cambios concurrentes. */
    versionEsperada: z.number().int().positive().optional(),
  })
  .strict();

export const ConsultarOrdenSchema = z.object({ ordenId: IdSchema }).strict();

export const ListarOrdenesSchema = z
  .object({
    estado: EstadoProduccionSchema.optional(),
    limite: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export const RegistroAuditoriaSchema = z.object({
  secuencia: z.number().int().positive(),
  desde: EstadoProduccionSchema.nullable(),
  hacia: EstadoProduccionSchema,
  usuario: UsuarioRefSchema,
  fecha: z.string().datetime(),
  motivo: z.string().nullable(),
});

export const OrdenProduccionDTOSchema = z.object({
  id: IdSchema,
  codigo: z.string(),
  pedidoId: IdSchema.nullable(),
  clienteId: IdSchema,
  tipoProducto: TipoProductoSchema,
  descripcion: z.string(),
  cantidad: z.number().int().positive(),
  materiales: z.array(MaterialRequeridoSchema),
  especificacionSello: EspecificacionSelloSchema.nullable(),
  estado: EstadoProduccionSchema,
  transicionesPermitidas: z.array(EstadoProduccionSchema),
  version: z.number().int().positive(),
  creadaEn: z.string().datetime(),
  actualizadaEn: z.string().datetime(),
  historial: z.array(RegistroAuditoriaSchema),
});

export const HistorialOrdenDTOSchema = z.object({
  ordenId: IdSchema,
  codigo: z.string(),
  estadoActual: EstadoProduccionSchema,
  historial: z.array(RegistroAuditoriaSchema),
});
