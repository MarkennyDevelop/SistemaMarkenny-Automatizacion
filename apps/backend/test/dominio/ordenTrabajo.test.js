import { describe, expect, it } from 'vitest';
import { FASES } from '@markenny/contrato/dominio';
import { agregarNota, crearOrdenTrabajo, puedeVer, registrarEstadoEntrega, transicionar } from '../../src/modules/produccion/domain/ordenTrabajo.js';
import { ACTORES, CLIENTE, crearIdsSecuenciales, datosOrden } from '../helpers.js';

const T0 = new Date('2026-11-20T12:00:00.000Z');
const en = (min) => new Date(T0.getTime() + min * 60_000);
const ids = crearIdsSecuenciales();

function nueva(actor = ACTORES.vendedor) {
  return crearOrdenTrabajo({ id: ids.generar(), eventoId: ids.generar(), codigo: 'OT-2026-0001', cliente: CLIENTE, actor, datos: datosOrden(), fecha: T0 });
}
function llevarA(destino) {
  let orden = nueva();
  FASES.slice(1, FASES.indexOf(destino) + 1).forEach((hacia, i) => {
    orden = transicionar(orden, { hacia, actor: ACTORES.produccion, fecha: en(i + 1), eventoId: ids.generar() });
  });
  return orden;
}

describe('crearOrdenTrabajo', () => {
  it('nace EN_PROCESO, versión 1, sin entrega y con el evento de creación del vendedor', () => {
    const o = nueva();
    expect(o).toMatchObject({ fase: 'EN_PROCESO', version: 1, estadoEntrega: 'NO_APLICA', vendedorId: ACTORES.vendedor.id, vendedor: 'Valeria Rondón' });
    expect(o.historial).toEqual([
      expect.objectContaining({ fase: 'EN_PROCESO', anterior: null, usuarioId: ACTORES.vendedor.id, rol: 'VENDEDOR', fecha: T0.toISOString() }),
    ]);
    expect(Object.isFrozen(o.historial[0])).toBe(true);
  });

  it('Producción no puede crear órdenes', () => {
    expect(() => nueva(ACTORES.produccion)).toThrow(expect.objectContaining({ codigo: 'SIN_PERMISO' }));
  });
});

