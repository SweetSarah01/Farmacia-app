-- tabla formulas
create table if not exists formulas (
  id uuid default gen_random_uuid() primary key,
  usuario_id uuid references auth.users(id) not null,
  producto_id uuid references productos(id) not null,
  foto_url text not null,
  estado text default 'pendiente',
  observacion text,
  created_at timestamptz default now()
);

-- rls
alter table formulas enable row level security;

-- politicas
drop policy if exists "ver formulas" on formulas;
drop policy if exists "insertar formulas" on formulas;
drop policy if exists "actualizar formulas" on formulas;

create policy "ver formulas" on formulas for select using (true);
create policy "insertar formulas" on formulas for insert with check (true);
create policy "actualizar formulas" on formulas for update using (true);

-- bucket
insert into storage.buckets (id, name, public)
values ('formulas', 'formulas', true)
on conflict (id) do nothing;

-- storage policies
drop policy if EXISTS "storage formulas" on storage.objects;
create policy "storage formulas" on storage.objects for all using (bucket_id = 'formulas');