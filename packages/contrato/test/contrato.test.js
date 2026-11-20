import { describe, expect, it } from 'vitest';
import {
  ENDPOINTS,
  ERRORES,
  FASES,
  NuevaOrdenSchema,
  NuevoMovimientoSchema,
  OrdenTrabajoSchema,
  TRANSICIONES,
  TransicionSchema,
  construirRuta,
  requiereMotivo,
  siguienteFase,
  stockTrasMovimiento,
  transicionPermitida,
  FiltroProductosTerminadosSchema,
  LoginSchema,
} from '../src/index.js';
import { generarOpenApi } from '../src/openapi.js';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('reglas de fases', () => {
  it('define exactamente las 4 fases de control de calidad', () => {
    expect(FASES).toEqual(['EN_PROCESO', 'EN_REVISION', 'FINALIZADO', 'EMPAQUETADO']);
    expect(Object.keys(TRANSICIONES)).toEqual(FASES);
  });

  it('solo se avanza de una en una; el único retroceso es el retrabajo', () => {
    const permitidas = FASES.flatMap((d) => FASES.filter((h) => transicionPermitida(d, h)).map((h) => `${d}>${h}`));
    expect(permitidas).toEqual([
      'EN_PROCESO>EN_REVISION',
      'EN_REVISION>EN_PROCESO',
      'EN_REVISION>FINALIZADO',
      'FINALIZADO>EMPAQUETADO',
    ]);
    expect(requiereMotivo('EN_REVISION', 'EN_PROCESO')).toBe(true);
    expect(requiereMotivo('EN_PROCESO', 'EN_REVISION')).toBe(false);
    expect(siguienteFase('FINALIZADO')).toBe('EMPAQUETADO');
    expect(siguienteFase('EMPAQUETADO')).toBeNull();
    expect(transicionPermitida('DESCONOCIDA', 'EN_PROCESO')).toBe(false);
  });

  it('stockTrasMovimiento nunca trunca: devuelve negativo para que el servidor rechace', () => {
    expect(stockTrasMovimiento(10, 'ENTRADA', 5)).toBe(15);
    expect(stockTrasMovimiento(10, 'SALIDA', 15)).toBe(-5);
    expect(stockTrasMovimiento(10, 'AJUSTE', 3)).toBe(7);
  });
});

describe('esquemas', () => {
  const orden = {
    clienteId: UUID,
    producto: 'Facturas 2 partes',
    tecnologia: 'OFFSET',
    categoriaTrabajo: 'PAPELERIA',
    prioridad: 'MEDIA',
    maquina: 'Heidelberg SM 52',
    cantidad: 1000,
    sustrato: 'Bond 75 g',
    tintas: ['Pantone 032 C'],
    acabados: ['Numerado'],
    especificaciones: { tipoPapeleria: 'FACTURA', partes: 2, numeracionDesde: 1, numeracionHasta: 1000 },
    montoTotal: 120.5,
    fechaEntrega: '2026-11-25T16:00:00.000Z',
  };

  it('NuevaOrden acepta la ficha de papelería que envía el frontend', () => {
    expect(NuevaOrdenSchema.parse(orden).descripcion).toBe('');
  });

  it('NuevaOrden rechaza campos desconocidos (p. ej. vendedor: lo pone el servidor)', () => {
    const r = NuevaOrdenSchema.safeParse({ ...orden, vendedor: 'otro' });
    expect(r.success).toBe(false);
  });

  it('valida la numeración de talonarios', () => {
    const r = NuevaOrdenSchema.safeParse({
      ...orden,
      especificaciones: { numeracionDesde: 500, numeracionHasta: 10 },
    });
    expect(r.success).toBe(false);
  });

  it('rechaza fechas sin zona horaria (ambiguas)', () => {
    expect(NuevaOrdenSchema.safeParse({ ...orden, fechaEntrega: '2026-11-25' }).success).toBe(false);
  });

  it('el responsable de un movimiento no viaja en el cuerpo', () => {
    const base = { materialId: UUID, tipo: 'SALIDA', cantidad: 3, motivo: 'Consumo OT' };
    expect(NuevoMovimientoSchema.safeParse(base).success).toBe(true);
    expect(NuevoMovimientoSchema.safeParse({ ...base, usuario: 'x' }).success).toBe(false);
  });

  it('normaliza el correo del login', () => {
    expect(LoginSchema.parse({ email: '  Admin@Markenny.COM ', password: 'x' }).email).toBe('admin@markenny.com');
  });

  it('transición: fase del catálogo y nota opcional', () => {
    expect(TransicionSchema.safeParse({ fase: 'EMPACADO' }).success).toBe(false);
    expect(TransicionSchema.parse({ fase: 'EN_REVISION', versionEsperada: 1 }).fase).toBe('EN_REVISION');
  });

  it('productos terminados: por defecto solo pendientes', () => {
    expect(FiltroProductosTerminadosSchema.parse({}).soloPendientes).toBe(true);
    expect(FiltroProductosTerminadosSchema.parse({ soloPendientes: 'false' }).soloPendientes).toBe(false);
  });

  it('OrdenTrabajo exige código OT-AAAA-NNNN', () => {
    expect(OrdenTrabajoSchema.shape.codigo.safeParse('OT-2026-0185').success).toBe(true);
    expect(OrdenTrabajoSchema.shape.codigo.safeParse('OP-2026-000001').success).toBe(false);
  });
});

