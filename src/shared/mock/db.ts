import { FASE_PLANTA, FASES_PLANTA } from "@/shared/domain";
import type {
  ActorOrden,
  CategoriaTrabajo,
  Cliente,
  EventoOrden,
  FasePlanta,
  MaterialInventario,
  MovimientoInventario,
  Notificacion,
  NuevaOrdenTrabajo,
  OrdenTrabajo,
  Rol,
  TipoMovimiento,
} from "@/shared/domain";

const DB_KEY = "markenny.print-mis.db.v1";

interface MockDatabase {
  clientes: Cliente[];
  ordenes: OrdenTrabajo[];
  inventario: MaterialInventario[];
  movimientos: MovimientoInventario[];
  notificaciones: Notificacion[];
}

/** Fases que disparan aviso al vendedor cuando el pedido está listo. */
const FASES_AVISO: FasePlanta[] = ["FINALIZADO", "EMPACADO"];

/** Orden obligatorio del flujo de planta. */
const FASES_FLUJO: FasePlanta[] = FASES_PLANTA;

export type { ActorOrden };

function inferirCategoria(orden: OrdenTrabajo): CategoriaTrabajo {
  if (orden.categoriaTrabajo) return orden.categoriaTrabajo;
  if (orden.tecnologia === "GRAN_FORMATO") return "GRAN_FORMATO";
  const texto = `${orden.producto} ${orden.descripcion}`.toLowerCase();
  if (
    texto.includes("papeler") ||
    texto.includes("talonar") ||
    texto.includes("factura") ||
    texto.includes("récip") ||
    texto.includes("recip") ||
    texto.includes("nota")
  ) {
    return "PAPELERIA";
  }
  return "GENERAL";
}

/** Completa campos agregados en la fase 2 sobre datos ya persistidos. */
function normalizarOrden(orden: OrdenTrabajo): OrdenTrabajo {
  const historial =
    orden.historial && orden.historial.length > 0
      ? orden.historial
      : [
          {
            id: `evt-mig-${orden.id}`,
            fase: orden.fase,
            anterior: null,
            usuario: orden.operador || "Sistema",
            rol: "PRODUCCION" as const,
            fecha: orden.fechaCreacion,
            nota: "Fase registrada durante la migración al historial auditable.",
          } satisfies EventoOrden,
        ];

  return {
    ...orden,
    categoriaTrabajo: inferirCategoria(orden),
    historial,
  };
}

/** Reclasifica materiales creados antes de existir PLANCHAS / VINILOS. */
function normalizarMaterial(material: MaterialInventario): MaterialInventario {
  if (material.categoria !== "ALMACEN" && material.categoria !== "PAPEL") {
    return material;
  }
  if (material.sku.startsWith("ALM-CTP")) {
    return { ...material, categoria: "PLANCHAS" };
  }
  if (material.sku.startsWith("PAP-VIN") || material.sku.startsWith("PAP-LON")) {
    return { ...material, categoria: "VINILOS" };
  }
  return material;
}

const SEED_CLIENTES: Cliente[] = [
  {
    id: "cli-triple",
    nombre: "Inversiones Triple 3000, C.A.",
    rif: "J-40512336-7",
    contacto: "María Fernanda Rivas",
    telefono: "+58 412-334-1190",
    email: "compras@triple3000.com",
    ciudad: "Caracas",
    ordenesActivas: 2,
    saldoPendiente: 1240.5,
    creadoEn: "2025-03-12T09:00:00.000Z",
  },
  {
    id: "cli-dukes",
    nombre: "Los Dukes Beach Bar",
    rif: "J-40987654-1",
    contacto: "Alejandro Marín",
    telefono: "+58 424-778-9012",
    email: "admin@losdukes.com",
    ciudad: "Puerto La Cruz",
    ordenesActivas: 1,
    saldoPendiente: 0,
    creadoEn: "2025-07-02T14:30:00.000Z",
  },
  {
    id: "cli-fundy",
    nombre: "Etiquetas Fundy",
    rif: "J-41223344-9",
    contacto: "Gabriela Fuentes",
    telefono: "+58 416-205-7744",
    email: "produccion@fundy.com.ve",
    ciudad: "Valencia",
    ordenesActivas: 1,
    saldoPendiente: 845,
    creadoEn: "2025-01-28T11:15:00.000Z",
  },
  {
    id: "cli-pelon",
    nombre: "Ferretería El Pelón",
    rif: "J-30112233-5",
    contacto: "Pedro Salazar",
    telefono: "+58 414-900-2211",
    email: "pedro@elpelon.com",
    ciudad: "Barquisimeto",
    ordenesActivas: 1,
    saldoPendiente: 320,
    creadoEn: "2024-11-10T08:45:00.000Z",
  },
  {
    id: "cli-melenitas",
    nombre: "Pastelería Melenitas",
    rif: "J-41556677-3",
    contacto: "Carla Fumby",
    telefono: "+58 422-118-5566",
    email: "hola@melenitas.com",
    ciudad: "Maracaibo",
    ordenesActivas: 1,
    saldoPendiente: 180,
    creadoEn: "2025-05-19T16:00:00.000Z",
  },
  {
    id: "cli-nathy",
    nombre: "Nathy Studio",
    rif: "J-41889900-2",
    contacto: "Nathaly Pérez",
    telefono: "+58 426-551-0088",
    email: "nathy@nathystudio.com",
    ciudad: "Caracas",
    ordenesActivas: 1,
    saldoPendiente: 0,
    creadoEn: "2026-02-04T10:20:00.000Z",
  },
  {
    id: "cli-movik",
    nombre: "Movik C.A.",
    rif: "J-40778899-6",
    contacto: "Daniela Ochoa",
    telefono: "+58 412-660-4433",
    email: "marketing@movik.com",
    ciudad: "Maracay",
    ordenesActivas: 0,
    saldoPendiente: 0,
    creadoEn: "2025-09-15T12:30:00.000Z",
  },
  {
    id: "cli-aventura",
    nombre: "Turismo de Aventura",
    rif: "J-40334455-8",
    contacto: "Jorge Betancourt",
    telefono: "+58 424-330-7722",
    email: "reservas@turismoaventura.com",
    ciudad: "San Cristóbal",
    ordenesActivas: 0,
    saldoPendiente: 0,
    creadoEn: "2024-08-21T09:10:00.000Z",
  },
];

