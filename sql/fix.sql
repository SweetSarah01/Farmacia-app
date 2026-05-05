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

alter table formulas enable row level security;

drop policy if exists "v1" on formulas;
drop policy if exists "i1" on formulas;
drop policy if exists "u1" on formulas;

create policy "v1" on formulas for select using (true);
create policy "i1" on formulas for insert with check (true);
create policy "u1" on formulas for update using (true);

insert into storage.buckets (id, name, public)
values ('formulas', 'formulas', true)
on conflict (id) do nothing;

drop policy if exists "s1" on storage.objects;
create policy "s1" on storage.objects for all using (bucket_id = 'formulas');