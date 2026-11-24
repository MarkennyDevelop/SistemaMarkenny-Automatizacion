# SistemaMarkenny-Automatizacion

Sistema de gestion de produccion e inventario para la empresa Markenny

## Indicaciones:

Automatizacion de Negocio.

1. Gestion de Ventas y Pedidos
2. Gestion de Inventario y Almacen
3. Gestion de Fases de la Produccion
4. Gestion Administrativa
5. Gestion de usuarios por roles
6. Gestion de Personal Empleado (No incluye nomina por los momentos)

# BACKEND:

1. Node.js LTS
2. Fastify como Framework web
3. JavaScript como Lenguaje Base
4. PostgreSQL para Base de Datos
5. Zod para Validaciones y Seguridad
6. Arquitectura Monolito Modular + Hexagonal + Event-Driven Interno

# FRONTEND:

1. React.js como Framework de la Interfaz
2. TypeScript como Lenguaje Base
3. Tailwind CSS como Framework de estilos
4. Vite como servidor y empaquetador
5. Shadcn UI para Sistema de componentes
6. Arquitectura Feature-Based Architecture

## Ramas del repositorio

| Rama | Contenido |
|---|---|
| `Backend` | Backend (`apps/backend`): Fastify + PostgreSQL + Zod |
| `Frontend` | Frontend (React + TypeScript + Vite + Tailwind + Shadcn UI) |

> **Nota de corrección de rama (2026-11-16):** la estructura base del backend se
> subió por error a esta rama `Frontend` (commit `17f2dcf`). Se trasladó a la rama
> `Backend` y se revirtió aquí, de modo que `Frontend` queda reservada al frontend.

---

## Frontend — Print MIS Markenny

Aplicación React 18 + TypeScript 5 + Vite 5 + Tailwind 3 + shadcn/ui (Radix).
Vive en la raíz del repositorio (`src/`), no en `apps/frontend`, para respetar la
estructura `src/features/*` acordada.

### Cómo abrir el sistema completo (frontend + backend)

El frontend (esta rama) habla con el backend (rama `Backend`) por la API
`/api/v1`. Se necesitan **Node.js 20.12 o superior** y **PostgreSQL 13 o
superior**, y dos carpetas: una con cada rama.

```bash
# Una sola vez: segunda carpeta con la rama Backend, junto a esta
git fetch origin
git worktree add ../markenny-backend Backend
```

**Terminal 1 — backend** (en `../markenny-backend`):

```bash
npm install
cp apps/backend/.env.example apps/backend/.env   # ajustar DATABASE_URL
npm run migrate                                   # crea las tablas
npm run seed:demo                                 # opcional: cuentas y datos de demostración
npm run dev:backend                               # API en http://localhost:3000
```

**Terminal 2 — frontend** (en esta carpeta):

```bash
npm install
npm run dev                                       # abre http://localhost:5173
```

Vite reenvía `/api` al backend en `http://localhost:3000`; otra dirección se
indica con la variable `VITE_BACKEND_URL`. Así frontend y API comparten
origen y la cookie de sesión funciona sin configurar CORS.

Cuentas de `npm run seed:demo` (solo para pruebas; la demo solo se carga en
una base vacía):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@markenny.com` | `Markenny2026` |
| Vendedor | `valeria@markenny.com` | `Ventas2026` |
| Producción | `luis@markenny.com` | `Planta2026` |

Sin `seed:demo`, la primera visita lleva a `/setup-admin` para registrar al
administrador maestro.

> En Windows con PowerShell restringido, usar `npm.cmd` en lugar de `npm`, y
> `copy` en lugar de `cp`.

### Comandos del frontend

```bash
npm run dev       # servidor de desarrollo en http://localhost:5173 (con proxy a la API)
npm run build     # typecheck + build de producción en dist/
npm run preview   # sirve el build en http://localhost:4173 (también con proxy a la API)
npm run typecheck # solo verificación de tipos
npm test          # pruebas unitarias (Vitest)
```

### Acceso y roles

| Rol | Alcance | Aterrizaje |
|---|---|---|
| Administrador | Control total: ventas, producción, inventario y empleados | `/admin` |
| Vendedor | Sus clientes, sus órdenes de trabajo y su seguimiento | `/ventas/dashboard` |
| Producción | Taller, control de calidad, empaque, almacén y entregas | `/produccion` |

- El administrador maestro se registra una sola vez en `/setup-admin`. El
  backend rechaza un segundo registro (`409`).
- El alta de empleados (Vendedor o Producción) es exclusiva del Administrador
  (`/admin/empleados`).
- **La sesión es una cookie httpOnly del backend.** El navegador no guarda
  usuarios, contraseñas ni datos de negocio.
- Los permisos se comprueban en el servidor; las guardas del frontend solo
  ocultan pantallas.
- Si la sesión caduca o el administrador desactiva la cuenta, la app vuelve al
  login sola.

### Rutas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/login` | Inicio de sesión | Público (sin sesión) |
| `/setup-admin` | Registro único del administrador | Público, solo primer arranque |
| `/` | Redirección al inicio del rol | Autenticado |
| `/admin` | Dashboard general | Administrador |
| `/admin/empleados` | Alta y gestión de empleados | Administrador |
| `/ventas/dashboard` | Dashboard del vendedor | Administrador, Vendedor |
| `/ventas/ordenes` | Listado y filtros de órdenes de trabajo | Administrador, Vendedor |
| `/ventas/nueva-orden` | Ficha de papelería corporativa | Administrador, Vendedor |
| `/ventas/nueva-orden/pendones` | Ficha de gran formato | Administrador, Vendedor |
| `/ventas/nueva-orden/otros` | Ficha general de OT | Administrador |
| `/ventas/seguimiento` | Seguimiento de las 4 fases e historial | Administrador, Vendedor |
| `/ventas/cotizador` | Cotizador con motor de estimación en vivo | Administrador, Vendedor |
| `/ventas/clientes` | Cartera de clientes y saldos | Administrador, Vendedor |
| `/produccion` | Tablero Kanban de taller y QC | Administrador, Producción |
| `/planta` | Redirección a `/produccion` | Administrador, Producción |
| `/inventario` | Existencias, movimientos auditados y alertas | Administrador, Producción |
| `/inventario/sellos` | Sellos y producto terminado pendiente de entrega | Administrador, Producción |
| `*` | No encontrado | Autenticado |

