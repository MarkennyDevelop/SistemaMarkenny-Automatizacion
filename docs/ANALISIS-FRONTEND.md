# Análisis del frontend — Print MIS Markenny (rama `Frontend`)

Documento de traspaso técnico. Resume qué se construyó, por qué, qué falta y qué
conviene revisar. Pensado para que otra persona (o Claude Code) continúe el trabajo
sin tener que reconstruir el contexto.

Para una evaluación rápida de la arquitectura, leer la **sección 15** (mapa de
features, reglas de dependencia, puntos de extensión y checklist de lectura).
Para el registro formal de la incidencia de acceso y su corrección, ir a la
**sección 16**.

---

## 1. Resumen ejecutivo

Se implementó el frontend completo del Print MIS sobre React 18 + TypeScript 5 +
Vite 5 + Tailwind 3 + shadcn/ui (Radix), con arquitectura *feature-based* y
patrones Compound Components + Container/Presentational.

Estado actual (fase 2):

- Compila: `npm run typecheck` limpio, `npm run build` correcto (sin warnings de
  tamaño de chunk tras el split manual).
- Funciona de punta a punta contra una **API mock persistente en `localStorage`**,
  con autenticación, permisos por rol y auditoría de fases.
- Flujo validado manualmente en navegador:
  - primer arranque sin administrador redirige a `/setup-admin`; la pantalla de
    instalación queda bloqueada al crear la cuenta maestra;
  - alta de empleados Vendedor (`valeria@markenny.com`) y Producción
    (`luis@markenny.com`) desde `/admin/empleados`;
  - login por rol con redirección a `/admin`, `/ventas/dashboard` y `/produccion`;
  - creación de `OT-2026-0185` (papelería) y `OT-2026-0186` (gran formato);
  - avance secuencial `EN_PROCESO → EN_REVISION → FINALIZADO → EMPAQUETADO` con nota,
    historial auditado y notificación al vendedor;
  - bloqueo del salto de fase por drag & drop (la orden no cambia);
  - despacho de 100 unidades de `inv-sellos-dukes` (stock 1.200 → 1.100) con
    movimiento `SALIDA` auditado con usuario y motivo.
- Consola sin errores ni warnings.

## 2. Stack y decisiones de alto nivel

| Decisión | Motivo |
|---|---|
| App Vite en la **raíz** del repo (no `apps/frontend`) | El requisito pedía literalmente `src/features/*`; mover la app a `apps/frontend` habría roto esa estructura. |
| **Mock API en `localStorage`** (`markenny.print-mis.db.v1`) | Permite demos y validación funcional antes del backend Fastify, con latencia simulada y datos semilla. |
| Capa `api/` por feature | Aísla el origen de datos: migrar a Fastify solo requiere reescribir `*Api.ts`. |
| **TanStack Query** con `queryKeys` centralizadas | Caché compartida entre dashboard, listado y Kanban; invalidación cruzada tras mutaciones. |
| Mutaciones **optimistas** en Kanban | El drag & drop se siente instantáneo; rollback si la mutación falla. |
| **Strategy** para cotización (`offset`, `digital`, `gran formato`) | Reglas de precio distintas por tecnología; añadir una nueva = añadir una estrategia. |
| Logo **SVG propio** (`MarkennyLogo`) | Sin dependencias de binarios externos; escala y respeta la paleta. |
| Tipografías locales con `@fontsource` | Sin peticiones a Google Fonts (entorno de planta/offline). |
| Tokens CSS + Tailwind | Permite modo claro/oscuro y mantiene la paleta rojo/negro/blanco estricta. |

## 3. Estructura y responsabilidades

```
src/
├─ app/                  providers (QueryClient, ThemeProvider, Toaster), ErrorBoundary, NotFound
├─ components/
│  ├─ brand/             MarkennyLogo
│  ├─ forms/             FormField, FormGrid (label + hint + error accesibles)
│  ├─ layout/            AppShell, Sidebar, Topbar, PageHeader
│  ├─ theme/             ThemeProvider, ThemeToggle
│  └─ ui/                primitivas shadcn/Radix
├─ features/
│  ├─ auth/              login, setup del admin, empleados y guardas
│  ├─ notificaciones/    campana y hooks de lectura
│  ├─ dashboard/         components · hooks
│  ├─ planta-kanban/     Kanban, control de calidad y detalle de OT
│  ├─ inventario/        Existencias, movimientos, sellos y producto terminado
│  └─ ventas/            components · hooks · api · lib · types
├─ lib/utils.ts          cn, formatCurrency, formatDate, formatNumber, initials
└─ shared/               domain.ts, catalogos.ts, fase-ui.ts, mock/db.ts, api/queryKeys.ts
```

