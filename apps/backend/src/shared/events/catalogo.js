// Eventos de integración entre módulos del monolito (contratos internos).
// Un módulo no importa el dominio de otro: publica y consume estos eventos,
// cuyo payload se valida con Zod al publicar.
import { z } from 'zod';
import { FaseSchema } from '@markenny/contrato';
import { ESTADOS_ENTREGA } from '@markenny/contrato/dominio';
import { ActorSchema } from '../application/actor.js';

export const EVENTOS = Object.freeze({
  ORDEN_CREADA: 'produccion.orden.creada',
  ORDEN_ACTUALIZADA: 'produccion.orden.actualizada',
  ORDEN_EMPAQUETADA: 'produccion.orden.empaquetada',
  PRODUCTO_ENTREGADO: 'inventario.producto.entregado',
  MATERIALES_DESCONTADOS: 'inventario.materiales.descontados',
  DESCUENTO_MATERIALES_FALLIDO: 'inventario.descuento_materiales.fallido',
});

const Uuid = z.string().uuid();
const Fecha = z.string().datetime({ offset: true });

export const PAYLOADS = Object.freeze({
  [EVENTOS.ORDEN_CREADA]: z.object({
    ordenId: Uuid,
    codigo: z.string(),
    producto: z.string(),
    clienteNombre: z.string(),
    vendedorId: Uuid,
    /** Materias primas a descontar del inventario (vacío si la ficha no las indica). */
    materiales: z.array(z.object({ materialId: Uuid, cantidad: z.number().positive() })),
    actor: ActorSchema,
    fecha: Fecha,
  }),
  [EVENTOS.ORDEN_ACTUALIZADA]: z.object({
    ordenId: Uuid,
    codigo: z.string(),
    producto: z.string(),
    clienteNombre: z.string(),
    vendedorId: Uuid,
    fase: FaseSchema,
    anterior: FaseSchema.nullable(),
    version: z.number().int().positive(),
    actor: ActorSchema,
    fecha: Fecha,
  }),
  [EVENTOS.ORDEN_EMPAQUETADA]: z.object({
    ordenId: Uuid,
    codigo: z.string(),
    clienteId: Uuid,
    clienteNombre: z.string(),
    producto: z.string(),
    cantidad: z.number().int().positive(),
    actor: ActorSchema,
    fecha: Fecha,
  }),
  [EVENTOS.PRODUCTO_ENTREGADO]: z.object({
    productoId: Uuid,
    ordenId: Uuid.nullable(),
    estadoEntrega: z.enum(ESTADOS_ENTREGA),
    fecha: Fecha,
  }),
  [EVENTOS.MATERIALES_DESCONTADOS]: z.object({
    ordenId: Uuid,
    movimientos: z.array(z.object({ materialId: Uuid, cantidad: z.number().positive(), stockResultante: z.number() })),
  }),
  [EVENTOS.DESCUENTO_MATERIALES_FALLIDO]: z.object({
    ordenId: Uuid,
    codigoError: z.string(),
    mensaje: z.string(),
    detalles: z.unknown().optional(),
  }),
});
