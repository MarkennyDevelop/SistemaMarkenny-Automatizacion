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

### Rutas

| Ruta | Pantalla |
|---|---|
| `/` | Dashboard (KPIs, carga de planta, alertas de inventario) |
| `/planta` | Kanban de producción con 4 fases: En Proceso → En Revisión → Finalizado → Empaquetado |
| `/ventas/ordenes` | Listado y filtros de órdenes de trabajo |
| `/ventas/nueva-orden` | Formulario compuesto de nueva OT |
| `/ventas/cotizador` | Cotizador con motor de estimación en vivo |
| `/ventas/clientes` | Cartera de clientes y saldos |
| `/inventario` | Existencias, movimientos auditados y alertas de reposición |

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
│  ├─ dashboard/         # components · hooks
│  ├─ planta-kanban/     # components · hooks · api
│  ├─ inventario/        # components · hooks · api · types
│  └─ ventas/            # components · hooks · api · lib · types
│     └─ components/
│        ├─ cotizador/   # Compound Components del cotizador
│        ├─ orden-trabajo/ # Compound Components de la OT
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
- **Compound Components**: `OrdenTrabajoForm.Root/Section/Summary/Submit` y
  `CotizadorForm.Root/Section/Summary/Submit` comparten contexto vía `context.ts`.
- **Estado del servidor**: TanStack Query con `queryKeys` centralizadas,
  mutaciones optimistas en Kanban e invalidación cruzada (una OT nueva refresca
  dashboard, listado y tablero).
- **Formularios**: React Hook Form + Zod (`zodResolver`), validación en vivo y
  resumen sticky con cálculos derivados.
- **Diseño**: paleta rojo/negro/blanco definida en `tailwind.config.ts` e
  `src/index.css`; tipografías locales con `@fontsource` (Inter + Barlow Condensed).
- **Datos mock**: `src/shared/mock/db.ts` simula una API con latencia y persiste en
  `localStorage` (`markenny.print-mis.db.v1`). La capa `api/` ya está separada para
  sustituirla por los endpoints Fastify sin tocar los componentes.
- **Motor de cotización**: patrón Strategy por tipo de impresión (offset, digital,
  gran formato) en `features/ventas/lib/cotizador.ts`; también estima el monto de
  una OT.

### Documentación de traspaso

El análisis técnico completo (decisiones, patrones, verificación, pendientes y
contrato sugerido con el backend) está en
[`docs/ANALISIS-FRONTEND.md`](docs/ANALISIS-FRONTEND.md).