describe('máquina de estados de calidad', () => {
  const permitidas = new Set([
    'EN_PROCESO>EN_REVISION',
    'EN_REVISION>FINALIZADO',
    'EN_REVISION>EN_PROCESO',
    'FINALIZADO>EMPAQUETADO',
    'FINALIZADO>EN_PROCESO',
  ]);
  const pares = FASES.flatMap((d) => FASES.map((h) => [d, h]));

  it.each(pares)('%s → %s', (desde, hacia) => {
    const cambio = { hacia, actor: ACTORES.produccion, fecha: en(60), nota: 'Registro desfasado', eventoId: ids.generar() };
    if (permitidas.has(`${desde}>${hacia}`)) expect(transicionar(llevarA(desde), cambio).fase).toBe(hacia);
    else expect(() => transicionar(llevarA(desde), cambio)).toThrow(expect.objectContaining({ codigo: 'TRANSICION_NO_PERMITIDA' }));
  });

  it('el retrabajo exige motivo y vuelve a pasar por revisión', () => {
    const revision = llevarA('EN_REVISION');
    expect(() => transicionar(revision, { hacia: 'EN_PROCESO', actor: ACTORES.produccion, fecha: en(10), eventoId: ids.generar() })).toThrow(
      expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
    );
    const retrabajo = transicionar(revision, { hacia: 'EN_PROCESO', actor: ACTORES.produccion, nota: ' Color fuera de tolerancia ', fecha: en(10), eventoId: ids.generar() });
    expect(retrabajo.historial.at(-1)).toMatchObject({ anterior: 'EN_REVISION', fase: 'EN_PROCESO', nota: 'Color fuera de tolerancia' });
    expect(() => transicionar(retrabajo, { hacia: 'FINALIZADO', actor: ACTORES.produccion, fecha: en(11), eventoId: ids.generar() })).toThrow();
  });

  it('un defecto detectado en FINALIZADO devuelve la orden a EN_PROCESO con motivo, y debe revisarse y finalizarse otra vez', () => {
    const fin = llevarA('FINALIZADO');
    expect(() => transicionar(fin, { hacia: 'EN_PROCESO', actor: ACTORES.produccion, fecha: en(10), eventoId: ids.generar() })).toThrow(
      expect.objectContaining({ codigo: 'MOTIVO_REQUERIDO' }),
    );
    expect(() =>
      transicionar(fin, { hacia: 'EN_PROCESO', actor: ACTORES.vendedor, nota: 'Corte torcido', fecha: en(10), eventoId: ids.generar() }),
    ).toThrow(expect.objectContaining({ codigo: 'SIN_PERMISO' }));
    let o = transicionar(fin, { hacia: 'EN_PROCESO', actor: ACTORES.produccion, nota: 'Corte torcido en 30 piezas', fecha: en(10), eventoId: ids.generar() });
    expect(o).toMatchObject({ fase: 'EN_PROCESO', fechaFinalizado: null });
    expect(o.historial.at(-1)).toMatchObject({ anterior: 'FINALIZADO', fase: 'EN_PROCESO', nota: 'Corte torcido en 30 piezas' });
    expect(() => transicionar(o, { hacia: 'FINALIZADO', actor: ACTORES.produccion, fecha: en(11), eventoId: ids.generar() })).toThrow(
      expect.objectContaining({ codigo: 'TRANSICION_NO_PERMITIDA' }),
    );
    o = transicionar(o, { hacia: 'EN_REVISION', actor: ACTORES.produccion, fecha: en(20), eventoId: ids.generar() });
    o = transicionar(o, { hacia: 'FINALIZADO', actor: ACTORES.admin, fecha: en(30), eventoId: ids.generar() });
    o = transicionar(o, { hacia: 'EMPAQUETADO', actor: ACTORES.produccion, fecha: en(40), eventoId: ids.generar() });
    expect(o).toMatchObject({ fase: 'EMPAQUETADO', fechaFinalizado: en(30).toISOString() });
  });

  it('el vendedor deja notas (incluida la solicitud de retrabajo) sin cambiar la fase', () => {
    const fin = llevarA('FINALIZADO');
    const r = agregarNota(fin, { id: ids.generar(), mensaje: ' El cliente reporta manchas ', solicitaRetrabajo: true, actor: ACTORES.vendedor, fecha: en(50) });
    expect(r.orden).toMatchObject({ fase: 'FINALIZADO', version: fin.version });
    expect(r.nota).toMatchObject({ mensaje: 'El cliente reporta manchas', solicitaRetrabajo: true, rol: 'VENDEDOR' });
    expect(() => agregarNota(fin, { id: ids.generar(), mensaje: 'x', actor: ACTORES.vendedor, fecha: en(51) })).toThrow();
    expect(() => agregarNota(llevarA('EMPAQUETADO'), { id: ids.generar(), mensaje: 'Revisar', solicitaRetrabajo: true, actor: ACTORES.vendedor, fecha: en(60) })).toThrow();
  });

  it('sin máquina, tecnología ni prioridad, la orden toma valores por defecto y deduce el producto terminado', () => {
    const datos = datosOrden({ tecnologia: undefined, prioridad: undefined, maquina: undefined });
    const o = crearOrdenTrabajo({ id: ids.generar(), eventoId: ids.generar(), codigo: 'OT-2026-0002', cliente: CLIENTE, actor: ACTORES.vendedor, datos, fecha: T0 });
    expect(o).toMatchObject({ tecnologia: 'OFFSET', prioridad: 'MEDIA', maquina: null, productoTerminado: 'TALONARIO', notas: [] });
  });

  it('solo Producción o Admin cambian la fase', () => {
    expect(() => transicionar(nueva(), { hacia: 'EN_REVISION', actor: ACTORES.vendedor, fecha: en(1), eventoId: ids.generar() })).toThrow(
      expect.objectContaining({ codigo: 'SIN_PERMISO' }),
    );
    expect(transicionar(nueva(), { hacia: 'EN_REVISION', actor: ACTORES.admin, fecha: en(1), eventoId: ids.generar() }).fase).toBe('EN_REVISION');
  });

  it('es pura: no muta la orden y sube la versión', () => {
    const original = nueva();
    const copia = structuredClone(original);
    const siguiente = transicionar(original, { hacia: 'EN_REVISION', actor: ACTORES.produccion, fecha: en(1), eventoId: ids.generar() });
    expect(original).toEqual(copia);
    expect(siguiente.version).toBe(2);
  });

  it('rechaza fechas anteriores al último evento', () => {
    expect(() => transicionar(nueva(), { hacia: 'EN_REVISION', actor: ACTORES.produccion, fecha: en(-5), eventoId: ids.generar() })).toThrow(/anterior/);
  });

  it('al empaquetar queda pendiente de entrega; al finalizar guarda la fecha', () => {
    const fin = llevarA('FINALIZADO');
    expect(fin.fechaFinalizado).toBe(en(2).toISOString());
    const emp = llevarA('EMPAQUETADO');
    expect(emp.estadoEntrega).toBe('PENDIENTE');
    expect(registrarEstadoEntrega(emp, 'ENTREGADO').estadoEntrega).toBe('ENTREGADO');
    expect(() => registrarEstadoEntrega(fin, 'ENTREGADO')).toThrow();
  });

  it('un vendedor solo ve sus órdenes', () => {
    const o = nueva();
    expect(puedeVer(o, ACTORES.vendedor)).toBe(true);
    expect(puedeVer(o, ACTORES.vendedor2)).toBe(false);
    expect(puedeVer(o, ACTORES.produccion)).toBe(true);
  });
});