const SEED_ORDENES: OrdenTrabajo[] = [
  {
    id: "ot-0184",
    codigo: "OT-2026-0184",
    clienteId: "cli-triple",
    clienteNombre: "Inversiones Triple 3000, C.A.",
    producto: "Papelería corporativa",
    descripcion: "Talonarios de facturación 2 vías, numerados y engrapados",
    tecnologia: "OFFSET",
    fase: "EN_PROCESO",
    prioridad: "ALTA",
    maquina: "Heidelberg Speedmaster 74",
    operador: "Luis Pérez",
    cantidad: 2000,
    avance: 65,
    montoTotal: 1480,
    sustrato: "Bond 90 g",
    tintas: ["Negro", "Pantone 485 C"],
    acabados: ["Numerado", "Engrapado", "Perforado"],
    fechaCreacion: "2026-11-10T13:20:00.000Z",
    fechaEntrega: "2026-11-20T18:00:00.000Z",
  },
  {
    id: "ot-0183",
    codigo: "OT-2026-0183",
    clienteId: "cli-dukes",
    clienteNombre: "Los Dukes Beach Bar",
    producto: "Stickers troquelados 4x4",
    descripcion: "Stickers adhesivos 4x4 cm, laminado mate",
    tecnologia: "DIGITAL",
    fase: "EN_PROCESO",
    prioridad: "MEDIA",
    maquina: "Konica Minolta C4080",
    operador: "Daniela Rojas",
    cantidad: 1200,
    avance: 40,
    montoTotal: 396,
    sustrato: "Adhesivo 80 g",
    tintas: ["CMYK"],
    acabados: ["Troquelado", "Laminado mate"],
    fechaCreacion: "2026-11-12T09:40:00.000Z",
    fechaEntrega: "2026-11-22T12:00:00.000Z",
  },
  {
    id: "ot-0182",
    codigo: "OT-2026-0182",
    clienteId: "cli-fundy",
    clienteNombre: "Etiquetas Fundy",
    producto: "Etiquetas 5x5 cm",
    descripcion: "Etiquetas para empaque de tortas, troquel circular",
    tecnologia: "FLEXOGRAFIA",
    fase: "EN_REVISION",
    prioridad: "URGENTE",
    maquina: "Heidelberg SM 52",
    operador: "Carlos Mendoza",
    cantidad: 8000,
    avance: 90,
    montoTotal: 1120,
    sustrato: "Couché 150 g",
    tintas: ["Pantone 186 C", "Negro"],
    acabados: ["Troquelado", "Barniz UV"],
    fechaCreacion: "2026-11-08T15:00:00.000Z",
    fechaEntrega: "2026-11-17T16:00:00.000Z",
  },
  {
    id: "ot-0181",
    codigo: "OT-2026-0181",
    clienteId: "cli-pelon",
    clienteNombre: "Ferretería El Pelón",
    producto: "Volantes promocionales",
    descripcion: "Volantes 1/2 carta, full color, 2 caras",
    tecnologia: "OFFSET",
    fase: "EN_REVISION",
    prioridad: "MEDIA",
    maquina: "Heidelberg Speedmaster 74",
    operador: "Luis Pérez",
    cantidad: 5000,
    avance: 85,
    montoTotal: 640,
    sustrato: "Couché 150 g",
    tintas: ["CMYK"],
    acabados: ["Plegado"],
    fechaCreacion: "2026-11-09T10:10:00.000Z",
    fechaEntrega: "2026-11-19T18:00:00.000Z",
  },
  {
    id: "ot-0180",
    codigo: "OT-2026-0180",
    clienteId: "cli-melenitas",
    clienteNombre: "Pastelería Melenitas",
    producto: "Etiquetas 4x4 cm",
    descripcion: "Etiquetas adhesivas para línea de quesillos",
    tecnologia: "DIGITAL",
    fase: "EN_PROCESO",
    prioridad: "ALTA",
    maquina: "Konica Minolta C4080",
    operador: "Andreína Gil",
    cantidad: 3000,
    avance: 30,
    montoTotal: 540,
    sustrato: "Adhesivo 80 g",
    tintas: ["CMYK", "Pantone 123 C"],
    acabados: ["Troquelado"],
    fechaCreacion: "2026-11-13T11:00:00.000Z",
    fechaEntrega: "2026-11-24T12:00:00.000Z",
  },
  {
    id: "ot-0179",
    codigo: "OT-2026-0179",
    clienteId: "cli-nathy",
    clienteNombre: "Nathy Studio",
    producto: "Tarjetas de presentación",
    descripcion: "Tarjetas 9x5 cm, laminado mate, esquinas redondeadas",
    tecnologia: "DIGITAL",
    fase: "FINALIZADO",
    prioridad: "BAJA",
    maquina: "Konica Minolta C4080",
    operador: "Daniela Rojas",
    cantidad: 500,
    avance: 100,
    montoTotal: 145,
    sustrato: "Couché 300 g",
    tintas: ["CMYK"],
    acabados: ["Laminado mate", "Troquelado"],
    fechaCreacion: "2026-11-06T14:25:00.000Z",
    fechaEntrega: "2026-11-18T10:00:00.000Z",
  },
  {
    id: "ot-0178",
    codigo: "OT-2026-0178",
    clienteId: "cli-movik",
    clienteNombre: "Movik C.A.",
    producto: "Pendones 80x200 cm",
    descripcion: "Pendones en lona con ojales, arte aprobado",
    tecnologia: "GRAN_FORMATO",
    fase: "EMPACADO",
    prioridad: "MEDIA",
    maquina: "Mimaki JV300",
    operador: "José Manuel Díaz",
    cantidad: 12,
    avance: 100,
    montoTotal: 720,
    sustrato: "Lona front 13 oz",
    tintas: ["CMYK"],
    acabados: ["Perforado", "Plastificado"],
    fechaCreacion: "2026-11-04T08:50:00.000Z",
    fechaEntrega: "2026-11-17T09:00:00.000Z",
  },
  {
    id: "ot-0177",
    codigo: "OT-2026-0177",
    clienteId: "cli-aventura",
    clienteNombre: "Turismo de Aventura",
    producto: "Carpetas corporativas",
    descripcion: "Carpetas con bolsillo, full color, laminado brillante",
    tecnologia: "OFFSET",
    fase: "EN_PROCESO",
    prioridad: "BAJA",
    maquina: "Heidelberg SM 52",
    operador: "Carlos Mendoza",
    cantidad: 1000,
    avance: 55,
    montoTotal: 890,
    sustrato: "Cartulina 240 g",
    tintas: ["CMYK"],
    acabados: ["Laminado mate", "Troquelado", "Plegado"],
    fechaCreacion: "2026-11-11T16:40:00.000Z",
    fechaEntrega: "2026-11-27T17:00:00.000Z",
  },
  {
    id: "ot-0176",
    codigo: "OT-2026-0176",
    clienteId: "cli-triple",
    clienteNombre: "Inversiones Triple 3000, C.A.",
    producto: "Cajas plegadizas",
    descripcion: "Cajas para empaque de cerámica, troquel y pegado",
    tecnologia: "OFFSET",
    fase: "EN_REVISION",
    prioridad: "ALTA",
    maquina: "Heidelberg Speedmaster 74",
    operador: "Luis Pérez",
    cantidad: 2500,
    avance: 78,
    montoTotal: 2350,
    sustrato: "Couché 300 g",
    tintas: ["CMYK", "Pantone 871 C"],
    acabados: ["Troquelado", "Plegado", "Barniz UV"],
    fechaCreacion: "2026-11-07T09:30:00.000Z",
    fechaEntrega: "2026-11-21T15:00:00.000Z",
  },
  {
    id: "ot-0175",
    codigo: "OT-2026-0175",
    clienteId: "cli-fundy",
    clienteNombre: "Etiquetas Fundy",
    producto: "Etiquetas 6x4,5 cm",
    descripcion: "Etiquetas funda para línea navideña",
    tecnologia: "FLEXOGRAFIA",
    fase: "FINALIZADO",
    prioridad: "MEDIA",
    maquina: "Heidelberg SM 52",
    operador: "Andreína Gil",
    cantidad: 6000,
    avance: 100,
    montoTotal: 1340,
    sustrato: "Couché 150 g",
    tintas: ["Pantone 032 C", "Negro"],
    acabados: ["Troquelado", "Barniz UV"],
    fechaCreacion: "2026-11-03T12:00:00.000Z",
    fechaEntrega: "2026-11-19T11:00:00.000Z",
  },
  {
    id: "ot-0174",
    codigo: "OT-2026-0174",
    clienteId: "cli-pelon",
    clienteNombre: "Ferretería El Pelón",
    producto: "Calcomanías 5x5",
    descripcion: "Calcomanías adhesivas para herramienta",
    tecnologia: "DIGITAL",
    fase: "EMPACADO",
    prioridad: "BAJA",
    maquina: "Konica Minolta C4080",
    operador: "Daniela Rojas",
    cantidad: 2000,
    avance: 100,
    montoTotal: 410,
    sustrato: "Adhesivo 80 g",
    tintas: ["CMYK"],
    acabados: ["Troquelado"],
    fechaCreacion: "2026-11-02T10:45:00.000Z",
    fechaEntrega: "2026-11-16T16:00:00.000Z",
  },
  {
    id: "ot-0173",
    codigo: "OT-2026-0173",
    clienteId: "cli-nathy",
    clienteNombre: "Nathy Studio",
    producto: "Invitaciones de boda",
    descripcion: "Invitaciones con sobre, papel texturizado y grabado",
    tecnologia: "DIGITAL",
    fase: "EN_PROCESO",
    prioridad: "URGENTE",
    maquina: "Konica Minolta C4080",
    operador: "Andreína Gil",
    cantidad: 150,
    avance: 20,
    montoTotal: 675,
    sustrato: "Cartulina 240 g",
    tintas: ["Pantone 871 C", "Negro"],
    acabados: ["Plastificado", "Plegado"],
    fechaCreacion: "2026-11-14T17:10:00.000Z",
    fechaEntrega: "2026-11-25T12:00:00.000Z",
  },
];