Reglas de dependencia:

1. `shared/` no importa de `features/`.
2. Una feature nunca importa rutas internas de otra: solo su `index.ts`.
3. `components/` visuales no llaman a la API; reciben props y callbacks.
4. `hooks/` es la única capa que habla con `api/`.
5. `lib/` contiene lógica pura (testeable sin React).

## 4. Modelo de dominio (frontend)

`src/shared/domain.ts` define las entidades que el backend deberá respetar:

- `Rol` = `ADMIN | VENDEDOR | PRODUCCION` y el usuario de sesión
  (`UsuarioPublico`, sin hash ni sal).
- `CategoriaTrabajo` = `PAPELERIA | GRAN_FORMATO | GENERAL`, con especificaciones
  propias: partes, numeración, papel/gramaje, Pantone y acabados para papelería;
  ancho/alto + unidad `m|cm`, sustrato y resolución para gran formato.
- `Cliente`
- `OrdenTrabajo` (código, cliente, producto, cantidad, fase, prioridad, avance,
  máquina, operador, fechas, monto, categoría de trabajo, historial y vendedor)
- `FaseProduccion` = `EN_PROCESO | EN_REVISION | FINALIZADO | EMPAQUETADO`
  (exactamente 4, como se pidió)
- `EventoOrden` (fase, fase anterior, usuario, rol, fecha y nota) → trazabilidad
  inmutable de cada avance de QC.
- `Notificacion` (tipo, título, detalle, roles destinatarios, `leidaPor` y fecha)
  → aviso visual al vendedor cuando el pedido está listo para entrega.
- `MaterialInventario` (SKU, categoría, stock, stock mínimo, ubicación, proveedor,
  lote, costo unitario); categorías `PAPEL | TINTAS | PLANCHAS | VINILOS | SELLOS | ALMACEN`.
- `MovimientoInventario` (tipo `ENTRADA | SALIDA | AJUSTE | RESERVA`, cantidad,
  motivo, usuario, fecha)
- `Cotizacion` / resultados del motor

`src/shared/catalogos.ts` centraliza listas (máquinas, acabados, tipos de papel…)
para evitar strings duplicados.

`src/shared/fase-ui.ts` mapea cada fase a etiqueta, color y badge **dentro de la
paleta permitida** (rojo/negro/blanco + grises).

## 5. Patrones implementados (lo que conviene revisar con lupa)

### 5.1 Compound Components

- `features/ventas/components/papeleria/PapeleriaForm.tsx` y
  `gran-formato/GranFormatoForm.tsx` son los formularios nuevos de la fase 2;
  `orden-trabajo/OrdenTrabajoForm.tsx` y `cotizador/CotizadorForm.tsx` completan
  el conjunto. Todos exponen `Root/Section/Summary/Submit` con contexto propio.
- El estado compartido vive en `context.ts` (contexto + hook `use...Context`
  que lanza error si se usa fuera del Root).

**Por qué:** el formulario de OT y el cotizador tienen el mismo esqueleto
(secciones colapsables + resumen sticky + validación) pero contenido distinto.
Compound Components evita props drilling y permite reordenar secciones sin tocar
la lógica.

**Punto a revisar:** el `Summary` deriva montos con `watch()`; si el formulario
crece, conviene mover el cálculo a un selector memoizado o a `useWatch` por campo
para reducir re-renders.

### 5.2 Container / Presentational

- `AdminDashboardPage`, `EmpleadosPage`, `VentasDashboardPage`, `SeguimientoPage`,
  `NuevaOrdenPapeleriaPage`, `NuevaOrdenGranFormatoPage`, `ProduccionDashboardPage`,
  `SellosPage`, `OrdenesTrabajoPage`, `ClientesPage`, `InventarioPage` → contenedores.
- `OrdenesTrabajoTable`, `ClientesTable`, `InventarioTable`, `KanbanBoard`,
  `DashboardView`, `PapeleriaForm.*`, `GranFormatoForm.*` → presentacionales.

### 5.3 Motor de cotización

`features/ventas/lib/cotizador.ts`:

- `estrategias` por tipo de impresión, cada una con su cálculo de costo/tiempo.
- `estimarMontoOrden(...)` reutiliza el motor para sugerir el monto de una OT.
- Funciones puras → fáciles de cubrir con tests unitarios (pendiente).

