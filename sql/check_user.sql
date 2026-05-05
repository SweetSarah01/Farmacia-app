-- Verificar rol del usuario
select id, nombre, email, rol from profiles where email = 'juansantiagoblanco@gmail.com';

-- Forzar rol si no está correcto
update profiles set rol = 'farmaceutico' where email = 'juansantiagoblanco@gmail.com';

-- Ver todos los perfiles
select id, nombre, email, rol from profiles;