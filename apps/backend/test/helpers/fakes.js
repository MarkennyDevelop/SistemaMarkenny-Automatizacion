// Dobles de prueba deterministas para los puertos transversales.

/** Reloj controlable. */
export function crearRelojFijo(inicio = '2026-11-16T12:00:00.000Z') {
  let actual = new Date(inicio);
  return {
    ahora: () => new Date(actual),
    avanzar(ms = 60_000) {
      actual = new Date(actual.getTime() + ms);
    },
    fijar(iso) {
      actual = new Date(iso);
    },
  };
}

/** Generador de UUIDs v4-compatibles, secuenciales y legibles. */
export function crearIdsSecuenciales(prefijo = '00000000') {
  let n = 0;
  return {
    generar() {
      n += 1;
      return `${prefijo}-0000-4000-8000-${String(n).padStart(12, '0')}`;
    },
  };
}

/** EventBus espía: registra lo publicado sin despachar. */
export function crearEventBusEspia() {
  const publicados = [];
  return {
    publicados,
    publicar(tipo, payload) {
      publicados.push({ tipo, payload });
    },
    suscribir() {
      return () => {};
    },
    tipos() {
      return publicados.map((e) => e.tipo);
    },
  };
}

export const USUARIOS = Object.freeze({
  operador: Object.freeze({ id: 'u-operador-1', nombre: 'Ana Operadora', rol: 'OPERADOR' }),
  calidad: Object.freeze({ id: 'u-calidad-1', nombre: 'Luis Calidad', rol: 'CONTROL_CALIDAD' }),
  almacen: Object.freeze({ id: 'u-almacen-1', nombre: 'Rosa Almacén', rol: 'ALMACEN' }),
  ventas: Object.freeze({ id: 'u-ventas-1', nombre: 'Pedro Ventas', rol: 'VENTAS' }),
});

export const CLIENTE_ID = '11111111-1111-4111-8111-111111111111';
export const PEDIDO_ID = '22222222-2222-4222-8222-222222222222';