### Estructura

```
src/
├─ app/                  # Providers, ErrorBoundary, NotFound
├─ components/
│  ├─ brand/             # MarkennyLogo (SVG propio)
│  ├─ forms/             # FormField, FormGrid (primitivas de formulario)
│  ├─ layout/            # AppShell, Sidebar, Topbar, PageHeader
│  ├─ theme/             # ThemeProvider (claro/oscuro) y ThemeToggle
│  └─ ui/                # Primitivas shadcn/Radix
├─ features/
│  ├─ auth/              # login, setup del admin, empleados y guardas por rol
│  ├─ dashboard/         # components · hooks
│  ├─ notificaciones/    # campana, hooks y marcado de leídas
│  ├─ planta-kanban/     # Kanban de producción, QC y detalle de OT
│  ├─ inventario/        # components · hooks · api · types (incluye sellos/PT)
│  └─ ventas/            # components · hooks · api · lib · types
│     └─ components/
│        ├─ cotizador/   # Compound Components del cotizador
│        ├─ papeleria/   # Compound Components de la ficha de papelería
│        ├─ gran-formato/ # Compound Components de la ficha de gran formato
│        ├─ orden-trabajo/ # Compound Components de la OT general
│        ├─ ordenes/     # Tabla de OT
│        └─ clientes/    # Tabla y diálogo de clientes
├─ lib/                  # utilidades (cn, formatCurrency, formatDate…)
└─ shared/               # domain.ts (tipos del contrato), catalogos.ts, fase-ui.ts, api/ (cliente, queryKeys, tiempoReal)
```

Cada feature exporta su API pública desde `index.ts`; el resto de la app nunca
importa rutas internas de otra feature.

### Convenciones

- **Feature-based**: `components/` (presentación), `hooks/` (TanStack Query),
  `api/` (acceso a datos), `lib/` (reglas de negocio), `types/` (Zod + tipos).
- **Container / Presentational**: las páginas (`*Page.tsx`) orquestan datos y las
  vistas (`*View.tsx`, `*Table.tsx`, `KanbanBoard.tsx`) solo reciben props.
- **Compound Components**: `OrdenTrabajoForm.*`, `CotizadorForm.*`,
  `PapeleriaForm.*` y `GranFormatoForm.*` exponen `Root/Section/Summary/Submit` y
  comparten contexto vía `context.ts`.
- **Autenticación y permisos**: `RequireAuth`, `RequireRole` y `PublicOnly`
  protegen el árbol de rutas; `homeForRol` decide el aterrizaje y el `Sidebar`
  oculta los módulos fuera del alcance del rol.
- **Control de calidad secuencial**: el tablero solo ofrece la fase siguiente y
  el backend es la autoridad: rechaza saltos, exige rol Producción o
  Administrador y registra cada cambio con usuario, rol, fecha y nota. El
  retrabajo `En Revisión → En Proceso` exige motivo. Una orden con un avance
  pendiente no acepta otro, y `versionEsperada` evita pisar el cambio de otro
  operario.
- **Notificaciones**: al marcar *Finalizado* o *Empaquetado*, el vendedor de esa
  orden (y el Administrador) recibe el aviso en la campana del `Topbar`.
- **Entregas**: en *Sellos y PT* se registra la entrega total o parcial de cada
  pedido empaquetado; al completarla, la orden queda "Entregado" en el
  seguimiento.
