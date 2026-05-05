-- Ver politicas actuales de formulas
select * from pg_policies where tablename = 'formulas';

-- Eliminar todas las politicas y crear una nueva
drop policy if exists "v1" on formulas;
drop policy if exists "i1" on formulas;
drop policy if exists "u1" on formulas;
drop policy if exists "usuarios ven sus formulas" on formulas;
drop policy if exists "farma puede ver formulas" on formulas;
drop policy if exists "farma puede actualizar formulas" on formulas;

-- Crear politica simple - todos pueden hacer todo
create policy "todos_formulas" on formulas for all using (true) with check (true);