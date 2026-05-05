-- Eliminar politicas existentes y crear una nueva
drop policy if exists "v1" on formulas;
drop policy if exists "i1" on formulas;
drop policy if exists "u1" on formulas;
drop policy if exists "todos_formulas" on formulas;

-- Todos pueden hacer todo con formulas
create policy "todos_formulas" on formulas for all using (true) with check (true);