- **Estado del servidor**: TanStack Query con `queryKeys` centralizadas,
  mutaciones optimistas en Kanban e invalidación cruzada (una OT nueva refresca
  dashboard, listado y tablero).
- **Formularios**: React Hook Form + Zod (`zodResolver`), validación en vivo y
  resumen sticky con cálculos derivados.
- **Diseño**: paleta rojo/negro/blanco definida en `tailwind.config.ts` e
  `src/index.css`; tipografías locales con `@fontsource` (Inter + Barlow Condensed).
- **Datos**: cada feature tiene su capa `api/` sobre `src/shared/api/cliente.ts`,
  el cliente HTTP generado desde el contrato (`packages/cliente-http`). Los
  tipos de `shared/domain.ts` se derivan del contrato.
- **Tiempo real**: `useEventosProduccion` (`shared/api/tiempoReal.ts`) escucha el
  flujo SSE del backend y refresca tablero, seguimiento, almacén y campana al
  instante.
- **Motor de cotización**: patrón Strategy por tipo de impresión (offset, digital,
  gran formato) en `features/ventas/lib/cotizador.ts`; también estima el monto de
  una OT.

### Registro de auditoría — Fase 2 y habilitación de acceso (2026-11-18)

> **Histórico.** Esta sección describe la etapa previa al backend. Desde el
> 2026-11-20 el frontend usa la API y las cuentas viven en PostgreSQL. El botón
> "Cargar cuentas demo" se sustituyó por `npm run seed:demo` del backend.

Este apartado deja constancia del trabajo ejecutado después de la Fase 2 y de la
incidencia de acceso reportada por el usuario. Commits de referencia:
`f21295b` (Fase 2) y `b7a0758` (corrección de acceso).

#### Contexto y alcance

La Fase 2 entregó el frontend funcional completo: tres roles con guardas de ruta,
fichas de OT para papelería y gran formato, tablero Kanban con control de calidad
secuencial y auditado, notificaciones, inventario, sellos y cotizador. Todo se
validó contra la API mock persistente en `localStorage`, sin backend.

#### Síntoma reportado

El usuario indicó que no podía ingresar con las credenciales entregadas para
cada rol y preguntó si eran credenciales ficticias utilizadas únicamente en una
prueba de recorrido.

#### Diagnóstico y causa raíz

Las credenciales **no están codificadas en la aplicación**. Se crearon durante
la validación dentro del `localStorage` del navegador automatizado usado para las
pruebas (`markenny.print-mis.auth.v1`). Ese almacenamiento es privado por
navegador, perfil y equipo, por lo que en el navegador del usuario:

- no existían esas cuentas y `/login` redirigía a `/setup-admin` (arranque sin
  administrador), o
- si registraba su propio administrador, el login rechazaba los correos demo.

La lógica de autenticación —hash SHA-256 con sal por usuario, comparación y
redirección por rol— estaba correcta. El fallo era de **disponibilidad de los
datos de prueba**, no de validación de credenciales.

#### Decisión tomada

No sembrar usuarios en el flujo real, para preservar el requisito de registro
único del administrador. En su lugar se agregó un atajo **exclusivo de
desarrollo**: un botón que instala las tres cuentas demo en el navegador de quien
evalúa la interfaz. Se oculta en producción con `import.meta.env.DEV`.

| Archivo | Cambio y propósito |
|---|---|
| `src/features/auth/api/authApi.ts` | `cargarCuentasDemo()`: crea las tres cuentas con hash+sal, reemplaza el store de identidad y deja `sesion: null`. Falla fuera de `DEV`. |
| `src/features/auth/components/DemoAccountsButton.tsx` | Panel de desarrollo con confirmación, toast, recarga y creación condicional (`return null` en producción). |
| `src/features/auth/components/AuthLayout.tsx` | Integra el botón al pie de `/login` y `/setup-admin`. |
| `src/vite-env.d.ts` | Habilita los tipos de `import.meta.env` usados por el atajo. |
| `README.md` / `docs/ANALISIS-FRONTEND.md` | Documentación del comportamiento, registro y análisis para herederos. |

#### Reproducción controlada

1. `npm run dev` y abrir `http://localhost:5173`.
2. En `/login` o `/setup-admin`, pulsar **Cargar cuentas demo · solo desarrollo**
   y aceptar la confirmación (aviso de que se reemplazan las cuentas del navegador).
3. La página se recarga; entrar con cualquiera de las credenciales de la tabla
   anterior y comprobar el destino según el rol.
4. Para reiniciar, borrar `markenny.print-mis.auth.v1` y
   `markenny.print-mis.db.v1`, o repetir el paso 2.

#### Resultado de la validación

| Cuenta | Sesión iniciada | Redirección |
|---|---|---|
| `admin@markenny.com` | Kenny Hernández · ADMIN | `/admin` |
| `valeria@markenny.com` | Valeria Rondón · VENDEDOR | `/ventas/dashboard` |
| `luis@markenny.com` | Luis Pérez · PRODUCCION | `/produccion` |

