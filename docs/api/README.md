# API del Print MIS — contrato frontend ↔ backend

Esta rama (`API`) define **cómo se hablan** el frontend (React, rama `Frontend`)
y el backend (Fastify + PostgreSQL, rama `Backend`). No contiene servidor ni
pantallas: contiene el contrato que ambos implementan.

| Paquete | Para qué sirve | Lo usa |
|---|---|---|
| [`packages/contrato`](../../packages/contrato) | Reglas compartidas (roles, 4 fases y sus transiciones, categorías, códigos de error), esquemas Zod de cada recurso y la tabla de endpoints. JavaScript ESM, sin paso de compilación. | Backend (valida peticiones y respuestas) y frontend (tipos y validación) |
| [`packages/cliente-http`](../../packages/cliente-http) | Cliente tipado: un método por endpoint, con entrada y respuesta validadas y errores como `ApiError`. Sustituye a los mocks de `localStorage`. | Frontend |
| [`openapi.json`](openapi.json) | Especificación OpenAPI 3.1 **generada** desde el contrato (`npm run openapi`). No se edita a mano. | Documentación y herramientas (Swagger UI, Postman) |

```bash
cd packages/contrato && npm install && npm test && npm run openapi
cd packages/cliente-http && npm install && npm test -- --typecheck
```

## Reglas de negocio acordadas (2026-11-20)

1. **Cuatro fases de control de calidad:** `EN_PROCESO → EN_REVISION → FINALIZADO → EMPAQUETADO`.
   Solo se avanza una fase por vez.
2. **Retrabajo:** la única vuelta atrás es `EN_REVISION → EN_PROCESO` (calidad
   rechaza el trabajo) y exige una nota con el motivo.
3. **Cada vendedor ve solo sus órdenes.** Administración y Producción ven todas.
   El vendedor de una orden es el usuario de la sesión que la crea: no viaja en
   el cuerpo.
4. **Entrega desde almacén:** al llegar a `EMPAQUETADO` el pedido entra al
   almacén como pendiente. La entrega (total o parcial) se registra en *Sellos y
   PT*. La orden tiene un `estadoEntrega` aparte de su fase:
   `NO_APLICA → PENDIENTE → PARCIAL → ENTREGADO`. El tablero de 4 fases no cambia.

## Autenticación

- Sesión por **cookie httpOnly** `markenny_sesion` (SameSite=Lax; Secure en
  producción). El frontend no guarda tokens ni contraseñas.
- `GET /auth/estado` indica si ya existe el administrador. `POST /auth/setup-admin`
  solo funciona mientras no exista ninguno (`409 ADMIN_YA_REGISTRADO` después).
- Un login fallido responde siempre `401 CREDENCIALES_INVALIDAS`, sin indicar si
  el correo existe.
- Los permisos se comprueban **en el servidor** con la columna `roles` de cada
  endpoint. Las guardas del frontend solo ocultan pantallas.

## Endpoints (`/api/v1`)

| Método | Ruta | Roles | Uso |
|---|---|---|---|
| GET | `/auth/estado` | público | ¿Existe administrador? |
| POST | `/auth/setup-admin` | público | Registro único del administrador |
| POST | `/auth/login` | público | Inicia sesión |
| POST | `/auth/logout` | todos | Cierra sesión |
| GET | `/auth/sesion` | todos | Usuario de la sesión |
| GET · POST | `/usuarios` | Admin | Empleados (solo crea Vendedor o Producción) |
| PATCH | `/usuarios/:id/estado` | Admin | Activar o desactivar |
| POST | `/usuarios/:id/password` | Admin | Restablecer contraseña |
| GET · POST | `/clientes` | Admin, Vendedor | Cartera de clientes |
| GET | `/ordenes` | todos | Órdenes (el vendedor solo ve las suyas) |
| GET | `/ordenes/:id` | todos | Detalle con historial auditado |
| POST | `/ordenes` | Admin, Vendedor | Crea la OT y la envía a planta |
| POST | `/ordenes/:id/transiciones` | Admin, Producción | Cambio de fase (avance o retrabajo) |
| GET | `/inventario/materiales` | Admin, Producción | Existencias |
| POST | `/inventario/materiales` | Admin | Alta de material |
| GET · POST | `/inventario/movimientos` | Admin, Producción | Kardex y registro de movimientos |
| GET | `/inventario/productos-terminados` | Admin, Producción | Sellos y PT pendientes de entrega |
| POST | `/inventario/productos-terminados/:id/entregas` | Admin, Producción | Entrega total o parcial |
| GET | `/notificaciones` | todos | Campana del usuario |
| POST | `/notificaciones/:id/leida` · `/notificaciones/leidas` | todos | Marcar leídas |
| GET | `/produccion/eventos` | todos | Tiempo real (SSE) |

