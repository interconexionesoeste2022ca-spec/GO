-- =====================================================
-- NUEVAS TABLAS PARA GALANET OESTE v8.1
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. TABLA: ANTENAS (Ubicaciones de equipos/torres)
CREATE TABLE IF NOT EXISTS antenas (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  latitud NUMERIC(10, 6) NOT NULL,
  longitud NUMERIC(10, 6) NOT NULL,
  ubicacion_descripcion TEXT,
  banda_frecuencia TEXT, -- ej: "5GHz", "2.4GHz", "60GHz"
  potencia_watts NUMERIC(8, 2),
  alcance_approx_metros INTEGER,
  activa BOOLEAN DEFAULT true,
  nota_tecnica TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_antenas_ubicacion ON antenas(latitud, longitud);
CREATE INDEX IF NOT EXISTS idx_antenas_activa ON antenas(activa);

-- 2. TABLA: SNACKS (Ubicaciones de puntos de venta)
CREATE TABLE IF NOT EXISTS snacks (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  latitud NUMERIC(10, 6) NOT NULL,
  longitud NUMERIC(10, 6) NOT NULL,
  ubicacion_descripcion TEXT,
  contacto_telefono TEXT,
  horario_atencion TEXT, -- ej: "9:00-18:00 L-V"
  activo BOOLEAN DEFAULT true,
  nota_especial TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snacks_ubicacion ON snacks(latitud, longitud);
CREATE INDEX IF NOT EXISTS idx_snacks_activo ON snacks(activo);

-- 3. TABLA: FOTOS DE CLIENTES EN GOOGLE DRIVE
CREATE TABLE IF NOT EXISTS cliente_fotos_drive (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  drive_url TEXT NOT NULL, -- URL pública de la foto
  drive_file_id TEXT NOT NULL, -- ID del archivo en Google Drive (para actualizar)
  titulo TEXT, -- ej: "Foto de entrada", "Panel de control"
  es_referencia_casa BOOLEAN DEFAULT true, -- true = referencia visual de casa
  es_documento BOOLEAN DEFAULT false, -- true = documento/cedula/facturas
  notas TEXT,
  subida_por TEXT, -- usuario que subió
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliente_fotos_cliente_id ON cliente_fotos_drive(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_fotos_referencia ON cliente_fotos_drive(es_referencia_casa);

-- 4. MEJORAR TABLA: verificacion_pagos (más detalles)
-- Si no existe, crearla; si existe, agregar columnas faltantes
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS verificado_por TEXT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS verificado_en TIMESTAMP WITH TIME ZONE;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS comentario_pago TEXT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS dias_mora INTEGER DEFAULT 0;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS penalizacion_mora NUMERIC(12, 2) DEFAULT 0;

-- 5. TABLA: AUDITORÍA PARA MAPAS (opcional - para rastrear cambios)
CREATE TABLE IF NOT EXISTS auditoria_mapa (
  id BIGSERIAL PRIMARY KEY,
  usuario TEXT NOT NULL,
  accion TEXT NOT NULL, -- 'crear_antena', 'eliminar_snack', 'agregar_foto'
  entidad TEXT NOT NULL, -- 'antena', 'snack', 'foto'
  entidad_id BIGINT,
  cliente_id BIGINT,
  descripcion TEXT,
  ip_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PERMISOS RLS (Row Level Security) - Opcional
-- =====================================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE antenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE snacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_fotos_drive ENABLE ROW LEVEL SECURITY;

-- Políticas: todos los usuarios autenticados pueden leer
CREATE POLICY "antenas_select" ON antenas FOR SELECT USING (true);
CREATE POLICY "snacks_select" ON snacks FOR SELECT USING (true);
CREATE POLICY "fotos_select" ON cliente_fotos_drive FOR SELECT USING (true);

-- Políticas: solo admin/staff pueden escribir
CREATE POLICY "antenas_write" ON antenas 
  FOR ALL USING (EXISTS (
    SELECT 1 FROM usuarios WHERE usuario = CURRENT_USER AND rol IN ('admin', 'staff')
  ));

CREATE POLICY "snacks_write" ON snacks 
  FOR ALL USING (EXISTS (
    SELECT 1 FROM usuarios WHERE usuario = CURRENT_USER AND rol IN ('admin', 'staff')
  ));

CREATE POLICY "fotos_write" ON cliente_fotos_drive 
  FOR ALL USING (EXISTS (
    SELECT 1 FROM usuarios WHERE usuario = CURRENT_USER AND rol IN ('admin', 'staff')
  ));

-- =====================================================
-- DATOS INICIALES DE PRUEBA (Barquisimeto, Venezuela)
-- =====================================================

INSERT INTO antenas (nombre, latitud, longitud, ubicacion_descripcion, banda_frecuencia, activa)
VALUES
  ('Antena Principal - Centro', 10.0670, -69.3470, 'Edificio GALANET Centro', '5GHz', true),
  ('Antena Sucursal - Este', 10.0750, -69.3200, 'Sector San Jacinto', '5GHz', true),
  ('Antena Backup - Oeste', 10.0550, -69.3700, 'Zona Industrial', '2.4GHz', true)
ON CONFLICT DO NOTHING;

INSERT INTO snacks (nombre, latitud, longitud, ubicacion_descripcion, contacto_telefono, horario_atencion, activo)
VALUES
  ('Snack GALANET Centro', 10.0670, -69.3480, 'Av. Principal', '0414-1234567', '8:00-20:00 L-V, 10:00-18:00 S', true),
  ('Snack Este', 10.0700, -69.3250, 'Centro Comercial San Jacinto', '0414-7654321', '9:00-21:00 L-D', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FIN DE SCRIPT
-- =====================================================
