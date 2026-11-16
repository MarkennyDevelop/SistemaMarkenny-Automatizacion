# Backend — Print MIS / ERP Markenny C.A.

Monolito modular con arquitectura hexagonal (Ports & Adapters) y EventBus interno.
Stack: Node.js ≥ 20 · JavaScript (ES Modules) · Fastify 4 · PostgreSQL 16 · Zod 3 · Vitest.

## Estructura

```
src/
├── server.js                 # Punto de entrada
├── app.js                    # Composition root: cablea puertos con adaptadores
├── config/env.js             # Variables de entorno validadas con Zod
├── shared/                   # Kernel compartido
│   ├── domain/               # Errores base, usuario actor, inmutabilidad (código puro)
│   ├── application/          # Puertos transversales, validación de contratos Zod
│   ├── events/               # EventBus (EventEmitter) + catálogo de eventos con Zod
│   ├── db/                   # Pool pg, transacciones, migraciones SQL
│   ├── http/                 # Manejador de errores, identificación de usuario
│   └── infra/                # Adaptadores de reloj e IDs
└── modules/
    ├── produccion/           # Órdenes de producción + máquina de estados de calidad
    ├── inventario/           # Materias primas + stock de sellos / productos terminados
    └── ventas/               # (esqueleto) pedidos, cotizaciones, clientes
        ├── domain/           # Lógica pura: SIN fastify, pg, zod ni node:*
        ├── application/      # Casos de uso + puertos (ports/)
        ├── infra/            # Adaptadores: memoria, PostgreSQL, rutas Fastify
        ├── schemas/          # Contratos Zod de entrada/salida
        └── index.js          # API pública del módulo
```

Las reglas de dependencia se verifican automáticamente en `test/arquitectura.test.js`:
el dominio solo importa dominio, ningún módulo importa internos de otro y la capa de
aplicación no depende de infraestructura.

## Producción: máquina de estados de control de calidad

```
EN_PROCESO ──► EN_REVISION ──► FINALIZADO ──► EMPAQUETADO (terminal)
     ▲              │
     └── rechazo QC ┘  (exige motivo)
```

- No se pueden saltar etapas ni retroceder salvo el rechazo de calidad.
- Cada transición genera un registro de auditoría inmutable: `secuencia, desde, hacia,
  usuario {id, nombre, rol}, fecha, motivo`. En PostgreSQL vive en
  `produccion_auditoria_transiciones`, protegida por triggers contra UPDATE/DELETE/TRUNCATE.
- Bloqueo optimista por `version` (dos operarios no pueden pisarse cambios).

## Eventos entre módulos

| Evento | Publica | Consume | Efecto |
|---|---|---|---|
| `produccion.orden_trabajo.aprobada` | Producción | Inventario | Descuenta materias primas (todo o nada, idempotente) |
| `produccion.orden.empaquetada` | Producción | Inventario | Ingresa el lote al almacén como `PENDIENTE_ENTREGA` |
| `produccion.orden.estado_cambiado` | Producción | — (futuro: SSE Kanban) | |
| `inventario.materiales.descontados` | Inventario | — | |
| `inventario.descuento_materiales.fallido` | Inventario | — (futuro: alertas) | Stock insuficiente, etc. |

El bus despacha de forma asíncrona (`setImmediate`), aísla fallos de cada manejador y
valida los payloads con Zod al publicar.

## API HTTP (v1)

El usuario actor se toma provisionalmente de las cabeceras `x-usuario-id`,
`x-usuario-nombre`, `x-usuario-rol` (se sustituirá por autenticación).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/v1/produccion/ordenes` | Aprobar orden de trabajo (crea orden EN_PROCESO) |
| GET | `/v1/produccion/ordenes?estado=` | Listar órdenes |
| GET | `/v1/produccion/ordenes/:id` | Consultar orden |
| POST | `/v1/produccion/ordenes/:id/transiciones` | `{ hacia, motivo?, versionEsperada? }` |
| GET | `/v1/produccion/ordenes/:id/historial` | Auditoría de transiciones |
| POST | `/v1/inventario/materiales` | Registrar materia prima |
| GET | `/v1/inventario/materiales?categoria=` | Listar con indicador `bajoMinimo` |
| POST | `/v1/inventario/materiales/:id/entradas` | Entrada de stock |
| GET | `/v1/inventario/materiales/:id/movimientos` | Kardex del material |
| GET | `/v1/inventario/productos-terminados/pendientes?tipoProducto=SELLO` | Stock pendiente de entrega |
| POST | `/v1/inventario/productos-terminados/:id/entregas` | Entrega total o parcial |

Errores: 400 contrato inválido · 401 sin usuario · 404 no encontrado ·
409 transición no permitida / conflicto de versión / stock insuficiente · 422 otra regla de negocio.

## Uso

```bash
npm install
npm test                      # pruebas (las de PostgreSQL se omiten sin TEST_DATABASE_URL)
npm run dev                   # sin DATABASE_URL usa repositorios en memoria
```

Con PostgreSQL:

```bash
cp .env.example .env          # ajustar DATABASE_URL
DATABASE_URL=postgres://... npm run migrate
TEST_DATABASE_URL=postgres://.../markenny_test npm test   # BD desechable: se recrea el esquema
```
