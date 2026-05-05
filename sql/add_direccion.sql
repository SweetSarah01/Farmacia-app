-- Agregar columna direccion a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS direccion TEXT;

-- Actualizar usuarios existentes con direccion vacía si es null
UPDATE profiles SET direccion = '' WHERE direccion IS NULL;