-- Ver formulas
select f.id, f.estado, f.foto_url, f.created_at, 
       p.nombre as producto,
       u.email as cliente
from formulas f
left join productos p on f.producto_id = p.id
left join auth.users u on f.usuario_id = u.id
order by f.created_at desc;