const SEED_INVENTARIO: MaterialInventario[] = [
  {
    id: "inv-couche-150",
    sku: "PAP-COU-150",
    nombre: "Papel Couché 150 g",
    categoria: "PAPEL",
    unidad: "resma",
    stock: 38,
    stockMinimo: 50,
    costoUnitario: 18.5,
    ubicacion: "Almacén A · Estante 2",
    proveedor: "Papeles del Centro",
    lote: "L-2026-0912",
    actualizadoEn: "2026-11-15T09:20:00.000Z",
  },
  {
    id: "inv-couche-300",
    sku: "PAP-COU-300",
    nombre: "Papel Couché 300 g",
    categoria: "PAPEL",
    unidad: "resma",
    stock: 22,
    stockMinimo: 30,
    costoUnitario: 29.9,
    ubicacion: "Almacén A · Estante 3",
    proveedor: "Papeles del Centro",
    lote: "L-2026-0887",
    actualizadoEn: "2026-11-14T15:45:00.000Z",
  },
  {
    id: "inv-bond-75",
    sku: "PAP-BON-075",
    nombre: "Papel Bond 75 g",
    categoria: "PAPEL",
    unidad: "resma",
    stock: 120,
    stockMinimo: 80,
    costoUnitario: 6.4,
    ubicacion: "Almacén A · Estante 1",
    proveedor: "Distribuidora Grafisa",
    lote: "L-2026-1001",
    actualizadoEn: "2026-11-15T11:00:00.000Z",
  },
  {
    id: "inv-cartulina-240",
    sku: "PAP-CAR-240",
    nombre: "Cartulina 240 g",
    categoria: "PAPEL",
    unidad: "pliego",
    stock: 640,
    stockMinimo: 400,
    costoUnitario: 0.72,
    ubicacion: "Almacén A · Estante 4",
    proveedor: "Papeles del Centro",
    lote: "L-2026-0955",
    actualizadoEn: "2026-11-13T10:10:00.000Z",
  },
  {
    id: "inv-adhesivo-80",
    sku: "PAP-ADH-080",
    nombre: "Papel Adhesivo 80 g",
    categoria: "PAPEL",
    unidad: "pliego",
    stock: 18,
    stockMinimo: 25,
    costoUnitario: 0.58,
    ubicacion: "Almacén B · Estante 1",
    proveedor: "Insumos Gráficos Caracas",
    lote: "L-2026-1043",
    actualizadoEn: "2026-11-16T08:30:00.000Z",
  },
  {
    id: "inv-vinilo",
    sku: "PAP-VIN-BR",
    nombre: "Vinilo blanco brillante",
    categoria: "VINILOS",
    unidad: "rollo",
    stock: 3,
    stockMinimo: 6,
    costoUnitario: 84.0,
    ubicacion: "Almacén B · Rack 2",
    proveedor: "Gran Formato C.A.",
    lote: "L-2026-0771",
    actualizadoEn: "2026-11-12T16:20:00.000Z",
  },
  {
    id: "inv-lona",
    sku: "PAP-LON-13",
    nombre: "Lona front 13 oz",
    categoria: "VINILOS",
    unidad: "rollo",
    stock: 12,
    stockMinimo: 8,
    costoUnitario: 112.0,
    ubicacion: "Almacén B · Rack 1",
    proveedor: "Gran Formato C.A.",
    lote: "L-2026-0810",
    actualizadoEn: "2026-11-10T09:00:00.000Z",
  },
  {
    id: "inv-cyan",
    sku: "TIN-CMY-C",
    nombre: "Tinta Cyan proceso",
    categoria: "TINTAS",
    unidad: "kg",
    stock: 8,
    stockMinimo: 6,
    costoUnitario: 31.5,
    ubicacion: "Almacén C · Tintas",
    proveedor: "Sun Chemical",
    lote: "T-1182",
    actualizadoEn: "2026-11-14T08:00:00.000Z",
  },
  {
    id: "inv-magenta",
    sku: "TIN-CMY-M",
    nombre: "Tinta Magenta proceso",
    categoria: "TINTAS",
    unidad: "kg",
    stock: 5,
    stockMinimo: 6,
    costoUnitario: 31.5,
    ubicacion: "Almacén C · Tintas",
    proveedor: "Sun Chemical",
    lote: "T-1183",
    actualizadoEn: "2026-11-14T08:05:00.000Z",
  },
  {
    id: "inv-amarillo",
    sku: "TIN-CMY-Y",
    nombre: "Tinta Amarilla proceso",
    categoria: "TINTAS",
    unidad: "kg",
    stock: 7,
    stockMinimo: 6,
    costoUnitario: 31.5,
    ubicacion: "Almacén C · Tintas",
    proveedor: "Sun Chemical",
    lote: "T-1184",
    actualizadoEn: "2026-11-14T08:10:00.000Z",
  },
  {
    id: "inv-negro",
    sku: "TIN-CMY-K",
    nombre: "Tinta Negra proceso",
    categoria: "TINTAS",
    unidad: "kg",
    stock: 10,
    stockMinimo: 8,
    costoUnitario: 29.0,
    ubicacion: "Almacén C · Tintas",
    proveedor: "Sun Chemical",
    lote: "T-1185",
    actualizadoEn: "2026-11-14T08:15:00.000Z",
  },
  {
    id: "inv-pantone-032",
    sku: "TIN-PAN-032",
    nombre: "Tinta Pantone 032 C",
    categoria: "TINTAS",
    unidad: "kg",
    stock: 1.5,
    stockMinimo: 2,
    costoUnitario: 64.0,
    ubicacion: "Almacén C · Pantone",
    proveedor: "Sun Chemical",
    lote: "T-2011",
    actualizadoEn: "2026-11-16T09:45:00.000Z",
  },
  {
    id: "inv-barniz",
    sku: "TIN-BAR-UV",
    nombre: "Barniz UV brillante",
    categoria: "TINTAS",
    unidad: "litro",
    stock: 4,
    stockMinimo: 3,
    costoUnitario: 22.8,
    ubicacion: "Almacén C · Acabados",
    proveedor: "Insumos Gráficos Caracas",
    lote: "T-3004",
    actualizadoEn: "2026-11-11T13:30:00.000Z",
  },
  {
    id: "inv-planchas",
    sku: "ALM-CTP",
    nombre: "Planchas CTP 52",
    categoria: "PLANCHAS",
    unidad: "unidad",
    stock: 24,
    stockMinimo: 30,
    costoUnitario: 12.4,
    ubicacion: "CTP · Cuarto oscuro",
    proveedor: "Kodak Venezuela",
    lote: "CTP-5501",
    actualizadoEn: "2026-11-15T07:50:00.000Z",
  },
  {
    id: "inv-cajas",
    sku: "ALM-CAJ-4030",
    nombre: "Cajas corrugadas 40x30",
    categoria: "ALMACEN",
    unidad: "caja",
    stock: 85,
    stockMinimo: 50,
    costoUnitario: 1.9,
    ubicacion: "Almacén D · Empaque",
    proveedor: "Empaques Vargas",
    lote: "E-0914",
    actualizadoEn: "2026-11-09T17:10:00.000Z",
  },
  {
    id: "inv-film",
    sku: "ALM-FILM-STR",
    nombre: "Film stretch 50 cm",
    categoria: "ALMACEN",
    unidad: "rollo",
    stock: 9,
    stockMinimo: 12,
    costoUnitario: 8.5,
    ubicacion: "Almacén D · Empaque",
    proveedor: "Empaques Vargas",
    lote: "E-1002",
    actualizadoEn: "2026-11-16T10:05:00.000Z",
  },
  {
    id: "inv-sellos-dukes",
    sku: "SEL-DUK-44",
    nombre: "Stickers Los Dukes 4x4",
    categoria: "SELLOS",
    unidad: "unidad",
    stock: 1200,
    stockMinimo: 500,
    costoUnitario: 0.33,
    ubicacion: "Almacén D · Despacho pendiente",
    proveedor: "Producción interna",
    lote: "OT-2026-0183",
    actualizadoEn: "2026-11-15T16:00:00.000Z",
  },
  {
    id: "inv-sellos-fundy",
    sku: "SEL-FUN-55",
    nombre: "Etiquetas Fundy 5x5",
    categoria: "SELLOS",
    unidad: "unidad",
    stock: 800,
    stockMinimo: 400,
    costoUnitario: 0.14,
    ubicacion: "Almacén D · Despacho pendiente",
    proveedor: "Producción interna",
    lote: "OT-2026-0182",
    actualizadoEn: "2026-11-15T16:20:00.000Z",
  },
  {
    id: "inv-sellos-nacari",
    sku: "SEL-NAC-44",
    nombre: "Sellos NACARI 4x4",
    categoria: "SELLOS",
    unidad: "unidad",
    stock: 3500,
    stockMinimo: 1000,
    costoUnitario: 0.22,
    ubicacion: "Almacén D · Despacho pendiente",
    proveedor: "Producción interna",
    lote: "OT-2026-0168",
    actualizadoEn: "2026-11-13T14:10:00.000Z",
  },
  {
    id: "inv-sellos-triple",
    sku: "SEL-TRI-PAP",
    nombre: "Papelería Triple 3000",
    categoria: "SELLOS",
    unidad: "unidad",
    stock: 150,
    stockMinimo: 100,
    costoUnitario: 2.1,
    ubicacion: "Almacén D · Despacho pendiente",
    proveedor: "Producción interna",
    lote: "OT-2026-0184",
    actualizadoEn: "2026-11-16T08:00:00.000Z",
  },
];

