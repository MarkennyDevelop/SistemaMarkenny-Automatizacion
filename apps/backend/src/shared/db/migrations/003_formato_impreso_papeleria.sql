-- =====================================================================
-- 003 — OT de papelería según el formato impreso de MARKENNY, C.A.
--       (2026-11-24)
--
--  - Vista del trabajo (horizontal/vertical) independiente de la perforación.
--  - "Pantone" deja de ser un color: es el título de la columna de tintas.
--  - Engomado solo en blocks.
--  - Tarjetas de presentación como producto terminado.
--
-- Convierte las fichas existentes sin perder información: lo que ya no tiene
-- campo propio pasa a "colorTintaOtro" u "observaciones".
-- =====================================================================

-- 1. perforacionOrientacion → orientacion (vista del trabajo)
UPDATE ordenes_trabajo
   SET especificaciones = (especificaciones - 'perforacionOrientacion')
       || jsonb_build_object('orientacion', especificaciones->'perforacionOrientacion')
 WHERE especificaciones ? 'perforacionOrientacion';

-- 2. Color "PANTONE" con su referencia → "OTRO: Pantone <ref>"
UPDATE ordenes_trabajo
   SET especificaciones = (especificaciones - 'pantone')
       || jsonb_build_object(
            'coloresTinta',
            (SELECT COALESCE(jsonb_agg(DISTINCT c), '[]'::jsonb)
               FROM (SELECT CASE WHEN c = 'PANTONE' THEN 'OTRO' ELSE c END AS c
                       FROM jsonb_array_elements_text(especificaciones->'coloresTinta') AS t(c)) x),
            'colorTintaOtro',
            concat_ws(', ',
              NULLIF(especificaciones->>'colorTintaOtro', ''),
              CASE
                WHEN COALESCE(especificaciones->>'pantone', '') = '' THEN 'Pantone sin referencia'
                WHEN especificaciones->>'pantone' ILIKE 'pantone%' THEN especificaciones->>'pantone'
                ELSE 'Pantone ' || (especificaciones->>'pantone')
              END))
 WHERE especificaciones->'coloresTinta' ? 'PANTONE';

UPDATE ordenes_trabajo
   SET especificaciones = especificaciones - 'pantone'
 WHERE especificaciones ? 'pantone';

-- 3. Engomado registrado en algo que no es block: se conserva en la columna
--    "observaciones" (es la fuente de las observaciones de la orden).
UPDATE ordenes_trabajo
   SET observaciones = concat_ws(' · ',
         NULLIF(observaciones, ''),
         'Engomado ' || lower(especificaciones->>'engomado') || ' (registro anterior)'),
       especificaciones = especificaciones - 'engomado'
 WHERE especificaciones ? 'engomado'
   AND COALESCE(especificaciones->>'formato', '') <> 'BLOCK';

-- 4. Tarjetas de presentación como producto terminado
ALTER TABLE ordenes_trabajo DROP CONSTRAINT ordenes_trabajo_producto_terminado_check;
ALTER TABLE ordenes_trabajo ADD CONSTRAINT ordenes_trabajo_producto_terminado_check
    CHECK (producto_terminado IN ('PLIEGO_STICKERS', 'TALONARIO', 'BLOCK', 'TARJETAS_PRESENTACION',
                                  'SELLO_PERSONALIZADO', 'PENDON', 'VINIL_ROTULACION'));

ALTER TABLE stock_productos_pendientes DROP CONSTRAINT stock_productos_pendientes_tipo_producto_check;
ALTER TABLE stock_productos_pendientes ADD CONSTRAINT stock_productos_pendientes_tipo_producto_check
    CHECK (tipo_producto IN ('PLIEGO_STICKERS', 'TALONARIO', 'BLOCK', 'TARJETAS_PRESENTACION',
                             'SELLO_PERSONALIZADO', 'PENDON', 'VINIL_ROTULACION'));
