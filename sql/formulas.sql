-- tabla de formulas
create table if not exists formulas (
  id uuid default gen_random_uuid() primary key,
  usuario_id uuid references auth.users(id) not null,
  producto_id uuid references productos(id) not null,
  foto_url text not null,
  estado text default 'pendiente',
  observacion text,
  created_at timestamptz default now()
);

-- habilitar rls
alter table formulas enable row level security;

-- politicas
drop policy if exists "usuarios ven sus formulas" on formulas;
drop policy if exists "farma puede ver formulas" on formulas;
drop policy if exists "farma puede actualizar formulas" on formulas;

create policy "usuarios ven sus formulas" on formulas for select using (auth.uid() = usuario_id);
create policy "farma puede ver formulas" on formulas for select using (true);
create policy "farma puede actualizar formulas" on formulas for update using (true);

-- bucket
insert into storage.buckets (id, name, public)
values ('formulas', 'formulas', true)
on conflict (id) do nothing;

-- storage policies
drop policy if exists "public can view formulas" on storage.objects;

create policy "public can view formulas" on storage.objects for select using (bucket_id = 'formulas');