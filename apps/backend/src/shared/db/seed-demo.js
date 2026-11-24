// Datos de demostración para probar el sistema de punta a punta.
//
// Uso:  npm run seed:demo   (con DATABASE_URL en apps/backend/.env)
//
// Solo funciona sobre una base recién migrada (sin administrador): nunca
// mezcla datos de prueba con datos reales. Todo se crea con los mismos casos
// de uso que usa la API, así la auditoría, el almacén y las notificaciones
// quedan coherentes.
import { cargarArchivoEnv, cargarConfig } from '../../config/env.js';
import { construirApp } from '../../app.js';

export const CUENTAS_DEMO = Object.freeze([
  { rol: 'ADMIN', nombre: 'Kenny Hernández', email: 'admin@markenny.com', password: 'Markenny2026', telefono: '+58 424-651-2044', cargo: 'Gerente general' },
  { rol: 'VENDEDOR', nombre: 'Valeria Rondón', email: 'valeria@markenny.com', password: 'Ventas2026', telefono: '+58 412-555-0199', cargo: 'Ejecutiva de ventas' },
  { rol: 'PRODUCCION', nombre: 'Luis Pérez', email: 'luis@markenny.com', password: 'Planta2026', telefono: '+58 414-555-0100', cargo: 'Operario de planta' },
]);

const CLIENTES = [
  { nombre: 'Inversiones Triple 3000, C.A.', rif: 'J-40512336-7', contacto: 'María Pérez', telefono: '0212-555-0101', email: 'compras@triple3000.com', ciudad: 'Caracas' },
  { nombre: 'Farmacia Santa Rosa', rif: 'J-31245678-1', contacto: 'Dr. José Rojas', telefono: '0241-555-0144', email: 'administracion@santarosa.com', ciudad: 'Valencia' },
  { nombre: 'Etiquetas Fundy, C.A.', rif: 'J-29876543-2', contacto: 'Andrea Fundy', telefono: '0251-555-0177', email: 'pedidos@fundy.com', ciudad: 'Barquisimeto' },
  { nombre: 'Movik C.A.', rif: 'J-41122334-5', contacto: 'Carlos Mendoza', telefono: '0212-555-0190', email: 'mercadeo@movik.com', ciudad: 'Caracas' },
  { nombre: 'Nathy Studio', rif: 'V-18765432-0', contacto: 'Nathaly Gil', telefono: '0424-555-0123', email: 'hola@nathystudio.com', ciudad: 'Maracay' },
];