const SEED_MOVIMIENTOS: MovimientoInventario[] = [
  {
    id: "mov-01",
    materialId: "inv-couche-150",
    materialNombre: "Papel Couché 150 g",
    tipo: "SALIDA",
    cantidad: 6,
    motivo: "Consumo OT-2026-0182",
    usuario: "Carlos Mendoza",
    fecha: "2026-11-15T09:20:00.000Z",
  },
  {
    id: "mov-02",
    materialId: "inv-pantone-032",
    materialNombre: "Tinta Pantone 032 C",
    tipo: "SALIDA",
    cantidad: 0.5,
    motivo: "Ajuste de color OT-2026-0175",
    usuario: "Andreína Gil",
    fecha: "2026-11-16T09:45:00.000Z",
  },
  {
    id: "mov-03",
    materialId: "inv-bond-75",
    materialNombre: "Papel Bond 75 g",
    tipo: "ENTRADA",
    cantidad: 40,
    motivo: "Compra proveedor Grafisa",
    usuario: "Almacén",
    fecha: "2026-11-15T11:00:00.000Z",
  },
  {
    id: "mov-04",
    materialId: "inv-film",
    materialNombre: "Film stretch 50 cm",
    tipo: "SALIDA",
    cantidad: 3,
    motivo: "Empaque de despachos",
    usuario: "José Manuel Díaz",
    fecha: "2026-11-16T10:05:00.000Z",
  },
  {
    id: "mov-05",
    materialId: "inv-adhesivo-80",
    materialNombre: "Papel Adhesivo 80 g",
    tipo: "RESERVA",
    cantidad: 12,
    motivo: "Reserva OT-2026-0183",
    usuario: "Sistema",
    fecha: "2026-11-16T08:30:00.000Z",
  },
  {
    id: "mov-06",
    materialId: "inv-cyan",
    materialNombre: "Tinta Cyan proceso",
    tipo: "ENTRADA",
    cantidad: 4,
    motivo: "Reposición Sun Chemical",
    usuario: "Almacén",
    fecha: "2026-11-14T08:00:00.000Z",
  },
  {
    id: "mov-07",
    materialId: "inv-sellos-dukes",
    materialNombre: "Stickers Los Dukes 4x4",
    tipo: "ENTRADA",
    cantidad: 1200,
    motivo: "Ingreso a despacho OT-2026-0183",
    usuario: "Daniela Rojas",
    fecha: "2026-11-15T16:00:00.000Z",
  },
  {
    id: "mov-08",
    materialId: "inv-planchas",
    materialNombre: "Planchas CTP 52",
    tipo: "SALIDA",
    cantidad: 6,
    motivo: "Planchas OT-2026-0181",
    usuario: "Luis Pérez",
    fecha: "2026-11-15T07:50:00.000Z",
  },
];

