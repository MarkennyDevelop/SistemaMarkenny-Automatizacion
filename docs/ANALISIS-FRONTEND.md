# Análisis del frontend — Print MIS Markenny (rama `Frontend`)

Documento de traspaso técnico. Resume qué se construyó, por qué, qué falta y qué
conviene revisar. Pensado para que otra persona (o Claude Code) continúe el trabajo
sin tener que reconstruir el contexto.

---

## 1. Resumen ejecutivo

Se implementó el frontend completo del Print MIS sobre React 18 + TypeScript 5 +
Vite 5 + Tailwind 3 + shadcn/ui (Radix), con arquitectura *feature-based* y
patrones Compound Components + Container/Presentational.

Estado actual:

- Compila: `npm run typecheck` limpio, `npm run build` correcto (sin warnings de
  tamaño de chunk tras el split manual).
- Funciona de punta a punta contra una **API mock persistente en `localStorage`**.
- Flujo validado manualmente en navegador:
  - crear OT → `OT-2026-0185` con toast y refresco del listado (13 órdenes);
  - mover OT a *En Revisión* desde el Kanban (`EN_REVISION`) con persistencia;
  - registrar movimiento de inventario → stock `38 → 43 resma`, toast
    “Movimiento registrado · entrada de 5”.
- Consola sin errores ni warnings (se silenciaron los *future flags* de React Router).

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
│  ├─ dashboard/         components · hooks
│  ├─ planta-kanban/     components · hooks · api
│  ├─ inventario/        components · hooks · api · types
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

- `Cliente`
- `OrdenTrabajo` (código, cliente, producto, cantidad, fase, prioridad, avance,
  máquina, operador, fechas, monto, flag de calidad)
- `FaseProduccion` = `EN_PROCESO | EN_REVISION | FINALIZADO | EMPAQUETADO`
  (exactamente 4, como se pidió)
- `MaterialInventario` (SKU, categoría, stock, stock mínimo, ubicación, proveedor,
  lote, costo unitario)
- `MovimientoInventario` (tipo `ENTRADA | SALIDA | AJUSTE | RESERVA`, cantidad,
  motivo, usuario, fecha)
- `Cotizacion` / resultados del motor

`src/shared/catalogos.ts` centraliza listas (máquinas, acabados, tipos de papel…)
para evitar strings duplicados.

`src/shared/fase-ui.ts` mapea cada fase a etiqueta, color y badge **dentro de la
paleta permitida** (rojo/negro/blanco + grises).

## 5. Patrones implementados (lo que conviene revisar con lupa)

### 5.1 Compound Components

- `features/ventas/components/orden-trabajo/OrdenTrabajoForm.tsx`
  expone `OrdenTrabajoForm.Root`, `.Section`, `.Summary`, `.Submit`.
- `features/ventas/components/cotizador/CotizadorForm.tsx` replica la misma API.
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

- `OrdenesTrabajoPage`, `ClientesPage`, `InventarioPage`, `PlantaKanbanPage`,
  `DashboardPage` → contenedores (queries, mutaciones, toasts).
- `OrdenesTrabajoTable`, `ClientesTable`, `InventarioTable`, `KanbanBoard`,
  `DashboardView` → presentacionales puros.

### 5.3 Motor de cotización

`features/ventas/lib/cotizador.ts`:

- `estrategias` por tipo de impresión, cada una con su cálculo de costo/tiempo.
- `estimarMontoOrden(...)` reutiliza el motor para sugerir el monto de una OT.
- Funciones puras → fáciles de cubrir con tests unitarios (pendiente).

### 5.4 Kanban

- `KanbanBoard` maneja drag & drop nativo (HTML5) y `onMove`.
- `usePlantaBoard` hace optimistic update: mueve la tarjeta, actualiza el snapshot
  y hace rollback en error.
- `usePlantaEnVivo` simula polling de 30 s para el indicador “Planta en vivo”.

## 6. Sistema de diseño

- Paleta en `tailwind.config.ts` + variables HSL en `src/index.css`:
  `--primary` rojo Markenny, `--markenny-ink` negro, superficies blancas/gris claro.
- Modo oscuro con la misma paleta (rojo sobre negro).
- Componentes base con radios, sombras y tipografía condensada para títulos
  (`Barlow Condensed`) e Inter para UI.
- `Progress`, `Badge`, `Tabs`, `Table`, `Dialog`, `Select`, `Collapsible`,
  `DropdownMenu`, `Tooltip` adaptados a los tokens.

## 7. Rutas

