-- Verificar rol del usuario
select id, nombre, email, rol from profiles where email = 'juansantiagoblanco@outlook.com';

-- Forzar rol de farmaceutico
update profiles set rol = 'farmaceutico' where email = 'juansantiagoblanco@outlook.com';