### 5.4 Kanban

- `KanbanBoard` maneja drag & drop nativo (HTML5) y `onMove`.
- `usePlantaBoard` hace optimistic update: mueve la tarjeta, actualiza el snapshot
  y hace rollback en error; valida que el destino sea exactamente la fase siguiente.
- `usePlantaEnVivo` simula polling de 30 s para el indicador “Planta en vivo”.

### 5.5 Autenticación y permisos

- `features/auth/` aísla store (`localStorage`), API simulada, `AuthProvider`,
  guardas (`RequireAuth`, `RequireRole`, `PublicOnly`) y las páginas de login,
  instalación y empleados.
- `SetupAdminPage` solo se habilita cuando `hayAdmin === false`; al crear la
  cuenta maestra, `LoginPage` deja de redirigir y el registro queda inaccesible.
- `homeForRol` lleva a `ADMIN → /admin`, `VENDEDOR → /ventas/dashboard` y
  `PRODUCCION → /produccion`. El `Sidebar` oculta los módulos ajenos al rol.
- Las contraseñas se guardan como SHA-256 con sal por usuario. **Es un mock**:
  al integrar Fastify, sustituir `authStore.ts` por sesiones/cookies del backend.

### 5.6 Control de calidad secuencial

- `actualizarFaseOrden(ordenId, faseDestino, actor, nota)` es la autoridad final:
  rechaza saltos y retrocesos y exige actor con rol `PRODUCCION` o `ADMIN`.
- Cada avance agrega un `EventoOrden` con usuario, rol, fecha y nota, visible en
  el stepper de seguimiento del vendedor y en el detalle de la orden en planta.
- `FINALIZADO` y `EMPAQUETADO` generan una `Notificacion` para `VENDEDOR` y `ADMIN`,
  mostrada por `NotificacionesBell` en el `Topbar`.

## 6. Sistema de diseño

- Paleta en `tailwind.config.ts` + variables HSL en `src/index.css`:
  `--primary` rojo Markenny, `--markenny-ink` negro, superficies blancas/gris claro.
- Modo oscuro con la misma paleta (rojo sobre negro).
- Componentes base con radios, sombras y tipografía condensada para títulos
  (`Barlow Condensed`) e Inter para UI.
- `Progress`, `Badge`, `Tabs`, `Table`, `Dialog`, `Select`, `Collapsible`,
  `DropdownMenu`, `Tooltip` adaptados a los tokens.

## 7. Rutas

| Ruta | Componente contenedor | Acceso |
|---|---|---|
| `/login` | `LoginPage` | Público (sin sesión) |
| `/setup-admin` | `SetupAdminPage` | Público, solo primer arranque |
| `/` | `RoleHome` → inicio del rol | Autenticado |
| `/admin` | `DashboardPage` | ADMIN |
| `/admin/empleados` | `EmpleadosPage` | ADMIN |
| `/ventas` → redirige a `/ventas/dashboard` | — | ADMIN, VENDEDOR |
| `/ventas/dashboard` | `VentasDashboardPage` | ADMIN, VENDEDOR |
| `/ventas/ordenes` | `OrdenesTrabajoPage` | ADMIN, VENDEDOR |
| `/ventas/nueva-orden` | `NuevaOrdenPapeleriaPage` | ADMIN, VENDEDOR |
| `/ventas/nueva-orden/pendones` | `NuevaOrdenGranFormatoPage` | ADMIN, VENDEDOR |
| `/ventas/nueva-orden/otros` | `NuevaOrdenTrabajoPage` | ADMIN |
| `/ventas/seguimiento` | `SeguimientoPage` | ADMIN, VENDEDOR |
| `/ventas/cotizador` | `CotizadorPage` | ADMIN, VENDEDOR |
| `/ventas/clientes` | `ClientesPage` | ADMIN, VENDEDOR |
| `/produccion` | `ProduccionDashboardPage` | ADMIN, PRODUCCION |
| `/planta` → redirige a `/produccion` | — | ADMIN, PRODUCCION |
| `/inventario` | `InventarioPage` | ADMIN, PRODUCCION |
| `/inventario/sellos` | `SellosPage` | ADMIN, PRODUCCION |
| `*` | `NotFoundPage` | Autenticado |

