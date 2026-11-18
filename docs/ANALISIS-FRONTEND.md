# Análisis del frontend — Print MIS Markenny (rama `Frontend`)

Documento de traspaso técnico. Resume qué se construyó, por qué, qué falta y qué
conviene revisar. Pensado para que otra persona (o Claude Code) continúe el trabajo
sin tener que reconstruir el contexto.

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
  - avance secuencial `EN_PROCESO → EN_REVISION → FINALIZADO → EMPACADO` con nota,
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
- `FINALIZADO` y `EMPACADO` generan una `Notificacion` para `VENDEDOR` y `ADMIN`,
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
La plantilla `PlantaKanbanPage` sigue exportada pero ya no tiene ruta propia.

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

1. **Tests**: no hay suite. Prioridad: `cotizador.ts` (puro), validación de fases
   en `mock/db.ts`, y un smoke test de rutas con Testing Library.
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
  nota. `FINALIZADO`/`EMPACADO` crean notificaciones para VENDEDOR y ADMIN.
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
