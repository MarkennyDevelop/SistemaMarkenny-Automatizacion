// Casos de uso de materias primas (papel, tintas, planchas, insumos...).
import { z } from 'zod';
import { casoDeUso } from '../../../../shared/application/validacion.js';
import { RecursoNoEncontradoError, ConflictoConcurrenciaError } from '../../../../shared/domain/errors.js';
import { EVENTOS } from '../../../../shared/events/catalogo.js';
import {
  crearMaterial,
  registrarEntrada,
  planificarDescuento,
  estaBajoMinimo,
  TIPOS_REFERENCIA,
} from '../../domain/material.js';
import {
  CrearMaterialSchema,
  RegistrarEntradaMaterialSchema,
  DescontarMaterialesOrdenSchema,
  ListarMaterialesSchema,
  MaterialDTOSchema,
  MovimientoDTOSchema,
  ResultadoDescuentoSchema,
} from '../../schemas/inventarioSchemas.js';

const MAX_REINTENTOS = 3;

const aMaterialDTO = (m) => ({ ...m, bajoMinimo: estaBajoMinimo(m) });
const aMovimientoDTO = (m) => ({
  ...m,
  referencia: m.referencia ? { ...m.referencia } : null,
  usuario: { ...m.usuario },
});

/** Reintenta `fn` ante conflictos de concurrencia optimista. */
async function conReintentos(fn) {
  for (let intento = 1; ; intento++) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof ConflictoConcurrenciaError) || intento >= MAX_REINTENTOS) throw err;
    }
  }
}

export function crearCrearMaterial({ materialRepository, reloj, ids }) {
  return casoDeUso({
    nombre: 'inventario.crearMaterial',
    entrada: CrearMaterialSchema,
    salida: MaterialDTOSchema,
    async ejecutar({ usuario: _usuario, ...datos }) {
      const material = crearMaterial({ ...datos, id: ids.generar(), fecha: reloj.ahora() });
      await materialRepository.crear(material);
      return aMaterialDTO(material);
    },
  });
}

export function crearRegistrarEntradaMaterial({ materialRepository, reloj, ids }) {
  return casoDeUso({
    nombre: 'inventario.registrarEntradaMaterial',
    entrada: RegistrarEntradaMaterialSchema,
    salida: MaterialDTOSchema,
    async ejecutar({ materialId, cantidad, referencia, usuario }) {
      return conReintentos(async () => {
        const material = await materialRepository.obtenerPorId(materialId);
        if (!material) throw new RecursoNoEncontradoError('Material', materialId);
        const r = registrarEntrada(material, {
          movimientoId: ids.generar(),
          cantidad,
          referencia,
          usuario,
          fecha: reloj.ahora(),
        });
        await materialRepository.aplicarMovimientos({
          cambios: [{ material: r.material, versionEsperada: material.version }],
          movimientos: [r.movimiento],
        });
        return aMaterialDTO(r.material);
      });
    },
  });
}

/**
 * Descuenta las materias primas consumidas por una orden de producción.
 * - Todo o nada: si falta stock de un material, no se descuenta ninguno.
 * - Idempotente: si la orden ya fue descontada (evento re-entregado), no repite.
 */
export function crearDescontarMaterialesOrden({ materialRepository, eventBus, reloj, ids }) {
  return casoDeUso({
    nombre: 'inventario.descontarMaterialesOrden',
    entrada: DescontarMaterialesOrdenSchema,
    salida: ResultadoDescuentoSchema,
    async ejecutar({ ordenId, materiales, usuario }) {
      const referencia = { tipo: TIPOS_REFERENCIA.ORDEN_PRODUCCION, id: ordenId };

      const resultado = await conReintentos(async () => {
        if (await materialRepository.existenMovimientosDeReferencia(referencia.tipo, ordenId)) {
          return { ordenId, yaProcesado: true, movimientos: [] };
        }
        if (materiales.length === 0) return { ordenId, yaProcesado: false, movimientos: [] };

        const actuales = await materialRepository.obtenerVarios([...new Set(materiales.map((m) => m.materialId))]);
        const plan = planificarDescuento(actuales, materiales, {
          referencia,
          usuario,
          fecha: reloj.ahora(),
          generarId: () => ids.generar(),
        });
        await materialRepository.aplicarMovimientos(plan);
        return { ordenId, yaProcesado: false, movimientos: plan.movimientos.map(aMovimientoDTO) };
      });

      if (resultado.movimientos.length > 0) {
        eventBus.publicar(EVENTOS.MATERIALES_DESCONTADOS, {
          ordenId,
          movimientos: resultado.movimientos.map(({ materialId, cantidad, stockResultante }) => ({
            materialId,
            cantidad,
            stockResultante,
          })),
        });
      }
      return resultado;
    },
  });
}

export function crearListarMateriales({ materialRepository }) {
  return casoDeUso({
    nombre: 'inventario.listarMateriales',
    entrada: ListarMaterialesSchema,
    salida: z.array(MaterialDTOSchema),
    async ejecutar(filtro) {
      return (await materialRepository.listar(filtro)).map(aMaterialDTO);
    },
  });
}

export function crearListarMovimientosMaterial({ materialRepository }) {
  return casoDeUso({
    nombre: 'inventario.listarMovimientosMaterial',
    entrada: z.object({ materialId: z.string().uuid() }).strict(),
    salida: z.array(MovimientoDTOSchema),
    async ejecutar({ materialId }) {
      return (await materialRepository.listarMovimientos(materialId)).map(aMovimientoDTO);
    },
  });
}