`BrowserRouter` con `future={{ v7_startTransition, v7_relativeSplatPath }}`.
La plantilla `PlantaKanbanPage` se eliminó en la auditoría del 2026-11-20 (no tenía ruta).

## 8. Datos mock

`src/shared/mock/db.ts`:

- Semilla: 8 clientes, 12 órdenes, 20 materiales, 8 movimientos.
- Persistencia: `localStorage['markenny.print-mis.db.v1']` (negocio) y
  `localStorage['markenny.print-mis.auth.v1']` (identidad).
- Latencia simulada (~180–500 ms) para que se vean los estados de carga.
- Funciones: `listarOrdenes`, `crearOrden`, `actualizarFaseOrden`,
  `listarMateriales`, `registrarMovimiento`, `listarClientes`, `crearCliente`,
  `dashboardResumen`, `listarNotificaciones`, `marcarNotificacionLeida`.
- `crearOrden` registra el primer `EventoOrden` y notifica a ADMIN/PRODUCCION;
  `actualizarFaseOrden` valida la secuencia, agrega el evento con actor/nota y
  notifica a VENDEDOR/ADMIN al finalizar o empaquetar.
- Migración automática: al leer un `db.v1` antiguo se normalizan las órdenes
  (categoría, especificaciones e historial) y el inventario (categorías
  `PLANCHAS`, `VINILOS`, `SELLOS`), sin perder datos.
- Cada mutación recalcula totales derivados (stock, saldos, KPIs) para que el
  frontend se comporte como con un backend real.

**Deuda:** el mock y los tipos viven en el mismo repo que el frontend; cuando
exista el backend conviene mover `domain.ts` a un paquete compartido o generarlo
desde el esquema Zod del servidor.

## 9. Rendimiento

- Split manual en `vite.config.ts`: `react`, `query`, `forms`, `radix`, `index`.
  Resultado tras la fase 2: chunk mayor ~375 kB (gzip ~86 kB), sin warning de
  500 kB.
- Fuentes locales con subsetting de `@fontsource` (solo pesos usados).
- Tablas con scroll horizontal (`min-w`) en lugar de comprimir celdas.
- Queries con `staleTime` y `placeholderData` donde aplica.

## 10. Accesibilidad y UX

- Diálogos y selects Radix (focus trap, `Esc`, `aria-*`).
- Botones de acción de fila con `aria-label` descriptivo.
- Formularios con `label` asociado, `hint` y mensaje de error visible.
- Toasts con `sonner` para confirmar mutaciones.
- `prefers-reduced-motion` respetado por las animaciones de Tailwind.

## 11. Verificación realizada

| Prueba | Resultado |
|---|---|
| `npm run typecheck` | OK |
| `npm run build` | OK, chunks separados, sin warnings |
| Primer arranque → `/setup-admin` | OK; tras crear admin queda bloqueado |
| Alta de empleados Vendedor/Producción | OK; 3 usuarios activos en la demo |
| Login por rol y redirección | OK (`/admin`, `/ventas/dashboard`, `/produccion`) |
| Cuentas demo en un navegador nuevo | OK; botón de desarrollo instala las 3 cuentas y las 3 validan login |
| Rutas protegidas | OK; Vendedor no entra a `/admin` ni a `/inventario`, Producción no entra a `/ventas` |
| OT de papelería (`OT-2026-0185`) | OK; datos de especificación guardados y seguimiento visible |
| OT de gran formato (`OT-2026-0186`) | OK; dimensiones en m, sustrato y resolución guardados |
| Avance secuencial con nota | OK; historial con actor/rol/fecha y notificación al vendedor |
| Salto de fase por drag & drop | Bloqueado; la orden permanece en `EN_PROCESO` |
| Despacho desde `/inventario/sellos` | OK; `SALIDA` de 100 u., stock 1.200 → 1.100, responsable = usuario de sesión |
| Consola del navegador | Sin errores ni warnings |
| Layout móvil (800 px) | Tablas con scroll horizontal correcto |
| Layout desktop ≥1280 px | **No validado visualmente** (viewport de la herramienta 800×582); revisar sidebar fijo, Kanban de 4 columnas y resumen sticky |

## 12. Pendientes / deuda técnica priorizada

1. **Tests**: existe una suite Vitest (`npm test`) para fechas, fichas de OT,
   cotizador y reglas del mock. Falta un smoke test de rutas con Testing Library.
2. **Sustituir los mocks por Fastify**: implementar `fetch` en `*Api.ts` (incluido
   `authApi.ts`) y tipar respuestas con Zod; mantener `queryKeys`.
