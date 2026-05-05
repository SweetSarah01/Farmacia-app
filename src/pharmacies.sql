-- =============================================
-- FARMACIA APP - MONTERÍA
-- Sistema completo de farmacias
-- =============================================

-- 1. TABLA DE FARMACIAS
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nit TEXT,
  direccion TEXT NOT NULL,
  ciudad TEXT NOT NULL DEFAULT 'Montería',
  barrio TEXT,
  telefono TEXT NOT NULL,
  email TEXT,
  responsable_nombre TEXT,
  hora_apertura TIME DEFAULT '07:00',
  hora_cierre TIME DEFAULT '22:00',
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  logo TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  fecha_aprobacion TIMESTAMPTZ,
  aprobado_por UUID,
  motivo_rechazo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AGREGAR PHARMACY_ID A PRODUCTOS (cada pharmacy tiene sus propios productos)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id);

-- 3. AGREGAR PHARMACY_ID A PEDIDOS
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id);

-- 4. AGREGAR CAMPOS A PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS barrio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ciudad TEXT DEFAULT 'Montería';

-- 5. AGREGAR CALIFICACIÓN A PEDIDOS
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS calificacion INTEGER;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comentario TEXT;

-- 6. POLÍTICAS RLS
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver farmacias aprobadas (para el catálogo público)
DROP POLICY IF EXISTS "Anyone see approved pharmacies" ON pharmacies;
CREATE POLICY "Anyone see approved pharmacies" ON pharmacies FOR SELECT USING (estado = 'aprobado');

-- Productos: cualquiera puede ver, solo pharmacy puede modificar los suyos
DROP POLICY IF EXISTS "Anyone see productos" ON productos;
CREATE POLICY "Anyone see productos" ON productos FOR SELECT USING (true);

-- =============================================
-- VERIFICAR QUE TODO ESTÉ OK
-- =============================================
SELECT 'pharmacies' as tabla, count(*) as registros FROM pharmacies
UNION ALL
SELECT 'productos' as tabla, count(*) as registros FROM productos
UNION ALL
SELECT 'pedidos' as tabla, count(*) as registros FROM pedidos;