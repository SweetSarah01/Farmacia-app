-- Arreglar politicas para formulas
drop policy if exists "v1" on formulas;
drop policy if exists "i1" on formulas;
drop policy if exists "u1" on formulas;

-- Todos pueden ver e insertar formulas
create policy "v1" on formulas for select using (true);
create policy "i1" on formulas for insert with check (true);
create policy "u1" on formulas for update using (true);