Se comprobó además el cierre de sesión desde el menú de la cuenta, que las tres
cuentas quedaron activas con hash de 64 caracteres y `sesion: null` tras la carga,
y que `npm run typecheck` y `npm run build` terminan sin errores. Los servidores y
la pestaña de pruebas se cerraron al finalizar.

#### Impacto en requisitos

| Requisito | Estado tras el cambio |
|---|---|
| Registro único del administrador | Intacto: el botón es un atajo de desarrollo y no crea un segundo administrador desde la UI real. |
| Tres roles y dashboards por rol | Confirmado con las tres redirecciones. |
| Evaluación de interfaces por el usuario | Desbloqueada: el atajo funciona en el navegador del evaluador. |
| Seguridad | Sin cambios en producción: el botón no se compila y el mock sigue siendo solo de desarrollo. |

#### Riesgos, mitigaciones y rollback

| Riesgo | Mitigación |
|---|---|
| Cualquier visitante pudiera instalar cuentas | `import.meta.env.DEV` impide que el componente exista en `npm run build` / `npm run preview`. |
| Reemplazo accidental de cuentas propias | Confirmación explícita antes de sobreescribir el `localStorage`. |
| Contraseñas demo visibles en código | Aceptable solo en desarrollo; el backend deberá gestionar credenciales reales. |

Para revertir: eliminar el botón y `cargarCuentasDemo()`, revertir `b7a0758` y
borrar ambas claves del `localStorage`. El sistema vuelve al flujo puro
`/setup-admin` sin datos sembrados.

### Auditoría y limpieza del frontend (2026-11-20)

Revisión completa antes de integrar con el backend Fastify. La lógica visual no
cambió; se corrigieron bugs y se limpió código. El detalle (hallazgos, causa,
corrección y verificación) está en
[`docs/AUDITORIA-FRONTEND-2026-11.md`](docs/AUDITORIA-FRONTEND-2026-11.md).

Cambios que afectan al contrato con el backend:

- La cuarta fase se llama **`EMPAQUETADO`** (antes `EMPACADO`), igual que en el
  backend. Los datos ya guardados en el navegador se migran solos al leerlos.
- `fechaEntrega` se envía como ISO 8601 al mediodía local del día elegido.
- Los acabados se envían siempre con su nombre legible.
- Crear una orden y cambiar de fase exigen un actor con rol autorizado.

### Documentación de traspaso

El análisis técnico completo (decisiones, patrones, verificación, pendientes,
mapa de arquitectura para evaluación y registro detallado de esta incidencia)
está en [`docs/ANALISIS-FRONTEND.md`](docs/ANALISIS-FRONTEND.md), secciones 15 y 16.


## Contrato de la API (fusionado desde la rama `API`)

Esta rama contiene el contrato con el que se conectan el frontend (rama
`Frontend`) y el backend (rama `Backend`):

- `packages/contrato`: reglas compartidas, esquemas Zod y tabla de endpoints.
- `packages/cliente-http`: cliente HTTP tipado para el frontend.
- `docs/api/openapi.json`: especificación OpenAPI generada desde el contrato.

Detalle, reglas de negocio acordadas y cambios pendientes en
[`docs/api/README.md`](docs/api/README.md).


## Registro de reparaciones — 24/11/2026

Antes de tocar archivos se revisaron las tres ramas (`Frontend`, `Backend`,
`API`) y la rama `main`. El diagnóstico se ordenó en tres ejes; debajo de cada
hallazgo está lo que se corrigió y dónde.

### 1. Lógica de negocio

