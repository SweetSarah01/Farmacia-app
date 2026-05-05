-- Actualizar el perfil con el email
UPDATE profiles 
SET email = 'legends334@hotmail.com', telefono = '3000000000', nombre = 'Usuario Farmacia'
WHERE id = '24d5d9e0-9fec-4044-8381-723ac9978167';

-- Verificar
SELECT id, email, nombre, telefono, rol, pharmacy_id 
FROM profiles 
WHERE id = '24d5d9e0-9fec-4044-8381-723ac9978167';