El detalle de cada cuerpo y respuesta está en `packages/contrato/src/esquemas.js`
y en `openapi.json`.

## Errores

Todas las respuestas de error tienen la forma
`{ "error": "CODIGO", "mensaje": "texto para el usuario", "detalles"?: ... }`.

| HTTP | Códigos |
|---|---|
| 400 | `CONTRATO_INVALIDO` (`detalles`: lista de `{ ruta, mensaje, codigo }`) |
| 401 | `NO_AUTENTICADO`, `CREDENCIALES_INVALIDAS` |
| 403 | `SIN_PERMISO` |
| 404 | `NO_ENCONTRADO` (también para la orden de otro vendedor) |
| 409 | `ADMIN_YA_REGISTRADO`, `EMAIL_DUPLICADO`, `CODIGO_DUPLICADO`, `TRANSICION_NO_PERMITIDA`, `CONFLICTO_CONCURRENCIA`, `STOCK_INSUFICIENTE` |
| 422 | `MOTIVO_REQUERIDO`, `ENTREGA_INVALIDA`, `REGLA_NEGOCIO` |

## Qué cambia respecto al frontend actual (mock)

El contrato respeta las formas que ya usa el frontend. Al conectarlo cambia lo
siguiente:

| Recurso | Frontend hoy (mock) | Contrato |
|---|---|---|
| Ids | `ot-1a2b3c4d`, `cli-…` | UUID del servidor |
| Usuario de un evento o movimiento | solo el nombre | `usuarioId` + `usuario` (nombre) |
| Vendedor de una orden | nombre enviado por el cliente | `vendedorId` + `vendedor`, asignados por el servidor |
| Responsable de un movimiento | campo del formulario | usuario de la sesión (no viaja en el cuerpo) |
| Notificaciones | `roles[]` + `leidaPor[]` | `leida` ya resuelto para el usuario |
| Orden | — | añade `version` (bloqueo optimista), `estadoEntrega` y `operador` nullable |
| Fechas | ISO al mediodía local (desde la auditoría) | ISO 8601 con zona, obligatorio |

## Qué tendrá que ajustar el backend y la base de datos

`markenny-print.sql` (rama `Backend`) y `apps/backend` no coinciden todavía con
el contrato. Esto se resuelve en la rama `Backend`:

- **Clientes:** la tabla no existe (las órdenes guardan `cliente_nombre`). Hace
  falta `clientes` y `ordenes_trabajo.cliente_id`.
- **Roles:** el SQL usa `ADMINISTRADOR` y el contrato `ADMIN`.
- **Fases:** el SQL incluye `ENTREGADO` dentro de `estado_produccion`. Con la
  decisión 4 la fase tiene 4 valores y la entrega va en `estado_entrega` y en
  `stock_productos_pendientes`.
- **Categorías de material:** el SQL usa `TINTA`, `VINIL` y `PLANCHA_CTP`; el
  contrato usa las del frontend (`TINTAS`, `VINILOS`, `PLANCHAS`…).
- **Faltan tablas** de sesiones, movimientos de inventario, notificaciones (y
  sus lecturas) y entregas.
- **Faltan columnas** de órdenes (producto, tecnología, prioridad, máquina,
  cantidad, sustrato, tintas, acabados) y de materiales (costo, ubicación,
  proveedor, lote).
- **`apps/backend`:** el código `OP-AAAA-NNNNNN` pasa a `OT-AAAA-NNNN`, los
  tipos de producto a `IMPRESO/SELLO`, y las rutas a `/api/v1/...` según esta
  tabla.
