// Dobles deterministas y utilidades de prueba.
import { crearHasherScrypt } from '../src/modules/auth/index.js';

/** Reloj controlable. */
export function crearRelojFijo(inicio = '2026-11-20T12:00:00.000Z') {
  let actual = new Date(inicio);
  return {
    ahora: () => new Date(actual),
    avanzar(ms = 60_000) {
      actual = new Date(actual.getTime() + ms);
    },
  };
}

/** UUID v4 válidos, secuenciales y legibles. */
export function crearIdsSecuenciales(prefijo = '00000000') {
  let n = 0;
  return {
    generar() {
      n += 1;
      return `${prefijo}-0000-4000-8000-${String(n).padStart(12, '0')}`;
    },
  };
}

/** scrypt con coste bajo: mismo algoritmo, pruebas rápidas. */
export const hasherRapido = crearHasherScrypt({ N: 1024 });

export const ACTORES = Object.freeze({
  admin: Object.freeze({ id: '10000000-0000-4000-8000-000000000001', nombre: 'Kenny Hernández', rol: 'ADMIN' }),
  vendedor: Object.freeze({ id: '10000000-0000-4000-8000-000000000002', nombre: 'Valeria Rondón', rol: 'VENDEDOR' }),
  vendedor2: Object.freeze({ id: '10000000-0000-4000-8000-000000000004', nombre: 'Pedro Ventas', rol: 'VENDEDOR' }),
  produccion: Object.freeze({ id: '10000000-0000-4000-8000-000000000003', nombre: 'Luis Pérez', rol: 'PRODUCCION' }),
});

export const CLIENTE = Object.freeze({ id: '20000000-0000-4000-8000-000000000001', nombre: 'Inversiones Triple 3000, C.A.', telefono: '0212-5550000' });

/** Datos válidos de una orden de papelería, como los envía el frontend. */
export function datosOrden(extra = {}) {
  return {
    clienteId: CLIENTE.id,
    producto: 'Facturas fiscales 2 partes',
    descripcion: 'Logo a 1 tinta',
    tecnologia: 'OFFSET',
    categoriaTrabajo: 'PAPELERIA',
    prioridad: 'MEDIA',
    maquina: 'Heidelberg SM 52',
    cantidad: 1000,
    sustrato: 'Bond 75 g',
    tintas: ['Pantone 032 C'],
    acabados: ['Numerado', 'Engrapado'],
    especificaciones: { tipoPapeleria: 'FACTURA', partes: 2, numeracionDesde: 1, numeracionHasta: 1000, observaciones: 'Prueba de color' },
    montoTotal: 120.5,
    fechaEntrega: '2026-11-27T16:00:00.000Z',
    ...extra,
  };
}
