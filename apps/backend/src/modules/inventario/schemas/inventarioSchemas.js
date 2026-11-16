// Contratos Zod del módulo de Inventario.
import { z } from 'zod';
import { UsuarioRefSchema, IdSchema, FechaIsoSchema } from '../../../shared/application/esquemas.js';
import { EspecificacionSelloSchema } from '../../../shared/events/catalogo.js';
import { CATEGORIAS_MATERIAL, TIPOS_MOVIMIENTO, TIPOS_REFERENCIA } from '../domain/material.js';
import { TIPOS_PRODUCTO_TERMINADO, ESTADOS_EXISTENCIA } from '../domain/productoTerminado.js';

const Cantidad = z.number().positive().finite();

// ---------- Materias primas ----------
export const CrearMaterialSchema = z
  .object({
    codigo: z.string().trim().min(1).max(40),
    nombre: z.string().trim().min(1).max(200),
    categoria: z.nativeEnum(CATEGORIAS_MATERIAL),
    unidad: z.string().trim().min(1).max(20),
    stockMinimo: z.number().min(0).default(0),
    usuario: UsuarioRefSchema,
  })
  .strict();

export const RegistrarEntradaMaterialSchema = z
  .object({
    materialId: IdSchema,
    cantidad: Cantidad,
    referencia: z.object({ tipo: z.nativeEnum(TIPOS_REFERENCIA), id: z.string().min(1) }).strict().nullable().default(null),
    usuario: UsuarioRefSchema,
  })
  .strict();

export const DescontarMaterialesOrdenSchema = z
  .object({
    ordenId: IdSchema,
    materiales: z.array(z.object({ materialId: IdSchema, cantidad: Cantidad }).strict()),
    usuario: UsuarioRefSchema,
  })
  .strict();

export const ListarMaterialesSchema = z
  .object({ categoria: z.nativeEnum(CATEGORIAS_MATERIAL).optional() })
  .strict();

export const MaterialDTOSchema = z.object({
  id: IdSchema,
  codigo: z.string(),
  nombre: z.string(),
  categoria: z.nativeEnum(CATEGORIAS_MATERIAL),
  unidad: z.string(),
  stockActual: z.number(),
  stockMinimo: z.number(),
  bajoMinimo: z.boolean(),
  version: z.number().int().positive(),
  actualizadoEn: FechaIsoSchema,
});

export const MovimientoDTOSchema = z.object({
  id: IdSchema,
  materialId: IdSchema,
  tipo: z.nativeEnum(TIPOS_MOVIMIENTO),
  cantidad: z.number(),
  stockResultante: z.number(),
  referencia: z.object({ tipo: z.string(), id: z.string() }).nullable(),
  usuario: UsuarioRefSchema,
  fecha: FechaIsoSchema,
});

export const ResultadoDescuentoSchema = z.object({
  ordenId: IdSchema,
  yaProcesado: z.boolean(),
  movimientos: z.array(MovimientoDTOSchema),
});

// ---------- Stock específico: sellos y productos terminados ----------
export const RegistrarIngresoProductoTerminadoSchema = z
  .object({
    ordenId: IdSchema,
    codigoOrden: z.string().min(1),
    pedidoId: IdSchema.nullable().default(null),
    clienteId: IdSchema,
    tipoProducto: z.nativeEnum(TIPOS_PRODUCTO_TERMINADO),
    descripcion: z.string().trim().min(1),
    cantidad: z.number().int().positive(),
    especificacionSello: EspecificacionSelloSchema.nullable().default(null),
    ubicacion: z.string().trim().min(1).max(60).nullable().default(null),
    usuario: UsuarioRefSchema,
  })
  .strict();

export const RegistrarEntregaSchema = z
  .object({
    existenciaId: IdSchema,
    cantidad: z.number().int().positive(),
    recibidoPor: z.string().trim().min(1).max(120).nullable().default(null),
    usuario: UsuarioRefSchema,
  })
  .strict();

export const ListarPendientesSchema = z
  .object({
    tipoProducto: z.nativeEnum(TIPOS_PRODUCTO_TERMINADO).optional(),
    clienteId: IdSchema.optional(),
  })
  .strict();

export const ExistenciaDTOSchema = z.object({
  id: IdSchema,
  ordenId: IdSchema,
  codigoOrden: z.string(),
  pedidoId: IdSchema.nullable(),
  clienteId: IdSchema,
  tipoProducto: z.nativeEnum(TIPOS_PRODUCTO_TERMINADO),
  descripcion: z.string(),
  especificacionSello: EspecificacionSelloSchema.nullable(),
  ubicacion: z.string().nullable(),
  cantidad: z.number().int().positive(),
  cantidadEntregada: z.number().int().min(0),
  cantidadPendiente: z.number().int().min(0),
  estado: z.nativeEnum(ESTADOS_EXISTENCIA),
  ingresadoPor: UsuarioRefSchema,
  ingresadoEn: FechaIsoSchema,
  entregas: z.array(
    z.object({
      cantidad: z.number().int().positive(),
      recibidoPor: z.string().nullable(),
      usuario: UsuarioRefSchema,
      fecha: FechaIsoSchema,
    }),
  ),
  version: z.number().int().positive(),
});
