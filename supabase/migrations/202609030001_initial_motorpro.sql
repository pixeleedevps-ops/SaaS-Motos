-- Run with `supabase db push` (or paste into the Supabase SQL editor) before
-- setting VITE_SUPABASE_* in the frontend.
create extension if not exists pgcrypto;

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  is_main boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null, cedula text, email text, phone text not null default '',
  avatar text, address text not null default '', city text not null default '',
  is_vip boolean not null default false, notes text not null default '',
  total_spent numeric(14,2) not null default 0,
  completed_services_count integer not null default 0,
  next_revision_date date, created_at timestamptz not null default now()
);

create table if not exists public.motorcycles (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete cascade,
  brand text not null, model text not null, year integer not null, license_plate text not null unique,
  vin text not null default '', mileage integer not null default 0, color text not null default '', cylinder_capacity text not null default ''
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), sku text not null unique, name text not null, brand text not null default '',
  category text not null, min_stock integer not null default 0, max_stock integer not null default 0,
  cost_price numeric(14,2) not null default 0, sale_price numeric(14,2) not null default 0,
  location text not null default '', created_at timestamptz not null default now()
);

create table if not exists public.inventory_balances (
  product_id uuid not null references public.products(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now(), primary key (product_id, warehouse_id)
);

do $$ begin
  create type public.inventory_movement_type as enum ('purchase','sale','service','adjustment','transfer_out','transfer_in');
exception when duplicate_object then null; end $$;
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
  warehouse_id uuid not null references public.warehouses(id), type public.inventory_movement_type not null,
  quantity integer not null check (quantity <> 0), reference_id uuid, notes text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

do $$ begin
  create type public.transfer_status as enum ('draft','requested','approved','in_transit','received','rejected','cancelled');
exception when duplicate_object then null; end $$;
create table if not exists public.inventory_transfers (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  origin_warehouse_id uuid not null references public.warehouses(id),
  destination_warehouse_id uuid not null references public.warehouses(id),
  status public.transfer_status not null default 'draft', notes text,
  requested_by uuid references auth.users(id), approved_by uuid references auth.users(id),
  requested_at timestamptz, dispatched_at timestamptz, received_at timestamptz,
  created_at timestamptz not null default now(), check (origin_warehouse_id <> destination_warehouse_id)
);
create table if not exists public.inventory_transfer_items (
  transfer_id uuid not null references public.inventory_transfers(id) on delete cascade,
  product_id uuid not null references public.products(id), quantity_requested integer not null check (quantity_requested > 0),
  quantity_dispatched integer not null default 0 check (quantity_dispatched >= 0),
  quantity_received integer not null default 0 check (quantity_received >= 0), primary key (transfer_id, product_id)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(), code text not null unique, customer_id uuid references public.customers(id),
  service_id uuid, service_name text not null, technician_name text not null default '', warehouse_id uuid references public.warehouses(id),
  scheduled_at timestamptz, status text not null check (status in ('Pendiente','Confirmada','En Proceso','Completada','Cancelada')),
  estimated_duration_min integer not null default 60, notes text, price numeric(14,2) not null default 0
);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(), customer_id uuid references public.customers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, token text not null unique, platform text not null check (platform in ('ios','android','web')),
  active boolean not null default true, updated_at timestamptz not null default now(), check (customer_id is not null or user_id is not null)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), customer_id uuid references public.customers(id), title text not null, body text not null,
  event_type text not null, reference_id uuid, status text not null default 'pending' check (status in ('pending','sent','failed')),
  sent_at timestamptz, provider_response jsonb, created_at timestamptz not null default now()
);

-- A change of appointment status is queued; an Edge Function/webhook delivers
-- the push asynchronously, so sales/service updates never wait for FCM/APNs.
create or replace function public.queue_appointment_notification() returns trigger language plpgsql security definer as $$
begin
  if new.status is distinct from old.status and new.status in ('Completada', 'Cancelada') then
    insert into public.notifications (customer_id, title, body, event_type, reference_id)
    values (new.customer_id, 'Actualización de servicio',
      case when new.status = 'Completada' then 'Tu servicio fue completado.' else 'Tu servicio fue cancelado.' end,
      'appointment_status', new.id);
  end if;
  return new;
end; $$;
drop trigger if exists appointment_status_notification on public.appointments;
create trigger appointment_status_notification after update of status on public.appointments
for each row execute function public.queue_appointment_notification();

alter table public.warehouses enable row level security;
alter table public.customers enable row level security;
alter table public.motorcycles enable row level security;
alter table public.products enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_transfers enable row level security;
alter table public.inventory_transfer_items enable row level security;
alter table public.appointments enable row level security;
alter table public.device_tokens enable row level security;
alter table public.notifications enable row level security;

-- Replace this temporary authenticated-staff policy with role/warehouse-scoped
-- policies before production use.
create policy "authenticated staff access" on public.warehouses for all to authenticated using (true) with check (true);
create policy "authenticated staff access" on public.customers for all to authenticated using (true) with check (true);
create policy "authenticated staff access" on public.motorcycles for all to authenticated using (true) with check (true);
create policy "authenticated staff access" on public.products for all to authenticated using (true) with check (true);
create policy "authenticated staff access" on public.inventory_balances for all to authenticated using (true) with check (true);
create policy "authenticated staff access" on public.inventory_movements for all to authenticated using (true) with check (true);
create policy "authenticated staff access" on public.inventory_transfers for all to authenticated using (true) with check (true);
create policy "authenticated staff access" on public.inventory_transfer_items for all to authenticated using (true) with check (true);
create policy "authenticated staff access" on public.appointments for all to authenticated using (true) with check (true);
create policy "own device tokens" on public.device_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notifications" on public.notifications for select to authenticated using (customer_id in (select id from public.customers));
