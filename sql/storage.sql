-- Bucket y politicas de storage
insert into storage.buckets (id, name, public)
values ('formulas', 'formulas', true)
on conflict (id) do nothing;

drop policy if exists "Public can view formulas" on storage.objects;
drop policy if exists "Authenticated can upload formulas" on storage.objects;

create policy "Public can view formulas" on storage.objects for select using (bucket_id = 'formulas');
create policy "Public can upload formulas" on storage.objects for insert with check (bucket_id = 'formulas');