| Hallazgo | Corrección | Rama |
|---|---|---|
| Una orden FINALIZADO no podía volver a EN_PROCESO; solo había retrabajo desde EN_REVISION. | `TRANSICIONES.FINALIZADO = ['EMPAQUETADO', 'EN_PROCESO']`. `esRetrabajo()` y `requiereMotivo()` en el contrato: todo regreso a EN_PROCESO exige motivo (mín. 3 caracteres) y queda en `produccion_etapas_auditoria`. Al volver, `fechaFinalizado` se borra. | API, Backend |
| Autorización de cambio de fase solo en el frontend. | `ROLES_CAMBIO_FASE = ['PRODUCCION', 'ADMIN']` en el contrato; el endpoint `POST /ordenes/:id/transiciones` lo aplica en el servidor. Un VENDEDOR recibe **403** (probado por HTTP y desde el navegador). | API, Backend |
| El vendedor no tenía forma de pedir correcciones. | Nuevo `POST /ordenes/:id/notas` (todos los roles; el vendedor solo en sus órdenes, si no 404). Una nota puede marcar `solicitaRetrabajo`. Tabla `ordenes_notas` de solo inserción. Notificación a Producción y Administración. | API, Backend, Frontend |
| El inventario mezclaba maquinaria y consumibles ajenos (tintas, planchas CTP, "almacén"). | Solo materias primas: `PAPEL` (con tipo: Químico, Bond, Glasse, Bristol, Opalina, Fotográfico), `VINIL`, `LONA`, `SELLO`. Registrar otra cosa da 400 "El inventario solo registra materias primas". La migración 002 **archiva** (no borra) los materiales antiguos porque su kardex es inmutable. | API, Backend, Frontend |
| Productos terminados genéricos. | Tipos de Markenny: pliego de stickers, talonario, block, sello personalizado, pendón, vinil para rotulación. Al empaquetar, la orden ingresa al almacén con su tipo (`productoTerminadoDe`). | API, Backend, Frontend |
| La máquina era obligatoria aunque no está en el formato físico. | `maquina` opcional (`NULL` = "Sin asignar"); fichas de papelería y pendones ya no la piden. | API, Backend, Frontend |
| Semilla demo: entrada de 0 unidades para materiales agotados hacía fallar `seed:demo`. | Los agotados (Opalina, lona mesh) se crean con stock 0 sin movimiento. | Backend |
| Kardex con orden inestable (dos filas en el mismo milisegundo). | Columna `secuencia` (identity) en las tablas de auditoría. | Backend |

### 2. Interfaz

| Hallazgo | Corrección |
|---|---|
| La OT de papelería no coincidía con el formato impreso. | Ficha reescrita con los campos exactos: encabezado `MARKENNY, C.A.` RIF `J-50106023-1`, cliente con RIF y teléfono, nombre del documento, vendedor, fecha de aprobación, fecha finalizado, cantidad, tipo de trabajo `NE.` / `RM.` / `F.` / `Otro:`, `Talonario` / `Block`, `DOBLE CARA`, partes 1–4 / Otros, numeración `N°` con prefijo `00-`, perforación Sí/No + Horizontal/Vertical, engomado Arriba/Abajo/Der./Izq., laminado Brillante/Mate, color de tinta Pantone/Negro/Azul/Verde/Rojo/A Color/Otro, papel Químico/Bond/Glasse/Bristol/Opalina/Fotográfico/Otro con gramaje, tamaño 1/4 Carta, 1/2 Carta, Carta, Otro, observaciones, fecha de entrega y "Recibí conforme" en la vista previa. |
| Casillas preseleccionadas (numerado, engrapado, perforado; ojales, refuerzo) y máquina fija. | El formato arranca en blanco. Las casillas son botones accesibles (`role="radio"` / `role="checkbox"`, `aria-checked`) controlados por el formulario; las opcionales se pueden desmarcar. Componente `src/components/forms/OptionGroup.tsx`. |
| Pendones y stickers ofrecían 8 acabados. | Solo `Laminado mate`, `Laminado brillante`, `Corte con plotter` (también validado en el contrato). |
| Los papeles y sustratos salían de un catálogo fijo. | Hook `useDisponibilidad` (`GET /inventario/disponibilidad`, sin costos): los papeles, viniles y lonas sin existencia aparecen deshabilitados. |
| Clientes → "Crear OT" abría papelería, que ignoraba `?cliente=`. | Hook `useClientePreseleccionado` en las tres fichas (solo acepta ids que existen en la cartera), las pestañas conservan `?cliente=` y el selector `ClienteSelect` permite quitar o cambiar el cliente. |
| Kanban: no había forma de devolver una orden. | En la ficha de planta: botón "Devolver a En Proceso" (EN_REVISION o FINALIZADO), deshabilitado hasta escribir el motivo. Arrastrar hacia atrás sin motivo se rechaza con aviso. Lista de observaciones con las solicitudes de revisión resaltadas. |
| Seguimiento del vendedor sin canal hacia planta. | Tarjeta "Observaciones": registrar nota y, en revisión o finalizado, "Solicitar revisión (retrabajo)". El vendedor nunca cambia la fase. |
| RIF y razón social incorrectos (`J-40.512.336-7`, "Artes Gráficas Markenny"). | `EMPRESA` en el contrato (`MARKENNY, C.A.`, `J-50106023-1`) es la única fuente. |

Paleta Rojo/Negro/Blanco y arquitectura por features sin cambios; sin `console.log`.

### 3. Seguridad