/** Solo materias primas de Markenny: papeles, viniles, lonas y sellos (sin maquinaria). */
const MATERIALES = [
  { sku: 'PAP-QUIMICO-CARTA', nombre: 'Papel químico carta (juego 2 partes)', categoria: 'PAPEL', subtipo: 'QUIMICO', unidad: 'caja', stockMinimo: 10, costoUnitario: 38, ubicacion: 'Estante A1', proveedor: 'Papelera del Centro', lote: 'L-2602', stock: 14 },
  { sku: 'PAP-BOND-75', nombre: 'Papel Bond 75 g carta', categoria: 'PAPEL', subtipo: 'BOND', unidad: 'resma', stockMinimo: 20, costoUnitario: 6.5, ubicacion: 'Estante A2', proveedor: 'Papelera del Centro', lote: 'L-2611', stock: 120 },
  { sku: 'PAP-GLASSE-150', nombre: 'Papel Glasse 150 g', categoria: 'PAPEL', subtipo: 'GLASSE', unidad: 'pliego', stockMinimo: 500, costoUnitario: 0.21, ubicacion: 'Estante A3', proveedor: 'Distribuidora Gráfica', lote: 'L-2588', stock: 4200 },
  { sku: 'PAP-BRISTOL-240', nombre: 'Cartulina Bristol 240 g', categoria: 'PAPEL', subtipo: 'BRISTOL', unidad: 'pliego', stockMinimo: 200, costoUnitario: 0.3, ubicacion: 'Estante A4', proveedor: 'Distribuidora Gráfica', lote: 'L-2590', stock: 900 },
  { sku: 'PAP-OPALINA-180', nombre: 'Opalina 180 g', categoria: 'PAPEL', subtipo: 'OPALINA', unidad: 'pliego', stockMinimo: 200, costoUnitario: 0.35, ubicacion: 'Estante A5', proveedor: 'Distribuidora Gráfica', lote: 'L-2593', stock: 0 },
  { sku: 'PAP-FOTO-200', nombre: 'Papel fotográfico 200 g', categoria: 'PAPEL', subtipo: 'FOTOGRAFICO', unidad: 'pliego', stockMinimo: 50, costoUnitario: 0.8, ubicacion: 'Estante A6', proveedor: 'Distribuidora Gráfica', lote: 'L-2601', stock: 120 },
  { sku: 'VIN-ADH-BLANCO', rendimiento: 61, mermaPorcentaje: 5, nombre: 'Vinil adhesivo blanco brillante', categoria: 'VINIL', unidad: 'rollo', stockMinimo: 2, costoUnitario: 95, ubicacion: 'Rack G1', proveedor: 'Vinilos Andinos', lote: 'VA-81', stock: 4 },
  { sku: 'VIN-ADH-HOLO', rendimiento: 61, mermaPorcentaje: 8, nombre: 'Vinil adhesivo holográfico', categoria: 'VINIL', unidad: 'rollo', stockMinimo: 1, costoUnitario: 135, ubicacion: 'Rack G2', proveedor: 'Vinilos Andinos', lote: 'VA-86', stock: 2 },
  { sku: 'VIN-CLEAR', rendimiento: 61, mermaPorcentaje: 5, nombre: 'Vinil clear', categoria: 'VINIL', unidad: 'rollo', stockMinimo: 1, costoUnitario: 110, ubicacion: 'Rack G2', proveedor: 'Vinilos Andinos', lote: 'VA-84', stock: 1 },
  { sku: 'VIN-MICROPERF', rendimiento: 61, mermaPorcentaje: 10, nombre: 'Vinil microperforado', categoria: 'VINIL', unidad: 'rollo', stockMinimo: 1, costoUnitario: 150, ubicacion: 'Rack G5', proveedor: 'Vinilos Andinos', lote: 'VA-88', stock: 2 },
  { sku: 'VIN-MATE', rendimiento: 61, mermaPorcentaje: 5, nombre: 'Vinil mate', categoria: 'VINIL', unidad: 'rollo', stockMinimo: 1, costoUnitario: 98, ubicacion: 'Rack G5', proveedor: 'Vinilos Andinos', lote: 'VA-90', stock: 0 },
  { sku: 'LON-FRONT-13', rendimiento: 80, mermaPorcentaje: 3, nombre: 'Lona front 13 oz', categoria: 'LONA', unidad: 'rollo', stockMinimo: 2, costoUnitario: 140, ubicacion: 'Rack G3', proveedor: 'Vinilos Andinos', lote: 'VA-77', stock: 6 },
  { sku: 'LON-MESH', rendimiento: 80, mermaPorcentaje: 3, nombre: 'Lona mesh microperforada', categoria: 'LONA', unidad: 'rollo', stockMinimo: 1, costoUnitario: 160, ubicacion: 'Rack G4', proveedor: 'Vinilos Andinos', lote: 'VA-79', stock: 0 },
  { sku: 'SEL-TRODAT-4911', nombre: 'Sello automático Trodat 4911', categoria: 'SELLO', unidad: 'unidad', stockMinimo: 10, costoUnitario: 7.5, ubicacion: 'Gaveta S1', proveedor: 'Trodat', lote: 'TR-4911', stock: 25 },
  { sku: 'SEL-TRODAT-4912', nombre: 'Sello automático Trodat 4912', categoria: 'SELLO', unidad: 'unidad', stockMinimo: 10, costoUnitario: 8.5, ubicacion: 'Gaveta S1', proveedor: 'Trodat', lote: 'TR-4912', stock: 40 },
  { sku: 'SEL-TRODAT-4913', nombre: 'Sello automático Trodat 4913', categoria: 'SELLO', unidad: 'unidad', stockMinimo: 10, costoUnitario: 9.5, ubicacion: 'Gaveta S2', proveedor: 'Trodat', lote: 'TR-4913', stock: 6 },
  { sku: 'SEL-FECHADOR-4810', nombre: 'Sello fechador Trodat 4810', categoria: 'SELLO', unidad: 'unidad', stockMinimo: 5, costoUnitario: 11, ubicacion: 'Gaveta S2', proveedor: 'Trodat', lote: 'TR-4810', stock: 15 },
];

