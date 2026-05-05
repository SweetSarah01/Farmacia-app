-- Tabla formulas (si no existe)
create table if not exists formulas (
  id uuid default gen_random_uuid() primary key,
  usuario_id uuid references auth.users(id) not null,
  producto_id uuid references productos(id) not null,
  foto_url text not null,
  estado text default 'pendiente',
  observacion text,
  created_at timestamptz default now()
);

-- RLS
alter table formulas enable row level security;

-- Politicas (todos pueden hacer todo por ahora)
drop policy if exists "usuarios pueden ver formulas" on formulas;
drop policy if exists "usuarios pueden insertar formulas" on formulas;
drop policy if exists "farma puede ver formulas" on formulas;
drop policy if exists "farma puede actualizar formulas" on formulas;

create policy "usuarios pueden ver formulas" on formulas for select using (true);
create policy "usuarios pueden insertar formulas" on formulas for insert with check (true);
create policy "farma puede actualizar formulas" on formulas for update using (true);

-- Bucket
insert into storage.buckets (id, name, public)
values ('formulas', 'formulas', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "cualquiera puede usar formulas" on storage.objects;
create policy "cualquiera puede usar formulas" on storage.objects for all using (bucket_id = 'formulas');