3. **Autenticación real**: el login actual es solo un mock local con SHA-256;
   al integrar el backend, usar sesiones/cookies httpOnly, recuperación de
   contraseña y bloqueo por intentos fallidos.
4. **Formularios**: persistir borradores, confirmación al salir con cambios, y
   adjuntar archivos (arte final) en la OT.
5. **Kanban**: soporte táctil real (pointer events) y accesibilidad por teclado
   para mover tarjetas; hoy usa drag & drop HTML5 (los botones de avance cubren
   el flujo accesible).
6. **Cotizador**: exportar PDF de la cotización y convertir cotización → OT.
7. **Inventario**: reservas vinculadas a OT, kardex por material, alertas de
   reposición con generación de orden de compra y despacho multi-material.
8. **Dashboard**: series temporales reales (hoy son KPIs derivados del mock).
9. **i18n / formato**: fechas y moneda están en `es-VE`/USD; centralizar si se
   agregan otras monedas.
10. **PWA/offline**: útil en planta; evaluar `vite-plugin-pwa`.
11. **Validación visual desktop**: revisar en un viewport ≥1280 px.
12. **CI**: workflow de `typecheck` + `build` en cada PR.

## 13. Notas de integración con el backend

Contrato sugerido (alineado con lo que ya consume el frontend):

```
GET    /api/auth/sesion
POST   /api/auth/login              { email, password }
POST   /api/auth/setup-admin        { nombre, email, telefono, cargo, password }  # solo_once
POST   /api/auth/logout
GET    /api/auth/usuarios           # solo ADMIN
POST   /api/auth/usuarios           # solo ADMIN; rol VENDEDOR | PRODUCCION
PATCH  /api/auth/usuarios/:id/estado
GET    /api/ordenes?fase=&q=
POST   /api/ordenes
PATCH  /api/ordenes/:id/fase        { fase, nota, actor }  # secuencial y auditado
GET    /api/clientes
POST   /api/clientes
GET    /api/inventario?categoria=&q=
POST   /api/inventario/movimientos  { materialId, tipo, cantidad, motivo, usuario }
GET    /api/notificaciones
PATCH  /api/notificaciones/:id/leida
GET    /api/dashboard
```

Reglas que el frontend asume:

- `POST /api/auth/setup-admin` debe fallar con `409` si ya existe administrador;
  la UI bloquea la ruta, pero el backend es la autoridad final.
- `OrdenTrabajo.codigo` lo genera el backend con formato `OT-AAAA-NNNN`.
- `fase` solo acepta los 4 valores definidos y el cambio debe ser de **una sola
  posición hacia adelante**; el backend devuelve `409` ante saltos o retrocesos.
- Cada cambio de fase crea un `EventoOrden` inmutable con usuario, rol, fecha y
  nota. `FINALIZADO`/`EMPAQUETADO` crean notificaciones para VENDEDOR y ADMIN.
- Los movimientos de inventario son **inmutables** (auditoría); el stock se
  recalcula en el servidor y el responsable es el usuario de la sesión.
- Fechas en ISO 8601; el frontend formatea a `es-VE`.
- Errores con `{ message, code }` para mostrarlos en toasts.

## 14. Cómo levantar el proyecto

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + dist/
npm run preview    # http://localhost:4173
npm run typecheck
```

En Windows con PowerShell restringido usar `npm.cmd`.

Si se quiere reiniciar los datos de demo (eliminará el administrador y obligará a
pasar por `/setup-admin` de nuevo):

```js
localStorage.removeItem("markenny.print-mis.db.v1");
localStorage.removeItem("markenny.print-mis.auth.v1");
location.reload();
```

Credenciales creadas durante la validación:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@markenny.com` | `Markenny2026` |
| Vendedor | `valeria@markenny.com` | `Ventas2026` |
| Producción | `luis@markenny.com` | `Planta2026` |

Estas cuentas se guardan en el `localStorage` del navegador que las creó: no se
comparten entre perfiles, equipos ni entre el navegador de pruebas y el tuyo.
Cuando falten (p. ej. el primer arranque o un perfil nuevo), `npm run dev` muestra
en `/login` y `/setup-admin` el botón **Cargar cuentas demo · solo desarrollo**
(`DemoAccountsButton` + `authApi.cargarCuentasDemo`). Instala las tres cuentas,
reinicia la sesión y recarga; el botón no se compila en producción.

---

## 15. Mapa de arquitectura para evaluación (Claude Code / herederos)