const SEED_NOTIFICACIONES: Notificacion[] = [
  {
    id: "not-01",
    tipo: "STOCK",
    titulo: "Pantone 032 C bajo mínimo",
    detalle: "Quedan 1,5 kg · mínimo 2 kg. Revisa la orden de compra.",
    roles: ["ADMIN", "PRODUCCION"],
    leidaPor: [],
    creadaEn: "2026-11-16T09:45:00.000Z",
  },
  {
    id: "not-02",
    tipo: "PEDIDO_LISTO",
    titulo: "Pedido listo para entrega",
    detalle: "OT-2026-0178 · Pendones Movik C.A. · empaquetado",
    ordenId: "ot-0178",
    codigo: "OT-2026-0178",
    roles: ["VENDEDOR", "ADMIN"],
    leidaPor: [],
    creadaEn: "2026-11-16T16:20:00.000Z",
  },
  {
    id: "not-03",
    tipo: "STOCK",
    titulo: "Film stretch por debajo del mínimo",
    detalle: "9 rollos disponibles · mínimo 12 rollos.",
    roles: ["ADMIN", "PRODUCCION"],
    leidaPor: [],
    creadaEn: "2026-11-16T10:05:00.000Z",
  },
  {
    id: "not-04",
    tipo: "SISTEMA",
    titulo: "Nuevo ciclo de producción",
    detalle: "12 órdenes activas distribuidas en las 4 fases de control.",
    roles: ["ADMIN", "PRODUCCION", "VENDEDOR"],
    leidaPor: [],
    creadaEn: "2026-11-15T07:00:00.000Z",
  },
];