| Ruta | Componente contenedor |
|---|---|
| `/` | `DashboardPage` |
| `/planta` | `PlantaKanbanPage` |
| `/ventas` → redirige a `/ventas/ordenes` | — |
| `/ventas/ordenes` | `OrdenesTrabajoPage` |
| `/ventas/nueva-orden` | `NuevaOrdenTrabajoPage` |
| `/ventas/cotizador` | `CotizadorPage` |
| `/ventas/clientes` | `ClientesPage` |
| `/inventario` | `InventarioPage` |
| `*` | `NotFoundPage` |

`BrowserRouter` con `future={{ v7_startTransition, v7_relativeSplatPath }}`.

## 8. Datos mock

`src/shared/mock/db.ts`:

- Semilla: 8 clientes, 12 órdenes, 20 materiales, 8 movimientos.
- Persistencia: `localStorage['markenny.print-mis.db.v1']`.
- Latencia simulada (~250–500 ms) para que se vean los estados de carga.
- Funciones: `listarOrdenes`, `crearOrden`, `moverOrden`, `listarMateriales`,
  `registrarMovimiento`, `listarClientes`, `crearCliente`, `dashboardResumen`.
- Cada mutación recalcula totales derivados (stock, saldos, KPIs) para que el
  frontend se comporte como con un backend real.

**Deuda:** el mock y los tipos viven en el mismo repo que el frontend; cuando
exista el backend conviene mover `domain.ts` a un paquete compartido o generarlo
desde el esquema Zod del servidor.

## 9. Rendimiento

- Split manual en `vite.config.ts`: `react`, `query`, `forms`, `radix`, `index`.
  Resultado: chunk mayor ~236 kB (gzip ~61 kB), sin warning de 500 kB.
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
| Crear OT desde `/ventas/nueva-orden` | OK (`OT-2026-0185`, toast, listado a 13) |
| Mover OT en Kanban | OK (`EN_REVISION`, persistido en localStorage) |
| Registrar movimiento de inventario | OK (stock 38 → 43, toast) |
| Consola del navegador | Sin errores ni warnings |
| Layout móvil (800 px) | Tablas con scroll horizontal correcto |
| Layout desktop ≥1280 px | **No validado visualmente** (viewport de la herramienta 800×582); revisar sidebar fijo, Kanban de 4 columnas y resumen sticky |

## 12. Pendientes / deuda técnica priorizada

1. **Tests**: no hay suite. Prioridad: `cotizador.ts` (puro), `mock/db.ts`
   (mutaciones), y un smoke test de rutas con Testing Library.
2. **Sustituir el mock por Fastify**: implementar `fetch` en `*Api.ts` y tipar
   respuestas con Zod; mantener `queryKeys`.
3. **Autenticación y roles**: el topbar muestra un usuario fijo (“Kenny Hernández”).
   Falta login, guardas de ruta y permisos por rol (ventas, planta, almacén, admin).
4. **Formularios**: persistir borradores, confirmación al salir con cambios, y
   adjuntar archivos (arte final) en la OT.
5. **Kanban**: soporte táctil real (pointer events) y accesibilidad por teclado
   para mover tarjetas; hoy usa drag & drop HTML5.
6. **Cotizador**: exportar PDF de la cotización y convertir cotización → OT.
7. **Inventario**: reservas vinculadas a OT, kardex por material, alertas de
   reposición con generación de orden de compra.
8. **Dashboard**: series temporales reales (hoy son KPIs derivados del mock).
9. **i18n / formato**: fechas y moneda están en `es-VE`/USD; centralizar si se
   agregan otras monedas.
10. **PWA/offline**: útil en planta; evaluar `vite-plugin-pwa`.
11. **Validación visual desktop**: revisar en un viewport ≥1280 px.
12. **CI**: workflow de `typecheck` + `build` en cada PR.

## 13. Notas de integración con el backend

Contrato sugerido (alineado con lo que ya consume el frontend):

```
GET    /api/ordenes?fase=&q=
POST   /api/ordenes
PATCH  /api/ordenes/:id          { fase, avance, ... }
GET    /api/clientes
POST   /api/clientes
GET    /api/inventario?categoria=&q=
POST   /api/inventario/movimientos
GET    /api/dashboard
```

Reglas que el frontend asume:

- `OrdenTrabajo.codigo` lo genera el backend con formato `OT-AAAA-NNNN`.
- `fase` solo acepta los 4 valores definidos.
- Los movimientos de inventario son **inmutables** (auditoría); el stock se
  recalcula en el servidor.
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

Si se quiere reiniciar los datos de demo:

```js
localStorage.removeItem("markenny.print-mis.db.v1");
location.reload();
```
