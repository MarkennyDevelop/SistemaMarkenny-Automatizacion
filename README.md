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
6. Arquitectura Feature-Based Architecture

# FRONTEND:

1. React.js como Framework de la Interfaz
2. TypeScript como Lenguaje Base
3. Tailwind CSS como Framework de estilos
4. Vite como servidor y empaquetador
5. Shadcn UI para Sistema de componentes
6. Arquitectura Monolito Modular + Hexagonal + Event-Driven Interno

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

### Comandos

```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # typecheck + build de producción en dist/
npm run preview   # sirve el build (http://localhost:4173)
npm run typecheck # solo verificación de tipos
```

> En Windows con PowerShell restringido, usar `npm.cmd` en lugar de `npm`.

### Acceso, roles y primer arranque

El sistema arranca **sin usuarios sembrados**. Al abrir la aplicación por primera
vez, `/login` redirige a `/setup-admin`, donde se registra la cuenta maestra de
Administrador. Esa pantalla se bloquea de forma permanente en cuanto existe un
administrador activo.

| Rol | Alcance | Aterrizaje |
|---|---|---|
| Administrador | Control total: ventas, producción, inventario y empleados | `/admin` |
| Vendedor | Ventas, clientes, OT y seguimiento de sus trabajos | `/ventas/dashboard` |
| Producción | Taller, control de calidad, empaque y almacén | `/produccion` |

El alta de empleados es exclusiva del Administrador (`/admin/empleados`) y solo
permite crear cuentas **Vendedor** o **Producción**; no se puede crear un segundo
administrador desde la interfaz.

La identidad se persiste en `localStorage` (`markenny.print-mis.auth.v1`) con
SHA-256 + sal por usuario. Es un mock de desarrollo: al conectar Fastify se
sustituye por sesiones/cookies del backend.

**Credenciales de la demo validada:**

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@markenny.com` | `Markenny2026` |
| Vendedor | `valeria@markenny.com` | `Ventas2026` |
| Producción | `luis@markenny.com` | `Planta2026` |

Para reiniciar la demo por completo, borrar `markenny.print-mis.db.v1` y
`markenny.print-mis.auth.v1` del `localStorage` y recargar.

> **Importante:** las cuentas viven en el `localStorage` de **cada navegador**.
> Unas credenciales creadas en la sesión de pruebas de otro equipo o perfil no
> existen en el tuyo: al abrir la app verás `/setup-admin` o el login rechazará
> esos correos. Si eso ocurre, ejecuta `npm run dev` y pulsa **Cargar cuentas
> demo · solo desarrollo**, que aparece al pie de `/login` y `/setup-admin`.
> Ese botón instala las tres cuentas de la tabla anterior en tu navegador, cierra
> la sesión y recarga. No aparece en el build de producción (`npm run preview`).

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
└─ shared/               # domain.ts, catalogos.ts, fase-ui.ts, mock/db.ts, api/queryKeys.ts
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
- **Control de calidad secuencial**: `usePlantaBoard` y `mockDb.actualizarFaseOrden`
  solo permiten avanzar una fase (sin saltos ni retrocesos); cada cambio agrega un
  `EventoOrden` con usuario, rol, fecha y nota.
- **Notificaciones**: al marcar *Finalizado* o *Empaquetado* se genera una
  `Notificacion` para Vendedor y Administrador, visible en la campana del `Topbar`.
- **Estado del servidor**: TanStack Query con `queryKeys` centralizadas,
  mutaciones optimistas en Kanban e invalidación cruzada (una OT nueva refresca
  dashboard, listado y tablero).
- **Formularios**: React Hook Form + Zod (`zodResolver`), validación en vivo y
  resumen sticky con cálculos derivados.
- **Diseño**: paleta rojo/negro/blanco definida en `tailwind.config.ts` e
  `src/index.css`; tipografías locales con `@fontsource` (Inter + Barlow Condensed).
- **Datos mock**: `src/shared/mock/db.ts` simula una API con latencia y persiste en
  `localStorage` (`markenny.print-mis.db.v1`); la identidad vive aparte en
  `markenny.print-mis.auth.v1`. La capa `api/` ya está separada para sustituirla
  por los endpoints Fastify sin tocar los componentes.
- **Motor de cotización**: patrón Strategy por tipo de impresión (offset, digital,
  gran formato) en `features/ventas/lib/cotizador.ts`; también estima el monto de
  una OT.

### Documentación de traspaso

El análisis técnico completo (decisiones, patrones, verificación, pendientes y
contrato sugerido con el backend) está en
[`docs/ANALISIS-FRONTEND.md`](docs/ANALISIS-FRONTEND.md).


