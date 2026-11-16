import { describe, it, expect } from 'vitest';
import {
  ESTADOS_PRODUCCION,
  FLUJO_PRODUCCION,
  TRANSICIONES_PERMITIDAS,
  ESTADOS_TERMINALES,
} from '../../src/modules/produccion/domain/estados.js';
import {
  transicionar,
  puedeTransicionar,
  transicionesDesde,
  requiereMotivo,
} from '../../src/modules/produccion/domain/ordenStateMachine.js';
import { crearOrdenProduccion } from '../../src/modules/produccion/domain/ordenProduccion.js';
import {
  TransicionNoPermitidaError,
  EstadoDesconocidoError,
  MotivoRequeridoError,
  FechaAuditoriaInvalidaError,
} from '../../src/modules/produccion/domain/errores.js';
import { DomainError } from '../../src/shared/domain/errors.js';
import { USUARIOS, CLIENTE_ID } from '../helpers/fakes.js';

const { EN_PROCESO, EN_REVISION, FINALIZADO, EMPAQUETADO } = ESTADOS_PRODUCCION;
const T0 = new Date('2026-11-16T08:00:00.000Z');
const en = (min) => new Date(T0.getTime() + min * 60_000);

function ordenNueva() {
  return crearOrdenProduccion({
    id: 'orden-1',
    codigo: 'OP-2026-000001',
    clienteId: CLIENTE_ID,
    tipoProducto: 'IMPRESO',
    descripcion: '1000 volantes carta 4x0',
    cantidad: 1000,
    usuario: USUARIOS.ventas,
    fecha: T0,
  });
}

/** Lleva una orden nueva hasta `destino` por el camino feliz. */
function llevarA(destino) {
  let orden = ordenNueva();
  const pasos = FLUJO_PRODUCCION.slice(1, FLUJO_PRODUCCION.indexOf(destino) + 1);
  pasos.forEach((hacia, i) => {
    orden = transicionar(orden, { hacia, usuario: USUARIOS.operador, fecha: en(i + 1) });
  });
  return orden;
}

describe('Definición de estados', () => {
  it('define exactamente las 4 fases obligatorias en orden', () => {
    expect(FLUJO_PRODUCCION).toEqual(['EN_PROCESO', 'EN_REVISION', 'FINALIZADO', 'EMPAQUETADO']);
    expect(Object.keys(TRANSICIONES_PERMITIDAS).sort()).toEqual([...FLUJO_PRODUCCION].sort());
  });

  it('EMPAQUETADO es el único estado terminal', () => {
    expect(ESTADOS_TERMINALES).toEqual([EMPAQUETADO]);
  });

  it('la configuración es inmutable', () => {
    expect(Object.isFrozen(TRANSICIONES_PERMITIDAS)).toBe(true);
    expect(Object.isFrozen(TRANSICIONES_PERMITIDAS[EN_PROCESO])).toBe(true);
    expect(() => TRANSICIONES_PERMITIDAS[EN_PROCESO].push(EMPAQUETADO)).toThrow(TypeError);
  });
});

describe('Matriz completa de transiciones', () => {
  const permitidas = new Set([
    `${EN_PROCESO}->${EN_REVISION}`,
    `${EN_REVISION}->${FINALIZADO}`,
    `${EN_REVISION}->${EN_PROCESO}`, // rechazo de QC -> retrabajo
    `${FINALIZADO}->${EMPAQUETADO}`,
  ]);
  const pares = FLUJO_PRODUCCION.flatMap((desde) => FLUJO_PRODUCCION.map((hacia) => [desde, hacia]));

  it.each(pares)('%s -> %s', (desde, hacia) => {
    const esperado = permitidas.has(`${desde}->${hacia}`);
    expect(puedeTransicionar(desde, hacia)).toBe(esperado);

    const orden = llevarA(desde);
    const cambio = { hacia, usuario: USUARIOS.calidad, fecha: en(100), motivo: 'Registro defectuoso' };
    if (esperado) {
      expect(transicionar(orden, cambio).estado).toBe(hacia);
    } else {
      expect(() => transicionar(orden, cambio)).toThrow(TransicionNoPermitidaError);
    }
  });
});