Esta sección complementa el §3 con una vista orientada a **evaluar** el frontend:
qué se puede tocar, dónde y con qué efectos colaterales. No cambia el código; es
una guía de lectura y de decisión.

### 15.1 Mapa de features

| Feature | Entrada pública | Responsabilidad | No debe hacer |
|---|---|---|---|
| `auth/` | `index.ts` → `AuthProvider`, guardas, `authApi` | Identidad, sesión, alta de administrador y empleados, control de acceso | Conocer órdenes, clientes ni inventario |
| `ventas/` | `index.ts` → páginas y hooks | Clientes, cotizador y fichas de OT (papelería, gran formato, general) | Escribir directamente en `mock/db.ts` ni decidir fases de planta |
| `planta-kanban/` | `index.ts` → `usePlantaBoard`, tablero, detalle | Tablero de 4 fases, avance secuencial y trazabilidad de QC | Crear clientes u órdenes; solo consume y mueve OTs |
| `inventario/` | `index.ts` → páginas, hooks, `inventarioApi` | Materiales, movimientos auditados, sellos y producto terminado | Modificar fases de una OT |
| `notificaciones/` | `index.ts` → bell, hooks | Campana, listado y marcado de leídas | Generar reglas de negocio: solo presenta lo que otras features producen |
| `dashboard/` | `index.ts` → vistas y hooks | KPIs derivados del mock para ADMIN y VENDEDOR | Duplicar cálculos que ya existen en `mock/db.ts` |
| `shared/` | `domain.ts`, `catalogos.ts`, `fase-ui.ts`, `api/queryKeys.ts`, `mock/db.ts` | Tipos, catálogos, presentación de fases, claves de caché y persistencia simulada | Importar desde `features/` (regla estricta) |
| `app/` + `components/` | `providers.tsx`, `App.tsx`, `ui/`, `layout/` | Composición, providers, primitivas Radix y shell visual | Contener reglas de negocio |

### 15.2 Flujo de datos de una acción típica

El sentido de la flecha es importante: la UI **nunca** escribe en el storage.

```
Componente presentacional (props + callbacks)
        ↓ callback
Página contenedora (*Page.tsx)
        ↓ hook
useXxx (TanStack Query)  ← queryKeys centralizadas
        ↓
xxxApi (features/*/api)  ← única puerta de entrada al dato
        ↓
mockDb / authStore  → localStorage (db.v1 / auth.v1)
        ↓
invalidateQueries → re-render de dashboard, listado y tablero
```

Ejemplo concreto — avanzar una OT en planta:

`OrdenCard` → `KanbanColumn.onMove` → `usePlantaBoard.avanzarFase` →
`mockDb.actualizarFaseOrden` (valida salto de uno, exige actor PRODUCCION/ADMIN,
escribe `EventoOrden` y crea notificación si aplica) → `onSuccess` con optimistic
update y rollback → invalidación de `ordenes`, `dashboard` y `notificaciones`.

### 15.3 Reglas de dependencia y cómo verificarlas

1. `shared/` no importa de `features/`.
2. Una feature importa a otra **solo** por su `index.ts`; nunca por
   `features/otra/components/...`.
3. Los componentes visuales reciben props; no llaman a `api/` ni leen
   `localStorage`.
4. Solo `hooks/` (o el contenedor) habla con `api/`.
5. `lib/` es lógica pura: sin React, sin DOM, sin storage.
6. Las claves de caché se definen en `shared/api/queryKeys.ts`, no inline.

Verificación rápida con `grep`:

```bash
# No debe haber resultados fuera de shared/
grep -R "features/" src/shared

# Los componentes no deberían importar api directamente
grep -R "from .*api/" src/features/*/components

# Las claves de query deben estar centralizadas
grep -R "useQuery\|useMutation" src/features/*/hooks
```

### 15.4 Puntos de extensión

