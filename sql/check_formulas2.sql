-- Ver formulas con datos relacionados
select f.id, f.estado, f.foto_url, p.nombre as producto, u.email as cliente
from formulas f
join productos p on f.producto_id = p.id
join auth.users u on f.usuario_id = u.id
order by f.created_at desc;