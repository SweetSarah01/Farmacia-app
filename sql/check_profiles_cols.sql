-- Ver estructura actual de profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Ver datos de ejemplo
SELECT id, email, username, nombre, telefono, direccion, rol 
FROM profiles 
LIMIT 5;