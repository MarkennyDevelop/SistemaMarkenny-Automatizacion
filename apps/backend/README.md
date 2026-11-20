# Backend — Print MIS / ERP Markenny C.A.

Monolito modular con arquitectura hexagonal (Ports & Adapters) y EventBus
interno. Implementa el contrato de la API de `packages/contrato`.

**Stack:** Node.js ≥ 20.12 · JavaScript (ES Modules) · Fastify 4 · PostgreSQL ≥ 13
(probado con 16) · Zod 3 · Vitest.

## Arranque rápido

```bash
npm install                    # desde la raíz del repositorio (instala el monorepo)
cp apps/backend/.env.example apps/backend/.env   # y ajusta DATABASE_URL
npm run migrate                # crea las tablas (ver docs/BASE-DE-DATOS.md)
npm run dev:backend            # http://localhost:3000
```

Sin `DATABASE_URL` el backend arranca con **repositorios en memoria**: sirve para
probar, pero los datos se pierden al reiniciar.

Primer uso: `POST /api/v1/auth/setup-admin` registra el administrador maestro
(una sola vez). Después, el administrador crea a los vendedores y operarios desde
*Empleados*.

## Pruebas

```bash
cd apps/backend
npm test                                         # dominio, arquitectura, API en memoria, eventos y SSE
TEST_DATABASE_URL=postgres://…/markenny_test npm test   # además, la API completa contra PostgreSQL
```

`TEST_DATABASE_URL` debe apuntar a una base **desechable**: las pruebas recrean
su esquema `public`.

## Estructura

```
src/
├── server.js                 # Punto de entrada (carga .env)
├── app.js                    # Composition root: conecta puertos con adaptadores
├── config/env.js             # Variables de entorno validadas con Zod
├── shared/
│   ├── domain/               # Errores, actor auditado, inmutabilidad (código puro)
│   ├── application/          # Validación Zod de casos de uso, puertos transversales
│   ├── events/               # EventBus (EventEmitter) y catálogo de eventos internos
│   ├── db/                   # Pool pg, transacciones, migraciones y SQL de referencia
│   └── http/                 # Registro de la API desde el contrato, sesión por cookie, errores
└── modules/
    ├── auth/                 # Administrador maestro, login, sesiones y empleados
    ├── ventas/               # Clientes
    ├── produccion/           # Órdenes de trabajo, 4 fases de calidad, tiempo real (SSE)
    ├── inventario/           # Materiales, kardex, sellos y productos pendientes de entrega
    └── notificaciones/       # Campana: avisos por rol y por vendedor
        ├── domain/           # Reglas puras: sin Fastify, pg ni Zod
        ├── application/      # Casos de uso (con contrato Zod) y puertos
        ├── infra/            # Adaptadores: memoria y PostgreSQL
        └── index.js          # API pública del módulo y manejadores HTTP
```

Las reglas se verifican en `test/arquitectura.test.js`:
- el dominio solo importa dominio y las reglas puras del contrato (`@markenny/contrato/dominio`);
- ningún módulo importa a otro;
- la capa de aplicación no depende de infraestructura.

## Cómo se garantiza el contrato

`src/shared/http/api.js` registra **todas** las rutas a partir de la tabla
`ENDPOINTS` del contrato:

1. comprueba sesión y rol (`roles` del endpoint) → 401 / 403;
2. valida params, query y body con los esquemas del contrato → 400;
3. valida la respuesta antes de enviarla (si no cumple, 500 y log: nunca sale
   algo que el frontend no espera);
4. usa el código de éxito declarado (200, 201 o 204).

Si falta implementar un endpoint del contrato, o sobra uno, la app no arranca.

## Reglas de negocio

| Regla | Dónde vive |
|---|---|
| Un único administrador maestro; un login fallido no revela qué correos existen | `auth/application/casosUso.js`, `auth/infra/postgres.js` (cerrojo transaccional) |
| Contraseñas con scrypt y sal; sesión en cookie httpOnly con token guardado como SHA-256 | `auth/infra/seguridad.js`, `shared/http/sesion.js` |
| Desactivar un usuario o cambiar su contraseña cierra sus sesiones | `auth/application/casosUso.js` |
| 4 fases secuenciales; retrabajo `EN_REVISION → EN_PROCESO` con motivo; solo Producción/Admin | `produccion/domain/ordenTrabajo.js` + `@markenny/contrato/dominio` |
| Bloqueo optimista por `version` en órdenes, materiales y entregas | repositorios + `CONFLICTO_CONCURRENCIA` |
| Cada vendedor ve solo sus órdenes y sus avisos | `produccion/domain/ordenTrabajo.js` (`puedeVer`), `notificaciones/domain` |
| Stock nunca negativo; descuento por orden todo o nada e idempotente | `inventario/domain/inventario.js` + `CHECK` en BD |
| Auditoría de fases y kardex de solo inserción | triggers en la migración |

## Comunicación entre módulos (EventBus)

| Evento | Publica | Consume |
|---|---|---|
| `produccion.orden.creada` | Producción | Inventario (descuento de materiales), Notificaciones |
| `produccion.orden.actualizada` | Producción | Notificaciones, flujo SSE |
| `produccion.orden.empaquetada` | Producción | Inventario (ingreso al almacén) |
| `inventario.producto.entregado` | Inventario | Producción (`estadoEntrega` de la orden) |
| `inventario.descuento_materiales.fallido` | Inventario | Notificaciones |

Ventas y Producción se consultan entre sí solo por funciones públicas inyectadas
en `app.js`: el cliente de una orden y el resumen de órdenes por cliente.

## Conexión con el frontend

El frontend (rama `Frontend`) debe usar `packages/cliente-http` y un proxy de
Vite, `/api → http://localhost:3000`. Así frontend y API comparten origen y la
cookie de sesión funciona sin CORS.

## Pendiente

- Las fichas de OT del frontend no indican las materias primas a consumir. El
  descuento automático ya está implementado (`materiales` en la orden), pero hoy
  ninguna orden lo usa.
- Módulo de pagos: el `saldoPendiente` de un cliente es provisional (ver
  `docs/BASE-DE-DATOS.md`).
- Guardar los eventos en la base antes de publicarlos (patrón *outbox*), para no
  perder avisos si el proceso se cae justo después de guardar.