describe('tabla de endpoints', () => {
  const lista = Object.entries(ENDPOINTS);

  it('no repite método + ruta', () => {
    const claves = lista.map(([, ep]) => `${ep.metodo} ${ep.ruta}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('cada error declarado existe en el catálogo de errores', () => {
    for (const [nombre, ep] of lista) {
      for (const codigo of ep.errores) expect(ERRORES, `${nombre}:${codigo}`).toHaveProperty(codigo);
    }
  });

  it('las rutas con :id declaran el esquema de parámetros', () => {
    for (const [nombre, ep] of lista) {
      if (ep.ruta.includes(':')) expect(ep.params, nombre).toBeDefined();
    }
  });

  it('solo login, estado y setup son públicos', () => {
    expect(lista.filter(([, ep]) => ep.roles === null).map(([n]) => n).sort()).toEqual(
      ['estadoInstalacion', 'login', 'registrarAdministrador'],
    );
  });

  it('respeta el alcance de cada rol', () => {
    expect(ENDPOINTS.crearOrden.roles).toEqual(['ADMIN', 'VENDEDOR']);
    expect(ENDPOINTS.cambiarFaseOrden.roles).toEqual(['ADMIN', 'PRODUCCION']);
    expect(ENDPOINTS.listarMateriales.roles).not.toContain('VENDEDOR');
    expect(ENDPOINTS.crearEmpleado.roles).toEqual(['ADMIN']);
  });

  it('construirRuta sustituye y codifica parámetros', () => {
    expect(construirRuta(ENDPOINTS.cambiarFaseOrden, { id: UUID })).toBe(`/api/v1/ordenes/${UUID}/transiciones`);
    expect(() => construirRuta(ENDPOINTS.cambiarFaseOrden)).toThrow(/Falta el parámetro/);
  });
});

describe('OpenAPI', () => {
  it('documenta todos los endpoints más el flujo SSE', () => {
    const doc = generarOpenApi();
    const operaciones = Object.values(doc.paths).flatMap((p) => Object.values(p));
    expect(operaciones).toHaveLength(Object.keys(ENDPOINTS).length + 1);
    const crear = doc.paths['/api/v1/ordenes'].post;
    expect(crear.responses[201]).toBeDefined();
    expect(crear.requestBody.content['application/json'].schema.required).toContain('clienteId');
    expect(doc.paths['/api/v1/ordenes/{id}/transiciones'].post.parameters[0]).toMatchObject({ name: 'id', in: 'path' });
  });
});
