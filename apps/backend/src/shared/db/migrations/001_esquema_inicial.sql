-- =====================================================================
-- Markenny Print MIS — esquema relacional inicial (PostgreSQL 13+)
--
-- Basado en markenny-print.sql (rama Backend, commit 4448545). Se conservan
-- sus tablas y nombres de columna y se amplía para cumplir el contrato de la
-- API (packages/contrato). Los cambios respecto al original están documentados
-- en apps/backend/docs/BASE-DE-DATOS.md.
--
-- gen_random_uuid() es nativa desde PostgreSQL 13: no hace falta uuid-ossp.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Roles y usuarios (RBAC)
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) UNIQUE NOT NULL
                CHECK (nombre IN ('ADMIN', 'VENDEDOR', 'PRODUCCION')),
    descripcion TEXT
);

INSERT INTO roles (nombre, descripcion) VALUES
    ('ADMIN',      'Control total: usuarios, ventas, planta e inventario'),
    ('VENDEDOR',   'Clientes, órdenes de trabajo y seguimiento de sus pedidos'),
    ('PRODUCCION', 'Tablero de taller, control de calidad y almacén');

CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash   VARCHAR(255) NOT NULL,
    rol_id          INT NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    telefono        VARCHAR(30),
    cargo           VARCHAR(80),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_por      UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    ultimo_acceso   TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_rol ON usuarios (rol_id);

-- Sesiones por cookie. Se guarda el SHA-256 del token, nunca el token.
CREATE TABLE sesiones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash  CHAR(64) NOT NULL UNIQUE,
    usuario_id  UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    creada_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sesiones_usuario ON sesiones (usuario_id);
CREATE INDEX idx_sesiones_expira ON sesiones (expira_en);

-- ---------------------------------------------------------------------
-- 2. Clientes (no existía: las órdenes guardaban solo el nombre)
-- ---------------------------------------------------------------------
CREATE TABLE clientes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(150) NOT NULL,
    rif         VARCHAR(20) NOT NULL UNIQUE,
    contacto    VARCHAR(120) NOT NULL,
    telefono    VARCHAR(30) NOT NULL,
    email       VARCHAR(150) NOT NULL,
    ciudad      VARCHAR(80) NOT NULL,
    creado_por  UUID REFERENCES usuarios (id) ON DELETE SET NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 3. Inventario y almacén (materias primas, papel, tintas...)