const dias = (n) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + n);
  fecha.setHours(12, 0, 0, 0);
  return fecha.toISOString();
};

/**
 * Rendimientos de demostración: rollo de vinil 1,22 × 50 m = 61 m², rollo de
 * lona 1,60 × 50 m = 80 m². Ajustarlos en Inventario a los rollos reales.
 */

/** Orden: cliente (índice), datos de la ficha y fases que se le harán avanzar. */
const papeleria = (extra) => ({
  nombreDocumento: 'Factura', tipoDocumento: 'F', formato: 'TALONARIO', dobleCara: false, partes: 2,
  numeracionDesde: 1, numeracionHasta: 1000, numeroControlPrefijo: '00-', numeroControlDesde: 1,
  numeroControlHasta: 1000, orientacion: 'VERTICAL', perforacion: true, coloresTinta: ['NEGRO'],
  tipoPapel: 'QUIMICO', tamano: 'MEDIA_CARTA', ...extra,
});

/** Orden: cliente (índice), datos de la ficha y fases que se le harán avanzar. */
const ORDENES = [
  { cliente: 0, fases: [], datos: { producto: 'Facturas fiscales 2 partes', categoriaTrabajo: 'PAPELERIA', prioridad: 'ALTA', cantidad: 1000, sustrato: 'Papel químico', tintas: ['Negro', 'Rojo'], acabados: ['Numerado', 'Perforación'], especificaciones: papeleria({ coloresTinta: ['NEGRO', 'ROJO'], observaciones: 'Logo centrado, datos fiscales al pie' }), montoTotal: 185, fechaEntrega: dias(5) } },
  { cliente: 1, fases: ['EN_REVISION'], datos: { producto: 'Récipes médicos', categoriaTrabajo: 'PAPELERIA', cantidad: 2000, sustrato: 'Papel bond', tintas: ['Azul'], acabados: ['Engomado'], especificaciones: papeleria({ nombreDocumento: 'Récipe', tipoDocumento: 'RM', formato: 'BLOCK', partes: 1, numeracionDesde: undefined, numeracionHasta: undefined, numeroControlPrefijo: undefined, numeroControlDesde: undefined, numeroControlHasta: undefined, perforacion: false, engomado: 'ARRIBA', coloresTinta: ['AZUL'], tipoPapel: 'BOND', tamano: 'CUARTO_CARTA' }), montoTotal: 96, fechaEntrega: dias(2) } },
  { cliente: 2, fases: ['EN_REVISION', 'FINALIZADO'], datos: { producto: 'Stickers redondos 5 cm', categoriaTrabajo: 'GRAN_FORMATO', prioridad: 'URGENTE', cantidad: 40, sustrato: 'Vinil adhesivo blanco brillante', tintas: ['CMYK alta cobertura'], acabados: ['Corte con plotter'], especificaciones: { tipoGranFormato: 'STICKER', ancho: 30, alto: 45, unidadDimension: 'cm', resolucionDpi: 1440, observaciones: '40 pliegos de 24 stickers' }, montoTotal: 420, fechaEntrega: dias(1) } },
  { cliente: 3, fases: ['EN_REVISION', 'FINALIZADO', 'EMPAQUETADO'], datos: { producto: 'Pendones 80×200 cm', categoriaTrabajo: 'GRAN_FORMATO', cantidad: 12, sustrato: 'Lona front 13 oz', tintas: ['CMYK alta cobertura'], acabados: [], especificaciones: { tipoGranFormato: 'PENDON', ancho: 80, alto: 200, unidadDimension: 'cm', resolucionDpi: 720 }, montoTotal: 312, fechaEntrega: dias(3) } },
  { cliente: 4, fases: ['EN_REVISION', 'FINALIZADO', 'EMPAQUETADO'], datos: { producto: 'Notas de entrega', categoriaTrabajo: 'PAPELERIA', prioridad: 'BAJA', cantidad: 500, sustrato: 'Papel químico', tintas: ['Negro'], acabados: ['Numerado'], especificaciones: papeleria({ nombreDocumento: 'Nota de entrega', tipoDocumento: 'NE', partes: 3, numeracionHasta: 500, numeroControlHasta: 500 }), montoTotal: 48, fechaEntrega: dias(-1) } },
  { cliente: 2, fases: [], datos: { producto: 'Vinil de rotulación para vidriera', categoriaTrabajo: 'GRAN_FORMATO', cantidad: 2, sustrato: 'Vinil clear', tintas: ['CMYK alta cobertura'], acabados: ['Corte con plotter'], especificaciones: { tipoGranFormato: 'VINIL', ancho: 1.2, alto: 2, unidadDimension: 'm', resolucionDpi: 720 }, montoTotal: 75, fechaEntrega: dias(7) } },
];