| Quieres añadir… | Toca | No toques |
|---|---|---|
| Una ruta nueva | `App.tsx` + página en la feature + entrada en `Sidebar.tsx` y tabla de rutas de este doc | `mock/db.ts` salvo que necesites datos nuevos |
| Un rol nuevo | `Rol` en `shared/domain.ts`, `homeForRol`, guardas, `Sidebar`, `queryKeys` si aplica | Las reglas de QC: el actor ya se valida por rol |
| Una quinta fase | `FaseProduccion`, `FASES_PLANTA`, `fase-ui.ts`, validación en `usePlantaBoard` **y** `mockDb.actualizarFaseOrden` | Los componentes de tabla: derivan columnas de `FASES_PLANTA` |
| Otra categoría de OT | `CategoriaTrabajo`, catálogos, ficha con Compound Components, motor de cotización | El listado genérico de órdenes |
| Un endpoint Fastify | Solo `features/*/api/*.ts`; mantener la firma y `queryKeys` | Páginas, hooks ni componentes |
| Un movimiento de inventario | `registrarMovimiento` en `mock/db.ts` + diálogo; el responsable se toma de la sesión | El cálculo de stock, que ya es derivado |

### 15.5 Checklist de lectura recomendada

Para una persona o agente que llegue al repo, este orden minimiza contexto:

1. `README.md` → comandos, roles y registro de auditoría.
2. `docs/ANALISIS-FRONTEND.md` §§1–4 → decisiones, estructura y dominio.
3. `src/App.tsx` → árbol de rutas y guardas aplicados.
4. `src/features/auth/components/guards.tsx` + `homeForRol` → quién ve qué.
5. `src/shared/domain.ts` + `catalogos.ts` → vocabulario del negocio.
6. `src/shared/mock/db.ts` → reglas de oro (fases, eventos, notificaciones, stock).
7. `src/shared/api/queryKeys.ts` → caché e invalidaciones.
8. Una feature vertical completa, p. ej. `planta-kanban/` (hook → api → board).
9. `src/features/ventas/components/*/context.ts` → patrón Compound Components.
10. `vite.config.ts` + `tailwind.config.ts` → build y sistema de diseño.

### 15.6 Señales de alerta al revisar cambios

- Un componente que lea `localStorage` o llame a `mockDb` directamente: rompe la
  capa `api/` y hará dolorosa la migración a Fastify.
- Un `useEffect` que sincronice dos queries manualmente: probablemente deba ser
  una invalidación en `onSuccess`.
- Cálculo de montos o stock duplicado en la UI: ya existe en `cotizador.ts` o en
  `mock/db.ts`.
- Un guarda nuevo sin actualizar `Sidebar`: el rol verá rutas prohibidas.
- Cambios en `FaseProduccion` sin tocar `mockDb.actualizarFaseOrden`: la UI
  permitiría saltos que el mock ya no sabría rechazar.
- texto o icono nuevo fuera de la paleta rojo/negro/blanco definida en tokens.

### 15.7 Deuda actual relacionada con esta área

Además del §12, conviene vigilar:

- La semilla y las reglas viven en un único `db.ts` de ~gran tamaño; al crecer,
  dividir por agregado (`ordenes`, `inventario`, `notificaciones`).
- No hay tests de las reglas de dependencia; un simple lint con `eslint-plugin-boundaries`
  las convertiría en errores de CI.
- `authStore.ts` es la pieza que sustituir por sesiones httpOnly; `authApi.ts`
  ya concentra las firmas, pero `cargarCuentasDemo()` debe eliminarse en ese
  momento junto con `DemoAccountsButton.tsx` y `vite-env.d.ts`.
- La validación visual en desktop sigue pendiente (§11); el checklist anterior
  ayuda a detectar regresiones al hacerla.

---

## 16. Registro de auditoría técnico — incidencia de acceso y corrección (2026-11-18)

### 16.1 Cronología

| Hora/Hito | Hecho |
|---|---|
| Tras `f21295b` | Fase 2 validada en el navegador de automatización con las tres cuentas creadas en su `localStorage`. |
| Reporte del usuario | "Estoy intentando ingresar con las credenciales que les diste y no me da acceso". |
| Cierre de servidores | Se detuvieron los procesos Vite/npm en el puerto 5173 antes de tocar el código. |
| Diagnóstico | Las cuentas existían solo en el perfil de pruebas; no había semilla en el código ni en el navegador del usuario. |
| Implementación | `cargarCuentasDemo()` + `DemoAccountsButton` + tipos `vite/client`; documentación actualizada. |
| Verificación | Carga de cuentas en navegador vacío y login con los tres roles; `typecheck` y `build` limpios. |
| Cierre | Commit `b7a0758`, servidores y pestaña de pruebas cerrados. |

### 16.2 Evidencia del diagnóstico

- Dos instancias de Vite escuchaban en `5173` (`::` y `127.0.0.1`) con sus árboles
  de procesos `npm run dev → cmd → node → vite`; todas se terminaron.