-- ---------------------------------------------------------------------
CREATE TABLE materiales (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_sku     VARCHAR(50) UNIQUE NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    tipo           VARCHAR(20) NOT NULL
                   CHECK (tipo IN ('PAPEL', 'TINTAS', 'PLANCHAS', 'VINILOS', 'SELLOS', 'ALMACEN')),
    stock_actual   NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    unidad_medida  VARCHAR(20) NOT NULL
                   CHECK (unidad_medida IN ('resma', 'pliego', 'kg', 'litro', 'unidad', 'rollo', 'caja')),
    stock_minimo   NUMERIC(12, 2) NOT NULL DEFAULT 10 CHECK (stock_minimo >= 0),
    costo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
    ubicacion      VARCHAR(100) NOT NULL DEFAULT '',
    proveedor      VARCHAR(120) NOT NULL DEFAULT '',
    lote           VARCHAR(60) NOT NULL DEFAULT '',
    version        INT NOT NULL DEFAULT 1 CHECK (version > 0),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_materiales_tipo ON materiales (tipo);

-- ---------------------------------------------------------------------
-- 4. Órdenes de trabajo (formato físico de Markenny)
-- ---------------------------------------------------------------------
-- Numeración OT-AAAA-NNNN por año, sin huecos por concurrencia.
CREATE TABLE ordenes_trabajo_contadores (
    anio   INT PRIMARY KEY,
    ultimo INT NOT NULL DEFAULT 0
);

CREATE TABLE ordenes_trabajo (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_orden           VARCHAR(30) UNIQUE NOT NULL CHECK (codigo_orden ~ '^OT-[0-9]{4}-[0-9]{4,}$'),
    cliente_id             UUID NOT NULL REFERENCES clientes (id) ON DELETE RESTRICT,
    -- Copia del nombre y teléfono del cliente al crear la orden (la ficha impresa no cambia
    -- aunque luego se edite el cliente).
    cliente_nombre         VARCHAR(150) NOT NULL,
    cliente_telefono       VARCHAR(50),
    vendedor_id            UUID NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,

    -- Clasificación del trabajo
    tipo_trabajo           VARCHAR(20) NOT NULL CHECK (tipo_trabajo IN ('PAPELERIA', 'GRAN_FORMATO', 'GENERAL')),
    producto               VARCHAR(120) NOT NULL,
    descripcion            VARCHAR(280) NOT NULL DEFAULT '',
    tecnologia             VARCHAR(20) NOT NULL CHECK (tecnologia IN ('OFFSET', 'DIGITAL', 'GRAN_FORMATO', 'FLEXOGRAFIA')),
    prioridad              VARCHAR(10) NOT NULL CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')),
    maquina                VARCHAR(80) NOT NULL,
    operador               VARCHAR(120),
    cantidad               INT NOT NULL CHECK (cantidad > 0),
    sustrato               VARCHAR(120) NOT NULL,
    tintas                 TEXT[] NOT NULL DEFAULT '{}',
    acabados               TEXT[] NOT NULL DEFAULT '{}',

    -- Especificaciones técnicas flexibles: partes, numeración, gramaje, Pantone,
    -- dimensiones de gran formato...
    especificaciones       JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Control de calidad en 4 fases. La entrega al cliente va aparte (estado_entrega).
    estado_produccion      VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO'
                           CHECK (estado_produccion IN ('EN_PROCESO', 'EN_REVISION', 'FINALIZADO', 'EMPAQUETADO')),
    estado_entrega         VARCHAR(20) NOT NULL DEFAULT 'NO_APLICA'
                           CHECK (estado_entrega IN ('NO_APLICA', 'PENDIENTE', 'PARCIAL', 'ENTREGADO')),

    monto_total            NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monto_total >= 0),
    observaciones          TEXT,
    fecha_aprobacion       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_estimada_entrega TIMESTAMPTZ NOT NULL,
    fecha_finalizado       TIMESTAMPTZ,
    version                INT NOT NULL DEFAULT 1 CHECK (version > 0),
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ordenes_estado ON ordenes_trabajo (estado_produccion);
CREATE INDEX idx_ordenes_vendedor ON ordenes_trabajo (vendedor_id);
CREATE INDEX idx_ordenes_cliente ON ordenes_trabajo (cliente_id);
CREATE INDEX idx_ordenes_creado ON ordenes_trabajo (creado_en DESC);
CREATE INDEX idx_ordenes_especificaciones_gin ON ordenes_trabajo USING gin (especificaciones);

-- ---------------------------------------------------------------------
-- 5. Auditoría de transiciones de etapas de producción (solo inserción)
-- ---------------------------------------------------------------------
CREATE TABLE produccion_etapas_auditoria (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id        UUID NOT NULL REFERENCES ordenes_trabajo (id) ON DELETE RESTRICT,
    usuario_id      UUID NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
    -- Nombre y rol en el momento del cambio: la auditoría no cambia si luego se edita el usuario.
    usuario_nombre  VARCHAR(150) NOT NULL,
    usuario_rol     VARCHAR(20) NOT NULL,
    estado_anterior VARCHAR(20),
    estado_nuevo    VARCHAR(20) NOT NULL,
    comentario      TEXT,
    registrado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auditoria_orden ON produccion_etapas_auditoria (orden_id, registrado_en);
CREATE INDEX idx_auditoria_usuario ON produccion_etapas_auditoria (usuario_id, registrado_en);

CREATE FUNCTION auditoria_solo_insercion() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'La tabla % es de solo inserción (auditoría)', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_etapas_inmutable
    BEFORE UPDATE OR DELETE ON produccion_etapas_auditoria
    FOR EACH ROW EXECUTE FUNCTION auditoria_solo_insercion();
CREATE TRIGGER trg_auditoria_etapas_sin_truncate
    BEFORE TRUNCATE ON produccion_etapas_auditoria
    FOR EACH STATEMENT EXECUTE FUNCTION auditoria_solo_insercion();

-- ---------------------------------------------------------------------
-- 6. Movimientos de inventario (kardex, solo inserción)
-- ---------------------------------------------------------------------
CREATE TABLE movimientos_inventario (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id      UUID NOT NULL REFERENCES materiales (id) ON DELETE RESTRICT,
    tipo             VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'RESERVA')),
    cantidad         NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
    stock_resultante NUMERIC(12, 2) NOT NULL CHECK (stock_resultante >= 0),
    motivo           VARCHAR(160) NOT NULL,
    orden_id         UUID REFERENCES ordenes_trabajo (id) ON DELETE RESTRICT,
    usuario_id       UUID NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
    usuario_nombre   VARCHAR(150) NOT NULL,
    registrado_en    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movimientos_material ON movimientos_inventario (material_id, registrado_en DESC);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario (registrado_en DESC);
-- Idempotencia: una orden descuenta cada material una sola vez aunque el evento se repita.
CREATE UNIQUE INDEX uq_movimientos_salida_por_orden
    ON movimientos_inventario (material_id, orden_id)
    WHERE tipo = 'SALIDA' AND orden_id IS NOT NULL;

CREATE TRIGGER trg_movimientos_inmutable
    BEFORE UPDATE OR DELETE ON movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION auditoria_solo_insercion();
CREATE TRIGGER trg_movimientos_sin_truncate
    BEFORE TRUNCATE ON movimientos_inventario
    FOR EACH STATEMENT EXECUTE FUNCTION auditoria_solo_insercion();

-- ---------------------------------------------------------------------
-- 7. Stock específico: sellos y productos finalizados sin entregar
-- ---------------------------------------------------------------------
CREATE TABLE stock_productos_pendientes (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_producto      VARCHAR(30) NOT NULL CHECK (tipo_producto IN ('SELLO', 'PRODUCTO_TERMINADO')),
    -- Orden de trabajo de origen (una orden entra una sola vez al almacén).
    referencia_id      UUID UNIQUE REFERENCES ordenes_trabajo (id) ON DELETE RESTRICT,
    -- Copia de datos de la orden al entrar al almacén: Inventario no consulta las
    -- tablas de Producción (regla del monolito modular).
    codigo_orden       VARCHAR(30),
    cliente_id         UUID REFERENCES clientes (id) ON DELETE RESTRICT,
    cliente_nombre     VARCHAR(150),
    descripcion        VARCHAR(255) NOT NULL,
    cantidad_inicial   INT NOT NULL CHECK (cantidad_inicial > 0),
    -- Unidades que siguen en almacén (cantidad_inicial - entregadas).
    cantidad_en_stock  INT NOT NULL CHECK (cantidad_en_stock >= 0),
    ubicacion_almacen  VARCHAR(100),
    estado_entrega     VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                       CHECK (estado_entrega IN ('PENDIENTE', 'PARCIAL', 'ENTREGADO')),
    version            INT NOT NULL DEFAULT 1 CHECK (version > 0),
    ingresado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (cantidad_en_stock <= cantidad_inicial)
);

CREATE INDEX idx_stock_pendientes ON stock_productos_pendientes (tipo_producto)
    WHERE estado_entrega <> 'ENTREGADO';

CREATE TABLE entregas_productos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id     UUID NOT NULL REFERENCES stock_productos_pendientes (id) ON DELETE RESTRICT,
    cantidad        INT NOT NULL CHECK (cantidad > 0),
    recibido_por    VARCHAR(120),
    usuario_id      UUID NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
    usuario_nombre  VARCHAR(150) NOT NULL,
    registrado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entregas_producto ON entregas_productos (producto_id, registrado_en);

-- ---------------------------------------------------------------------
-- 8. Notificaciones (campana del Topbar)
-- ---------------------------------------------------------------------
CREATE TABLE notificaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('PEDIDO_LISTO', 'FASE', 'STOCK', 'SISTEMA')),
    titulo          VARCHAR(150) NOT NULL,
    detalle         VARCHAR(300) NOT NULL,
    orden_id        UUID REFERENCES ordenes_trabajo (id) ON DELETE CASCADE,
    codigo          VARCHAR(30),
    -- Roles que la ven; si hay destinatario, los vendedores solo la ven si es suya.
    roles           TEXT[] NOT NULL CHECK (roles <@ ARRAY['ADMIN', 'VENDEDOR', 'PRODUCCION']::TEXT[]),
    destinatario_id UUID REFERENCES usuarios (id) ON DELETE CASCADE,
    creada_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notificaciones_fecha ON notificaciones (creada_en DESC);

CREATE TABLE notificaciones_lecturas (
    notificacion_id UUID NOT NULL REFERENCES notificaciones (id) ON DELETE CASCADE,
    usuario_id      UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    leida_en        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notificacion_id, usuario_id)
);