describe('transicionar', () => {
  it('recorre el camino feliz completo y audita cada paso', () => {
    const orden = llevarA(EMPAQUETADO);
    expect(orden.estado).toBe(EMPAQUETADO);
    expect(orden.version).toBe(4);
    expect(orden.historial.map((r) => [r.desde, r.hacia])).toEqual([
      [null, EN_PROCESO],
      [EN_PROCESO, EN_REVISION],
      [EN_REVISION, FINALIZADO],
      [FINALIZADO, EMPAQUETADO],
    ]);
    expect(orden.historial.map((r) => r.secuencia)).toEqual([1, 2, 3, 4]);
  });

  it.each([
    [EN_PROCESO, FINALIZADO],
    [EN_PROCESO, EMPAQUETADO],
    [EN_REVISION, EMPAQUETADO],
  ])('impide saltarse etapas: %s -> %s', (desde, hacia) => {
    const orden = llevarA(desde);
    let error;
    try {
      transicionar(orden, { hacia, usuario: USUARIOS.operador, fecha: en(50) });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(TransicionNoPermitidaError);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.codigo).toBe('TRANSICION_NO_PERMITIDA');
    expect(error.detalles).toEqual({ desde, hacia, permitidas: [...TRANSICIONES_PERMITIDAS[desde]] });
  });

  it('impide retroceder desde FINALIZADO y EMPAQUETADO', () => {
    expect(() => transicionar(llevarA(FINALIZADO), { hacia: EN_REVISION, usuario: USUARIOS.calidad, fecha: en(50) })).toThrow(
      TransicionNoPermitidaError,
    );
    expect(() => transicionar(llevarA(EMPAQUETADO), { hacia: FINALIZADO, usuario: USUARIOS.calidad, fecha: en(50) })).toThrow(
      /estado terminal/,
    );
  });

  it('impide transicionar al mismo estado', () => {
    expect(() => transicionar(ordenNueva(), { hacia: EN_PROCESO, usuario: USUARIOS.operador, fecha: en(1) })).toThrow(
      TransicionNoPermitidaError,
    );
  });

  it('registra usuario, fecha y estados en la auditoría', () => {
    const orden = transicionar(ordenNueva(), { hacia: EN_REVISION, usuario: USUARIOS.operador, fecha: en(30) });
    expect(orden.historial.at(-1)).toEqual({
      secuencia: 2,
      desde: EN_PROCESO,
      hacia: EN_REVISION,
      usuario: { id: 'u-operador-1', nombre: 'Ana Operadora', rol: 'OPERADOR' },
      fecha: '2026-11-16T08:30:00.000Z',
      motivo: null,
    });
    expect(orden.actualizadaEn).toBe('2026-11-16T08:30:00.000Z');
  });

  it('el rechazo de calidad (EN_REVISION -> EN_PROCESO) exige motivo', () => {
    const enRevision = llevarA(EN_REVISION);
    expect(requiereMotivo(EN_REVISION, EN_PROCESO)).toBe(true);
    expect(() => transicionar(enRevision, { hacia: EN_PROCESO, usuario: USUARIOS.calidad, fecha: en(60) })).toThrow(
      MotivoRequeridoError,
    );
    expect(() =>
      transicionar(enRevision, { hacia: EN_PROCESO, usuario: USUARIOS.calidad, fecha: en(60), motivo: '   ' }),
    ).toThrow(MotivoRequeridoError);

    const retrabajo = transicionar(enRevision, {
      hacia: EN_PROCESO,
      usuario: USUARIOS.calidad,
      fecha: en(60),
      motivo: '  Desfase de registro en magenta ',
    });
    expect(retrabajo.estado).toBe(EN_PROCESO);
    expect(retrabajo.historial.at(-1).motivo).toBe('Desfase de registro en magenta');
  });

  it('tras un retrabajo, la orden debe volver a pasar por revisión', () => {
    let orden = llevarA(EN_REVISION);
    orden = transicionar(orden, { hacia: EN_PROCESO, usuario: USUARIOS.calidad, fecha: en(60), motivo: 'Manchas' });
    expect(() => transicionar(orden, { hacia: FINALIZADO, usuario: USUARIOS.calidad, fecha: en(61) })).toThrow(
      TransicionNoPermitidaError,
    );
    orden = transicionar(orden, { hacia: EN_REVISION, usuario: USUARIOS.operador, fecha: en(90) });
    orden = transicionar(orden, { hacia: FINALIZADO, usuario: USUARIOS.calidad, fecha: en(95) });
    expect(orden.estado).toBe(FINALIZADO);
    expect(orden.historial.map((r) => r.hacia)).toEqual([EN_PROCESO, EN_REVISION, EN_PROCESO, EN_REVISION, FINALIZADO]);
  });

  it('es pura: no muta la orden original y devuelve un objeto congelado', () => {
    const original = ordenNueva();
    const copia = structuredClone(original);
    const nueva = transicionar(original, { hacia: EN_REVISION, usuario: USUARIOS.operador, fecha: en(1) });

    expect(original).toEqual(copia);
    expect(nueva).not.toBe(original);
    expect(Object.isFrozen(nueva)).toBe(true);
    expect(Object.isFrozen(nueva.historial)).toBe(true);
    expect(Object.isFrozen(nueva.historial.at(-1).usuario)).toBe(true);
  });

  it('es determinista: mismas entradas producen el mismo resultado', () => {
    const cambio = { hacia: EN_REVISION, usuario: USUARIOS.operador, fecha: en(5) };
    expect(transicionar(ordenNueva(), cambio)).toEqual(transicionar(ordenNueva(), cambio));
  });

  it('exige un usuario identificado', () => {
    for (const usuario of [undefined, null, {}, { id: '' }, { id: '   ' }]) {
      expect(() => transicionar(ordenNueva(), { hacia: EN_REVISION, usuario, fecha: en(1) })).toThrow(
        expect.objectContaining({ codigo: 'USUARIO_REQUERIDO' }),
      );
    }
  });

  it('exige una fecha válida y no anterior al último registro', () => {
    expect(() =>
      transicionar(ordenNueva(), { hacia: EN_REVISION, usuario: USUARIOS.operador, fecha: 'hoy' }),
    ).toThrow(TypeError);
    expect(() =>
      transicionar(ordenNueva(), { hacia: EN_REVISION, usuario: USUARIOS.operador, fecha: new Date('x') }),
    ).toThrow(TypeError);
    expect(() =>
      transicionar(ordenNueva(), { hacia: EN_REVISION, usuario: USUARIOS.operador, fecha: en(-1) }),
    ).toThrow(FechaAuditoriaInvalidaError);
  });

  it('rechaza estados desconocidos (origen o destino)', () => {
    expect(() => transicionar(ordenNueva(), { hacia: 'DESPACHADO', usuario: USUARIOS.operador, fecha: en(1) })).toThrow(
      EstadoDesconocidoError,
    );
    const corrupta = { ...ordenNueva(), estado: 'BORRADOR' };
    expect(() => transicionar(corrupta, { hacia: EN_REVISION, usuario: USUARIOS.operador, fecha: en(1) })).toThrow(
      EstadoDesconocidoError,
    );
    expect(() => transicionesDesde('BORRADOR')).toThrow(EstadoDesconocidoError);
    expect(puedeTransicionar('BORRADOR', EN_PROCESO)).toBe(false);
  });
});
