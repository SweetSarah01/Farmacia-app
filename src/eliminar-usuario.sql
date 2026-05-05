-- Eliminar usuario de la base de datos
-- Ejecutar en Supabase SQL Editor

-- Eliminar de profiles
DELETE FROM profiles WHERE id = 'f8bda77d-fe62-416b-b919-cb39ed363c58' OR email = 'legends334@hotmail.com';

-- Verificar que se eliminó
SELECT * FROM profiles WHERE email = 'legends334@hotmail.com';