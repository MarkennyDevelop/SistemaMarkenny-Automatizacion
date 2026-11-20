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
7. 

## Rama `API`: contrato frontend ↔ backend

Esta rama contiene el contrato con el que se conectan el frontend (rama
`Frontend`) y el backend (rama `Backend`):

- `packages/contrato`: reglas compartidas, esquemas Zod y tabla de endpoints.
- `packages/cliente-http`: cliente HTTP tipado para el frontend.
- `docs/api/openapi.json`: especificación OpenAPI generada desde el contrato.

Detalle, reglas de negocio acordadas y cambios pendientes en
[`docs/api/README.md`](docs/api/README.md).