- **SQL**: todas las consultas usan parámetros `$n` (revisado módulo por módulo).
- **Validación**: Zod en los bordes; el contrato valida entrada y respuesta de cada endpoint.
- **XSS**: React escapa el texto; no hay `dangerouslySetInnerHTML`. La API responde con CSP `default-src 'none'`.
- **CSRF**: cookie de sesión `httpOnly` + `SameSite=Lax`, y las peticiones que cambian datos con `Origin` ajeno (o `Sec-Fetch-Site: cross-site`) reciben **403 `ORIGEN_NO_PERMITIDO`**. Orígenes extra en `ORIGENES_PERMITIDOS`.
- **Escalada de privilegios**: roles por endpoint en el contrato y en el servidor; el frontend solo oculta. Vendedor → solo sus órdenes.
- **Cabeceras**: `@fastify/helmet` (CSP, `X-Content-Type-Options`, `frame-ancestors 'none'`, CORP same-origin, HSTS en producción).
- **Fuerza bruta**: `@fastify/rate-limit` global (`LIMITE_PETICIONES_MINUTO`, 600 por defecto) y estricto en login (10/15 min), setup-admin (5/15 min) y cambio de contraseña (10/15 min) → **429 `DEMASIADOS_INTENTOS`** con `retry-after`.
- **Errores**: 404/500 con el formato del contrato, sin rutas ni trazas; el log oculta cookies, `authorization` y contraseñas. `TRUST_PROXY` en `false` por defecto (evita falsear IP/host con `X-Forwarded-*`).

#### Las 9 vulnerabilidades de `npm audit` (frontend: 5 moderadas, 2 altas, 2 críticas)

