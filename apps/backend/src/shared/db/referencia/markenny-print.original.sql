-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Gestión de Roles y Usuarios (RBAC)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- 'ADMINISTRADOR', 'VENDEDOR', 'PRODUCCION'
    descripcion TEXT
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT REFERENCES roles(id) ON DELETE RESTRICT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Gestión de Inventario y Almacén (Materiales primas, papel, tintas)
CREATE TABLE materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_sku VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL, -- Ej: Papel Bond 75g, Papel Químico, Lona Front 13oz
    tipo VARCHAR(50) NOT NULL, -- 'PAPEL', 'TINTA', 'VINIL', 'PLANCHA_CTP', 'OTRO'
    stock_actual NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unidad_medida VARCHAR(20) NOT NULL, -- 'resmas', 'litros', 'metros_cuadrados', 'unidades'
    stock_minimo NUMERIC(12, 2) DEFAULT 10,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Control de Stock Específico: Sellos y Productos Finalizados sin Entregar
CREATE TABLE stock_productos_pendientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_producto VARCHAR(50) NOT NULL, -- 'SELLO', 'PRODUCTO_FINALIZADO'
    referencia_id UUID, -- Puede enlazar opcionalmente a una orden de trabajo
    descripcion VARCHAR(255) NOT NULL, -- Ej: Sello automático Trodat 4911 / Talonarios factura
    cantidad_en_stock INT NOT NULL DEFAULT 0,
    ubicacion_almacen VARCHAR(100), -- Estante o gaveta en almacén Markenny
    estado_entrega VARCHAR(30) DEFAULT 'EN_ALMACEN_PENDIENTE_ENTREGA', -- 'EN_ALMACEN', 'ENTREGADO'
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Órdenes de Trabajo (Basado en el formato físico de Markenny)
CREATE TABLE ordenes_trabajo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_orden VARCHAR(30) UNIQUE NOT NULL, -- Formato: OT-2026-0001
    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_telefono VARCHAR(50),
    vendedor_id UUID REFERENCES usuarios(id),
    
    -- Clasificación del trabajo
    tipo_trabajo VARCHAR(50) NOT NULL, -- 'TALONARIO', 'BLOCK', 'RECIPE', 'NOTA', 'STICKER', 'GIGANTOGRAFIA', 'SELLO', 'OTRO'
    
    -- Especificaciones técnicas flexibles (JSONB para acomodar campos variables: tintas Pantone, partes, gramajes, acabados)
    especificaciones JSONB NOT NULL,
    
    -- Estado actual en el ciclo de producción (Control de Calidad en 4 fases)
    estado_produccion VARCHAR(40) NOT NULL DEFAULT 'EN_PROCESO', 
    -- Opciones permitidas: 'EN_PROCESO', 'EN_REVISION', 'FINALIZADO', 'EMPAQUETADO', 'ENTREGADO'
    
    monto_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    observaciones TEXT,
    fecha_aprobacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_estimada_entrega TIMESTAMP WITH TIME ZONE,
    fecha_finalizado TIMESTAMP WITH TIME ZONE,
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Historial de Auditoría y Transiciones de Etapas de Producción
CREATE TABLE produccion_etapas_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id),
    estado_anterior VARCHAR(40),
    estado_nuevo VARCHAR(40) NOT NULL,
    comentario TEXT,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices GIN y B-Tree para optimización de consultas
CREATE INDEX idx_ordenes_estado ON ordenes_trabajo(estado_produccion);
CREATE INDEX idx_ordenes_vendedor ON ordenes_trabajo(vendedor_id);
CREATE INDEX idx_ordenes_especificaciones_gin ON ordenes_trabajo USING gin (especificaciones);
CREATE INDEX idx_materiales_sku ON materiales(codigo_sku);