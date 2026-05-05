-- Verificar el rol del usuario
SELECT id, email, nombre, rol, pharmacy_id 
FROM profiles 
WHERE email = 'legends334@hotmail.com';

-- También ver todas las pharmacies para obtener el ID
SELECT id, nombre, estado FROM pharmacies;