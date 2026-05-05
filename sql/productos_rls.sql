-- politicas para productos
drop policy if exists "Anyone can read productos" on productos;
drop policy if exists "Admin can insert productos" on productos;
drop policy if exists "Admin can update productos" on productos;
drop policy if exists "Admin can delete productos" on productos;

create policy "Anyone can read productos" on productos for select using (true);
create policy "Admin can insert productos" on productos for insert with check (true);
create policy "Admin can update productos" on productos for update using (true);
create policy "Admin can delete productos" on productos for delete using (true);