function buildSeed(): MockDatabase {
  return {
    clientes: SEED_CLIENTES,
    ordenes: SEED_ORDENES.map(normalizarOrden),
    inventario: SEED_INVENTARIO.map(normalizarMaterial),
    movimientos: SEED_MOVIMIENTOS,
    notificaciones: SEED_NOTIFICACIONES,
  };
}

function readDb(): MockDatabase {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (!raw) {
      const seed = buildSeed();
      window.localStorage.setItem(DB_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<MockDatabase>;
    if (!Array.isArray(parsed.clientes) || !Array.isArray(parsed.ordenes)) {
      return buildSeed();
    }
    return {
      clientes: parsed.clientes,
      ordenes: parsed.ordenes.map(normalizarOrden),
      inventario: (parsed.inventario ?? []).map(normalizarMaterial),
      movimientos: parsed.movimientos ?? [],
      notificaciones:
        Array.isArray(parsed.notificaciones) && parsed.notificaciones.length > 0
          ? parsed.notificaciones
          : SEED_NOTIFICACIONES,
    };
  } catch {
    return buildSeed();
  }
}

function writeDb(db: MockDatabase) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function delay(ms = 320) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockDb = {
  async listarClientes(): Promise<Cliente[]> {
    await delay(180);
    return readDb().clientes;
  },

  async crearCliente(
    input: Omit<Cliente, "id" | "creadoEn" | "ordenesActivas" | "saldoPendiente">,
  ): Promise<Cliente> {
    await delay(300);
    const db = readDb();
    const cliente: Cliente = {
      ...input,
      id: `cli-${crypto.randomUUID().slice(0, 8)}`,
      ordenesActivas: 0,
      saldoPendiente: 0,
      creadoEn: new Date().toISOString(),
    };
    db.clientes = [cliente, ...db.clientes];
    writeDb(db);
    return cliente;
  },

  async listarOrdenes(): Promise<OrdenTrabajo[]> {
    await delay(260);
    return readDb().ordenes;
  },

  async crearOrden(input: NuevaOrdenTrabajo): Promise<OrdenTrabajo> {
    await delay(420);
    const db = readDb();
    const year = new Date().getFullYear();
    const nextNumber =
      db.ordenes.reduce((max, orden) => {
        const parsed = Number(orden.codigo.split("-").at(-1));
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 0) + 1;
    const cliente = db.clientes.find((item) => item.id === input.clienteId);

    const codigo = `OT-${year}-${String(nextNumber).padStart(4, "0")}`;
    const ahora = new Date().toISOString();
    const evento: EventoOrden = {
      id: `evt-${crypto.randomUUID().slice(0, 8)}`,
      fase: "EN_PROCESO",
      anterior: null,
      usuario: input.vendedor ?? "Sistema",
      rol: "VENDEDOR",
      fecha: ahora,
      nota: "Orden creada y enviada a taller",
    };

    const orden: OrdenTrabajo = {
      ...input,
      id: `ot-${crypto.randomUUID().slice(0, 8)}`,
      codigo,
      clienteNombre: cliente?.nombre ?? "Cliente nuevo",
      fase: "EN_PROCESO",
      avance: 5,
      operador: "Por asignar",
      categoriaTrabajo: input.categoriaTrabajo ?? "GENERAL",
      historial: [evento],
      fechaCreacion: ahora,
    };

    const notificacion: Notificacion = {
      id: `not-${crypto.randomUUID().slice(0, 8)}`,
      tipo: "FASE",
      titulo: "Nueva orden recibida en taller",
      detalle: `${codigo} · ${orden.producto} · ${cliente?.nombre ?? "Cliente nuevo"}`,
      ordenId: orden.id,
      codigo,
      roles: ["ADMIN", "PRODUCCION"],
      leidaPor: [],
      creadaEn: ahora,
    };

    db.ordenes = [orden, ...db.ordenes];
    db.notificaciones = [notificacion, ...db.notificaciones];
    writeDb(db);
    return orden;
  },

  /**
   * Avanza una orden a la siguiente fase. El flujo es estrictamente secuencial:
   * no se puede saltar ni retroceder, y cada paso queda auditado con usuario,
   * rol y fecha. Al llegar a Finalizado/Empaquetado se notifica al vendedor.
   */
  async actualizarFaseOrden(
    id: string,
    fase: FasePlanta,
    actor: ActorOrden,
    nota?: string,
  ): Promise<OrdenTrabajo> {
    await delay(240);
    const db = readDb();
    const index = db.ordenes.findIndex((orden) => orden.id === id);
    if (index === -1) throw new Error("La orden de trabajo no existe.");

    const actual = db.ordenes[index];
    const indiceActual = FASES_FLUJO.indexOf(actual.fase);
    const indiceDestino = FASES_FLUJO.indexOf(fase);

    if (indiceActual === -1) {
      throw new Error("La orden tiene una fase desconocida.");
    }

    if (indiceDestino !== indiceActual + 1) {
      if (indiceActual >= FASES_FLUJO.length - 1) {
        throw new Error("La orden ya está empaquetada; no tiene fases pendientes.");
      }
      if (indiceDestino <= indiceActual) {
        throw new Error(
          "La orden no puede retroceder de fase: el flujo de calidad es secuencial.",
        );
      }
      throw new Error(
        `Debes completar «${FASE_PLANTA[FASES_FLUJO[indiceActual + 1]].label}» antes de avanzar.`,
      );
    }

    const avancePorFase: Record<FasePlanta, number> = {
      EN_PROCESO: 45,
      EN_REVISION: 85,
      FINALIZADO: 98,
      EMPACADO: 100,
    };

    const ahora = new Date().toISOString();
    const evento: EventoOrden = {
      id: `evt-${crypto.randomUUID().slice(0, 8)}`,
      fase,
      anterior: actual.fase,
      usuario: actor.usuario,
      rol: actor.rol,
      fecha: ahora,
      nota,
    };

    const actualizada: OrdenTrabajo = {
      ...actual,
      fase,
      avance: avancePorFase[fase],
      historial: [...(actual.historial ?? []), evento],
    };

    const nuevas: Notificacion[] = [];

    if (FASES_AVISO.includes(fase)) {
      nuevas.push({
        id: `not-${crypto.randomUUID().slice(0, 8)}`,
        tipo: "PEDIDO_LISTO",
        titulo:
          fase === "EMPACADO"
            ? "Pedido empaquetado y listo para entrega"
            : "Producción finalizada, lista para empaque",
        detalle: `${actual.codigo} · ${actual.producto} · ${actual.clienteNombre}`,
        ordenId: actual.id,
        codigo: actual.codigo,
        roles: ["VENDEDOR", "ADMIN"],
        leidaPor: [],
        creadaEn: ahora,
      });
    }

    db.ordenes[index] = actualizada;
    db.notificaciones = [...nuevas, ...db.notificaciones];
    writeDb(db);
    return actualizada;
  },

  async listarInventario(): Promise<MaterialInventario[]> {
    await delay(220);
    return readDb().inventario;
  },

  async listarMovimientos(): Promise<MovimientoInventario[]> {
    await delay(180);
    return readDb().movimientos;
  },

  async registrarMovimiento(input: {
    materialId: string;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo: string;
    usuario: string;
  }): Promise<MovimientoInventario> {
    await delay(320);
    const db = readDb();
    const material = db.inventario.find((item) => item.id === input.materialId);
    if (!material) throw new Error("El material no existe en inventario.");

    const factor = input.tipo === "ENTRADA" ? 1 : -1;
    const nuevoStock = Math.max(0, material.stock + input.cantidad * factor);
    material.stock = nuevoStock;
    material.actualizadoEn = new Date().toISOString();

    const movimiento: MovimientoInventario = {
      id: `mov-${crypto.randomUUID().slice(0, 8)}`,
      materialId: material.id,
      materialNombre: material.nombre,
      tipo: input.tipo,
      cantidad: input.cantidad,
      motivo: input.motivo,
      usuario: input.usuario,
      fecha: new Date().toISOString(),
    };

    db.movimientos = [movimiento, ...db.movimientos];
    writeDb(db);
    return movimiento;
  },

  async listarNotificaciones(rol: Rol): Promise<Notificacion[]> {
    await delay(140);
    return readDb()
      .notificaciones.filter((notificacion) => notificacion.roles.includes(rol))
      .sort(
        (a, b) => new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime(),
      );
  },

  async marcarNotificacionLeida(
    id: string,
    usuarioId: string,
  ): Promise<Notificacion | null> {
    await delay(90);
    const db = readDb();
    const notificacion = db.notificaciones.find((item) => item.id === id);
    if (!notificacion) return null;
    if (!notificacion.leidaPor.includes(usuarioId)) {
      notificacion.leidaPor = [...notificacion.leidaPor, usuarioId];
      writeDb(db);
    }
    return notificacion;
  },

  async marcarNotificacionesLeidas(
    usuarioId: string,
    rol: Rol,
  ): Promise<number> {
    await delay(120);
    const db = readDb();
    let marcadas = 0;
    db.notificaciones = db.notificaciones.map((notificacion) => {
      if (
        !notificacion.roles.includes(rol) ||
        notificacion.leidaPor.includes(usuarioId)
      ) {
        return notificacion;
      }
      marcadas += 1;
      return {
        ...notificacion,
        leidaPor: [...notificacion.leidaPor, usuarioId],
      };
    });
    if (marcadas > 0) writeDb(db);
    return marcadas;
  },

  async reset(): Promise<void> {
    await delay(150);
    writeDb(buildSeed());
  },
};