export async function sembrarDemo(app) {
  const { auth, ventas, produccion, inventario } = app.modulos;
  if ((await auth.casosUso.estadoInstalacion({})).hayAdministrador) {
    throw new Error('La base ya tiene administrador: la demo solo se carga sobre una base vacía (npm run migrate en una base nueva).');
  }

  const [datosAdmin, ...empleados] = CUENTAS_DEMO;
  const { usuario: admin } = await auth.casosUso.registrarAdministrador({
    nombre: datosAdmin.nombre, email: datosAdmin.email, telefono: datosAdmin.telefono, cargo: datosAdmin.cargo, password: datosAdmin.password,
  });
  const actorAdmin = { id: admin.id, nombre: admin.nombre, rol: admin.rol };
  const cuentas = {};
  for (const e of empleados) {
    const u = await auth.casosUso.crearEmpleado({ ...e, actor: actorAdmin });
    cuentas[e.rol] = { id: u.id, nombre: u.nombre, rol: u.rol };
  }

  const clientes = [];
  for (const c of CLIENTES) clientes.push(await ventas.casosUso.crearCliente({ ...c, actor: cuentas.VENDEDOR }));

  const materialPorNombre = new Map();
  for (const { stock, ...m } of MATERIALES) {
    const material = await inventario.casosUso.crearMaterial(m);
    materialPorNombre.set(material.nombre, material.id);
    // Los agotados (Opalina, lona mesh) quedan en 0: una entrada de 0 no es válida.
    if (stock === 0) continue;
    await inventario.casosUso.registrarMovimiento({
      materialId: material.id, tipo: 'ENTRADA', cantidad: stock, motivo: 'Inventario inicial', actor: cuentas.PRODUCCION,
    });
  }

  for (const o of ORDENES) {
    // Gran formato: el sustrato es un material real del almacén y se descuenta.
    const materialId = o.datos.categoriaTrabajo === 'GRAN_FORMATO' ? materialPorNombre.get(o.datos.sustrato) : undefined;
    const orden = await produccion.casosUso.crearOrden({
      ...o.datos, ...(materialId ? { materialId } : {}), clienteId: clientes[o.cliente].id, actor: cuentas.VENDEDOR,
    });
    for (const fase of o.fases) {
      await produccion.casosUso.cambiarFase({ id: orden.id, fase, nota: fase === 'FINALIZADO' ? 'Calidad aprobada' : undefined, actor: cuentas.PRODUCCION });
    }
  }
  await app.eventBus.esperarInactividad();
  return { clientes: clientes.length, materiales: MATERIALES.length, ordenes: ORDENES.length };
}

// Ejecución directa: `npm run seed:demo`
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  cargarArchivoEnv();
  const config = cargarConfig();
  if (!config.DATABASE_URL) {
    console.error('DATABASE_URL no está definida (apps/backend/.env).');
    process.exit(1);
  }
  const app = await construirApp({ config: { ...config, LOG_LEVEL: 'warn' } });
  try {
    const r = await sembrarDemo(app);
    console.log(`Demo cargada: ${r.clientes} clientes, ${r.materiales} materiales, ${r.ordenes} órdenes.`);
    console.log('Cuentas:');
    for (const c of CUENTAS_DEMO) console.log(`  ${c.rol.padEnd(10)} ${c.email.padEnd(24)} ${c.password}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}
