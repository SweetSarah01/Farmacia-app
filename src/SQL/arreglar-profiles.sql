-- ARREGLAR TABLA PROFILES
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas faltantes a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'cliente';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pharmacy_id UUID;

-- Agregar pharmacy_id a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS pharmacy_id UUID;

-- Agregar pharmacy_id a pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pharmacy_id UUID;

-- Actualizar algunos perfiles de prueba
-- UPDATE profiles SET rol = 'super_admin' WHERE email = 'admin@farmacia.com';
-- UPDATE profiles SET rol = 'admin' WHERE email = 'tu-email@ejemplo.com';

-- Verificar estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';