- En el navegador de pruebas, `localStorage['markenny.print-mis.auth.v1']`
  contenía tres usuarios activos con `passwordHash` de 64 caracteres.
- En un navegador sin esas claves, `/login` redirigía a `/setup-admin`: prueba de
  que no había cuentas sembradas en el bundle.
- Después de pulsar el nuevo botón en ese navegador vacío, el store mostró
  `admin@markenny.com`, `valeria@markenny.com` y `luis@markenny.com` con sus
  roles, `activo: true`, `sesion: null` y `creadoPor: "Cuentas demo (desarrollo)"`.

### 16.3 Cambios a nivel de código

- **`authApi.cargarCuentasDemo()`**: construye los tres `Usuario` con
  `crearSalt()` + `hashPassword()` y llama a `escribirAuth({ usuarios, sesion: null })`.
  Incluye guarda `if (!import.meta.env.DEV) throw ...` para que nunca se ejecute en
  producción. Devuelve `UsuarioPublico[]` (sin secretos).
- **`DemoAccountsButton`**: `if (!import.meta.env.DEV) return null`; usa
  `window.confirm` antes de sobreescribir, `sonner` para el aviso y
  `window.setTimeout(() => window.location.reload(), 600)` para aplicar el store.
- **`AuthLayout`**: inserta el panel después de `children` en login y setup.
- **`vite-env.d.ts`**: `/// <reference types="vite/client" />` para que TS acepte
  `import.meta.env.DEV`.

### 16.4 Validación técnica detallada

| Paso | Resultado observado |
|---|---|
| Navegador vacío → `/login` | Redirect a `/setup-admin`; botón demo visible |
| Cargar cuentas (confirmación aceptada) | 3 usuarios activos, hash de 64 caracteres, `sesion: null`, recarga a `/login` |
| Login ADMIN | `Kenny Hernández`, `ADMIN`, `location = /admin` |
| Cerrar sesión | Menú de cuenta → `Cerrar sesión` → `/login` |
| Login VENDEDOR | `Valeria Rondón`, `VENDEDOR`, `location = /ventas/dashboard` |
| Login PRODUCCION | `Luis Pérez`, `PRODUCCION`, `location = /produccion` |
| `npm run typecheck` | Sin errores |
| `npm run build` | Sin errores; atajo ausente en el bundle de producción por `import.meta.env.DEV` |

### 16.5 Alternativas consideradas y descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Sembrar admin/vendedor/producción en el código | Rompe el requisito de `/setup-admin` como registro único y deja contraseñas conocidas en producción. |
| Hardcodear un fallback en `LoginPage` | Oculta la causa real, mezcla credenciales de prueba con la lógica de negocio y no funciona en perfiles nuevos. |
| Pedir al usuario que copiara el `localStorage` manualmente | Frágil, propenso a errores y no reproducible por otra persona. |
| Dejar el botón también en `npm run preview` | Expondría las cuentas demo en un build que simula producción. |

### 16.6 Impacto, trazabilidad y estado final

- **Requisitos afectados:** acceso por rol (uno de los criterios de aceptación de
  la Fase 2). Quedó verificado para los tres roles.
- **No afectados:** register único del administrador, QC secuencial, eventos de
  auditoría, notificaciones, inventario, ni el contrato sugerido con Fastify.
- **Commits:** `f21295b` (funcionalidad de Fase 2) y `b7a0758` (este fix y su
  documentación).
- **Estado del entorno:** árbol de trabajo limpio tras el commit; servidores y
  pestaña de pruebas cerrados; `dist/` regenerado con el build final.

### 16.7 Rollback y recuperación

1. Borrar `markenny.print-mis.auth.v1` y `markenny.print-mis.db.v1` del
   `localStorage` del navegador afectado.
2. Quitar `DemoAccountsButton` de `AuthLayout`, eliminar el archivo y el método
   `cargarCuentasDemo()`, y revertir `b7a0758`.
3. El flujo vuelve a `/setup-admin` en primer arranque; no quedan cuentas
   sembradas ni secretos en el bundle.

### 16.8 Lección documentada

Un mock con persistencia local es correcto para validar reglas de negocio, pero
sus datos **no son portables entre navegadores**. Cualquier credencial creada
durante una prueba debe acompañarse de un mecanismo explícito —y de desarrollo—
para reproducirla en el entorno de quien evalúa. La corrección eligió un atajo
visible, confirmado y autocontenido, sin contaminar el flujo real de registro ni
el build de producción.
