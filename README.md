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
## Estructura del repositorio

```
apps/
└── backend/          # Print MIS / ERP — Fastify + PostgreSQL + Zod (ver apps/backend/README.md)
packages/
├── contrato/         # Contrato de la API compartido con el frontend (viene de la rama API)
└── cliente-http/     # Cliente HTTP tipado para el frontend (viene de la rama API)
docs/api/             # Documentación y OpenAPI del contrato
```

## Ramas del repositorio

| Rama | Contenido |
|---|---|
| `Backend` | Backend (`apps/backend`): Fastify + PostgreSQL + Zod |
| `Frontend` | Frontend (React + TypeScript + Vite + Tailwind + Shadcn UI) |
| `API` | Contrato frontend ↔ backend (`packages/contrato`, `packages/cliente-http`) |

> **Nota de corrección de rama (2026-11-16):** la estructura base del backend se
> subió por error a la rama `Frontend` (commit `17f2dcf`). Se trasladó a esta rama
> `Backend` conservando el mismo commit e historial, y se revirtió en `Frontend`
> para que esa rama quede reservada al frontend.

## Contrato de la API (fusionado desde la rama `API`)

Esta rama contiene el contrato con el que se conectan el frontend (rama
`Frontend`) y el backend (rama `Backend`):

- `packages/contrato`: reglas compartidas, esquemas Zod y tabla de endpoints.
- `packages/cliente-http`: cliente HTTP tipado para el frontend.
- `docs/api/openapi.json`: especificación OpenAPI generada desde el contrato.

Detalle, reglas de negocio acordadas y cambios pendientes en
[`docs/api/README.md`](docs/api/README.md).