| # | Paquete | Severidad | Ruta | Avisos | Uso | Corrección aplicada |
|---|---|---|---|---|---|---|
| 1 | `vitest` ≤4.1.10 | crítica | directa (dev) | GHSA-5xrq-8626-4rwp (lectura/ejecución de archivos con la UI de Vitest), GHSA-82fw-gwwq-j7x9 | Desarrollo | `vitest@^5.1.1` |
| 2 | `tinypool` ≤2.1.1 | crítica | `vitest > tinypool` | GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr (prototype pollution → RCE) | Desarrollo | sale con vitest 5 |
| 3 | `vite` ≤6.4.3 | alta | directa (dev) | GHSA-587h-7wmj-h5pm (alta), GHSA-4w7w-66w2-5vf9, GHSA-v6wh-96g9-6wx3, GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-rq7h-c2jc-7f22, GHSA-fx2h-pf6j-xcff, GHSA-9jrq-w75r-8gcw | Desarrollo (servidor dev) | `vite@^8.3.8` + `@vitejs/plugin-react@^6.3.0` |
| 4 | `zod` <4.6.6 | alta | directa | GHSA-mrhx-c7xc-m3w5 (agotamiento de memoria con colecciones grandes) | **Producción** (se empaqueta en el navegador y valida en el backend) | `zod@4.6.7` + `@hookform/resolvers@5.9.2` |
| 5 | `esbuild` ≤0.24.2 | moderada | `vite > esbuild` | GHSA-67mh-4wv8-2f99 (cualquier web puede leer el servidor de desarrollo) — es el *warning* de esbuild | Desarrollo | sale con Vite 8 (Rolldown) |
| 6 | `react-router` 6.0.0–7.17.0 | moderada | `react-router-dom > react-router` | GHSA-wrjc-x8rr-h8h6 (open redirect con `\`), GHSA-337j-9hxr-rhxg (solo SSR) | **Producción** | `react-router-dom@7.18.6` |
| 7 | `react-router-dom` 6.0.0-alpha.0–7.17.0 | moderada | directa | hereda las de `react-router` | **Producción** | `7.18.6` |
| 8 | `@vitest/mocker` ≤4.1.11 | moderada | `vitest > @vitest/mocker` | GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8 | Desarrollo | sale con vitest 5 |
| 9 | `vite-node` ≤2.2.0-beta.2 | moderada | `vitest > vite-node` | hereda las de `vite` | Desarrollo | sale con vitest 5 |

El backend tenía otras 9 (3 moderadas, 4 altas, 2 críticas): las mismas de
`vitest`/`tinypool`/`vite`/`esbuild`/`@vitest/mocker`/`vite-node`/`zod` y, en
producción, `fastify` ≤5.12.4 (GHSA-p68q-wchp-6fh7 omisión de autenticación por
URL malformada, GHSA-667r-xxjv-c9mm, GHSA-hwr6-493r-vm6h, GHSA-9q9j-q6p8-xq58,
GHSA-jx2c-rxcm-jvmq, GHSA-444r-cwp2-x5xf, GHSA-w2qp-rph6-63g4,
GHSA-4mh8-r7rc-xpvc, GHSA-mrq3-vjjr-p77c) y `find-my-way` ≤9.6.0
(GHSA-c96f-x56v-gq3h). Se actualizó a `fastify@5.12.8`, `@fastify/cookie@11`,
`@fastify/helmet@13`, `@fastify/rate-limit@11`, `fastify-plugin@5`.

**Cómo se remedió (sin `npm audit fix --force`)**: un paquete por vez, leyendo
el registro de cambios, corriendo typecheck, pruebas y build tras cada salto, y
regenerando el `package-lock.json`. Resultado: `npm audit` → **0
vulnerabilidades** en frontend y backend.

Riesgos de cada cambio y cómo se cubrieron:

- **Vite 8 / plugin-react 6**: exige Node `^20.19` o `>=22.12`. `manualChunks` pasó a función (Rolldown). Build verificado.
- **Vitest 5**: misma API de pruebas; 23 pruebas del frontend y 100 del backend en verde.
- **Zod 4**: `invalid_type_error`/`errorMap` → `{ error }`; `.extend()` sobre esquemas refinados → `.safeExtend()`. Los mensajes propios se mantienen en español.
- **React Router 7**: sin la prop `future` en `<BrowserRouter>`; rutas sin cambios.
- **Fastify 5**: plugins actualizados a sus versiones 5; probado con la batería HTTP completa.

### Base de datos (migración `002_retrabajo_notas_inventario.sql`)

Se aplica sobre datos existentes sin borrar auditoría: columnas `subtipo` y
`archivado` en `materiales`, conversión de categorías antiguas, `maquina`
opcional, `producto_terminado` en órdenes, `tipoPapeleria` → `tipoDocumento`
en las fichas, tabla `ordenes_notas` inmutable, nuevos tipos en almacén y
`secuencia` en las tablas de auditoría.

```bash
npm run migrate
```

### Variables de entorno nuevas (backend)

| Variable | Por defecto | Uso |
|---|---|---|
| `ORIGENES_PERMITIDOS` | vacío | Orígenes (separados por coma) que pueden hacer POST/PUT/DELETE además del propio host. |
| `TRUST_PROXY` | `false` | Ponerlo en `true` solo detrás de un proxy propio. |
| `LIMITE_PETICIONES_MINUTO` | `600` | Límite global por IP. |

### Verificación

- Contrato: 23 pruebas. Cliente HTTP: 9. Backend: 100 pruebas (memoria + PostgreSQL real). Frontend: typecheck, 23 pruebas y build.
- Navegador (Playwright contra backend + PostgreSQL con `seed:demo`): Crear OT desde Clientes precarga el cliente y se puede quitar; las pestañas conservan el cliente; el formato arranca sin casillas marcadas; Opalina y lona mesh (stock 0) aparecen deshabilitadas; se creó una OT de papelería y el seguimiento muestra los campos del formato; el vendedor registró una observación y recibió 403 al intentar cambiar la fase; pendones muestra solo los 3 acabados; Producción devolvió una orden FINALIZADO a EN_PROCESO con motivo; el inventario muestra solo Papeles, Viniles, Lonas y Sellos.

### Pendiente (requiere decisión del dueño del repositorio)

- La rama `main` tiene `node_modules/` versionado (commit `866d525`). Conviene quitarlo con `git rm -r --cached node_modules` y un `.gitignore`; no se tocó porque `main` no es una rama de trabajo de esta sesión.

## OT de papelería según el formato impreso — 24/11/2026 (segunda revisión)

Se comparó la ficha con la foto del formato impreso de MARKENNY, C.A. Lo que ya
coincidía se mantuvo (cliente y teléfono, vendedor, nombre del documento,
fechas de aprobación y finalizado, cantidad, NE./RM./F./Otro, Talonario/Block,
doble cara, laminado, tipos de papel, gramaje opcional, partes, observaciones y
fecha de entrega). Se corrigió:

| Antes | Ahora |
|---|---|
| Sin "Tarjetas de presentación". | Nuevo tipo de trabajo. No lleva talonario/block, partes, numeración ni engomado; ingresa al almacén como `TARJETAS_PRESENTACION`. |
| Horizontal/Vertical dependía de la perforación. | "Vista del trabajo" (`orientacion`) obligatoria e independiente; perforación es solo Sí/No. |
| Engomado disponible siempre. | Solo aparece con **Block**; se limpia al cambiar a Talonario. El contrato rechaza engomado fuera de blocks. |
| "Pantone" era una opción con referencia. | "Pantone" es el título de la columna: Negro, Azul, Verde, Rojo, A color, Otro (con nombre). |
| Tamaños sin tabloide. | 1/4 Cuarto de carta, 1/2 Media carta, Carta, **Tabloide**, Otro. |
| Una sola numeración. | **N° del encabezado** y **N° de control del pie de página** (prefijo `00-`), cada uno con su rango validado. |

Contrato: `TIPOS_DOCUMENTO` + `TARJETAS`, `TAMANOS_PAPELERIA` + `TABLOIDE`,
`COLORES_TINTA` sin `PANTONE`, `ORIENTACIONES`, campos `orientacion` y
`numeroControlPrefijo/Desde/Hasta`, `EMPRESA` con domicilio fiscal, correo,
teléfono e Instagram del formato.

Base de datos — migración `003_formato_impreso_papeleria.sql` (ejecutar
`npm run migrate`): convierte las órdenes existentes sin perder datos
(`perforacionOrientacion` → `orientacion`; color Pantone → "Otro: Pantone
<referencia>"; engomado en talonarios → se anota en las observaciones de la
orden) y agrega `TARJETAS_PRESENTACION` a los productos terminados. Probada
sobre órdenes guardadas en el formato anterior.

### Defectos de estilo corregidos (sin cambiar la estética)

- Las páginas con columna lateral (nueva orden, pendones, trabajo general,
  cotizador, seguimiento, panel de ventas) desbordaban **175 px** en móvil: la
  cuadrícula no tenía columna base y crecía con el contenido. Ahora `grid-cols-1`
  y `minmax(0, …)` en escritorio. Verificado: desborde 0 en las 13 rutas, en los
  tres roles, a 390 px.
- `OptionGroup`: la `<legend>` no era el primer hijo del `<fieldset>` (el grupo
  quedaba sin nombre accesible) y el `fieldset` no tenía `min-w-0`.
- Los campos de rango de 3 columnas pasaban a 2 en tablet porque `FormGrid`
  impone `sm:grid-cols-2`.
- "Horizontal" se partía a mitad de palabra; "Otros" se cortaba en Partes.
- Logo: ternarios con ramas idénticas y colores hex fijos → clases de la paleta
  (`fill-white`, `fill-markenny-red`).
- Notas de la orden: clases condicionales sin `cn` y `accent-[hsl(...)]` →
  `cn(...)` y `accent-primary`.
- Se verificó que todas las clases usadas existan en el CSS generado.

Verificación: contrato 26 pruebas, cliente HTTP 9, backend 100 (con
PostgreSQL), frontend 26 + typecheck + build, y recorrido en navegador contra
el backend real.

## Pendones, stickers y viniles · Producto Terminado — 24/11/2026 (tercera revisión)

### Formulario de pendones, stickers y viniles

- **Casillas que "no marcaban"**: el tipo de pieza sí se rellenaba, pero
  sustrato y acabados usaban `ToggleCard`, cuyo estado activo era un fondo
  rojo al 4,5 % y un punto de 6 px: casi invisible. Ahora toda la ficha usa
  `OptionGroup` (el mismo de papelería): borde y fondo rojo Markenny, check
  visible, `aria-checked` y se desmarca con otro clic. `ToggleCard` (ficha
  general y cotizador) también ganó borde sólido y check.
- **Ficha en blanco**: antes venía con "Pendón", metros y 1 × 2 preseleccionados.
  Ahora tipo, unidad, medidas, sustrato y acabado se eligen a mano (Zod los exige).
- **Sustratos del almacén**: solo viniles y lonas con existencia > 0
  (`GET /inventario/disponibilidad`). Lo agotado o inexistente no se muestra.
  Si el sustrato se agota mientras se llena la ficha, la orden no se envía
  (`SustratoNoDisponibleError`).
- **Único acabado: Corte con plotter.** El mate o brillante viene en el
  material (vinil mate, vinil adhesivo blanco brillante...). El contrato
  rechaza "Laminado mate/brillante" en órdenes nuevas de gran formato; las
  órdenes anteriores conservan su texto.
- Título y pestañas: "Pendones, stickers y viniles".

### Producto Terminado

- Sidebar: "Sellos y PT" → **"Producto Terminado"** (ícono de paquete). Ruta
  nueva `/inventario/producto-terminado`; la antigua `/inventario/sellos`
  redirige. Se corrigió que "Inventario" y la subpágina aparecieran activos a
  la vez en el menú.
- **Filtro estricto en el backend**: Inventario consulta a Producción la fase
  real de cada orden (`fasesDeOrdenes`, mismo patrón que `resumenOrdenes`
  entre Ventas y Producción) y solo devuelve órdenes en `EMPAQUETADO` sin
  entregar. Quedan fuera `EN_PROCESO`, `EN_REVISION`, `FINALIZADO`, lo
  entregado y cualquier registro sin orden. Dos pruebas nuevas lo cubren.
- La página ya no mezcla sellos vírgenes (materia prima, siguen en Inventario).
- Semilla demo con los viniles del almacén: blanco brillante, holográfico,
  clear, microperforado y mate (este último en 0 para probar el filtro).

### Observación pendiente

El backend ya sabe descontar materias primas al crear una orden (evento
`ORDEN_CREADA` con `materiales`), pero el contrato HTTP de `NuevaOrden` no
acepta ese campo, así que hoy ninguna orden descuenta inventario
automáticamente. Conectarlo (enviar el id del sustrato y la cantidad
calculada) es el siguiente paso para que el stock baje solo.

Verificación: contrato 26, cliente HTTP 9, backend 102 (con PostgreSQL),
frontend 27 + typecheck + build; navegador contra el backend real (casillas en
rojo con check, sustratos con existencia, corte con plotter, OT creada,
Producto Terminado con solo las órdenes empaquetadas, salida al entregar,
sin desborde en móvil).
