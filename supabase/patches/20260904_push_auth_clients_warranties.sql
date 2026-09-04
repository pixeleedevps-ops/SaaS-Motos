-- Consolidación de Auth, clientes, citas, garantías y notificaciones Push (FCM).
-- Esta migración transforma la cola SMS histórica sin modificar migraciones aplicadas.

-- ---------------------------------------------------------------------------
-- 1. Perfiles de Auth y protección de roles
-- ---------------------------------------------------------------------------

create unique index if not exists usuarios_documento_unique
  on public.usuarios (lower(btrim(documento)))
  where nullif(btrim(documento), '') is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (
    id, nombre, apellido, email, telefono, documento, rol, activo
  ) values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    nullif(btrim(new.raw_user_meta_data ->> 'apellido'), ''),
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'telefono'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'documento'), ''),
    'cliente'::public.rol_usuario,
    true
  )
  on conflict (id) do update set
    nombre = excluded.nombre,
    apellido = excluded.apellido,
    email = excluded.email,
    telefono = excluded.telefono,
    documento = excluded.documento,
    updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.proteger_privilegios_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_es_service_role boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
  v_es_admin boolean := public.rol_actual() = 'admin'::public.rol_usuario;
begin
  if new.id is distinct from old.id then
    raise exception 'No se permite cambiar el identificador del usuario' using errcode = '42501';
  end if;

  -- El correo se sincroniza desde Auth mediante un proceso administrativo.
  if new.email is distinct from old.email and not v_es_service_role then
    raise exception 'El correo debe actualizarse mediante Supabase Auth' using errcode = '42501';
  end if;

  if (new.rol is distinct from old.rol
      or new.sede_id is distinct from old.sede_id
      or new.activo is distinct from old.activo)
     and not (v_es_service_role or v_es_admin) then
    raise exception 'No se permite modificar rol, sede o estado de la cuenta' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.proteger_privilegios_usuario() from public, anon, authenticated;

drop trigger if exists trg_usuarios_proteger_privilegios on public.usuarios;
create trigger trg_usuarios_proteger_privilegios
before update on public.usuarios
for each row execute function public.proteger_privilegios_usuario();

drop policy if exists usuarios_select_propio on public.usuarios;
create policy usuarios_select_propio on public.usuarios
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  );

drop policy if exists usuarios_update_propio on public.usuarios;
create policy usuarios_update_propio on public.usuarios
  for update to authenticated
  using (
    id = (select auth.uid())
    or (select public.rol_actual()) = 'admin'::public.rol_usuario
  )
  with check (
    id = (select auth.uid())
    or (select public.rol_actual()) = 'admin'::public.rol_usuario
  );

-- Triggers internos no deben estar disponibles como RPC.
alter function public.aplicar_movimiento_inventario() set search_path = '';
revoke all on function public.aplicar_movimiento_inventario() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Vehículos y citas persistentes
-- ---------------------------------------------------------------------------

alter table public.motos_clientes
  add column if not exists vin text,
  add column if not exists kilometraje integer,
  add column if not exists color text,
  add column if not exists activo boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.motos_clientes drop constraint if exists motos_clientes_kilometraje_check;
alter table public.motos_clientes add constraint motos_clientes_kilometraje_check
  check (kilometraje is null or kilometraje >= 0);

create unique index if not exists motos_clientes_placa_unique
  on public.motos_clientes (upper(btrim(placa)))
  where nullif(btrim(placa), '') is not null and activo;
create index if not exists motos_clientes_cliente_activo_idx
  on public.motos_clientes (cliente_id, activo);

drop trigger if exists trg_motos_clientes_updated_at on public.motos_clientes;
create trigger trg_motos_clientes_updated_at
before update on public.motos_clientes
for each row execute function public.set_updated_at();

drop policy if exists motos_select on public.motos_clientes;
create policy motos_select on public.motos_clientes
  for select to authenticated
  using (
    cliente_id = (select auth.uid())
    or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  );

drop policy if exists motos_insert on public.motos_clientes;
create policy motos_insert on public.motos_clientes
  for insert to authenticated
  with check (
    cliente_id = (select auth.uid())
    or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  );

drop policy if exists motos_update on public.motos_clientes;
create policy motos_update on public.motos_clientes
  for update to authenticated
  using (
    cliente_id = (select auth.uid())
    or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  )
  with check (
    cliente_id = (select auth.uid())
    or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  );

-- Se conserva historial: la UI desactiva vehículos en lugar de borrarlos.
drop policy if exists motos_delete on public.motos_clientes;

alter table public.citas
  add column if not exists estado_version integer not null default 0;

alter table public.citas drop constraint if exists citas_estado_version_check;
alter table public.citas add constraint citas_estado_version_check check (estado_version >= 0);
create index if not exists citas_empleado_fecha_idx on public.citas (empleado_id, fecha_hora);
create index if not exists citas_moto_fecha_idx on public.citas (moto_id, fecha_hora desc);

create or replace function public.versionar_estado_cita()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.estado is distinct from new.estado then
    new.estado_version := old.estado_version + 1;
  end if;
  return new;
end;
$$;

revoke all on function public.versionar_estado_cita() from public, anon, authenticated;

drop trigger if exists trg_citas_estado_version on public.citas;
create trigger trg_citas_estado_version
before update of estado on public.citas
for each row execute function public.versionar_estado_cita();

drop policy if exists citas_select on public.citas;
create policy citas_select on public.citas
  for select to authenticated
  using (
    cliente_id = (select auth.uid())
    or (select public.rol_actual()) = 'admin'::public.rol_usuario
    or (
      (select public.rol_actual()) = 'empleado'::public.rol_usuario
      and sede_id = (select public.sede_actual())
    )
  );

drop policy if exists citas_insert on public.citas;
create policy citas_insert on public.citas
  for insert to authenticated
  with check (
    cliente_id = (select auth.uid())
    or (select public.rol_actual()) = 'admin'::public.rol_usuario
    or (
      (select public.rol_actual()) = 'empleado'::public.rol_usuario
      and sede_id = (select public.sede_actual())
    )
  );

drop policy if exists citas_update on public.citas;
create policy citas_update on public.citas
  for update to authenticated
  using (
    (select public.rol_actual()) = 'admin'::public.rol_usuario
    or (
      (select public.rol_actual()) = 'empleado'::public.rol_usuario
      and sede_id = (select public.sede_actual())
    )
  )
  with check (
    (select public.rol_actual()) = 'admin'::public.rol_usuario
    or (
      (select public.rol_actual()) = 'empleado'::public.rol_usuario
      and sede_id = (select public.sede_actual())
    )
  );

-- Búsqueda acotada para autocompletado; respeta RLS por ser invoker.
create or replace function public.buscar_clientes(p_query text, p_limit integer default 15)
returns table (
  id uuid,
  nombre text,
  apellido text,
  email text,
  telefono text,
  documento text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select u.id, u.nombre, u.apellido, u.email, u.telefono, u.documento
  from public.usuarios u
  where u.rol = 'cliente'::public.rol_usuario
    and u.activo
    and (
      coalesce(p_query, '') = ''
      or concat_ws(' ', u.nombre, u.apellido) ilike '%' || btrim(p_query) || '%'
      or coalesce(u.documento, '') ilike '%' || btrim(p_query) || '%'
      or coalesce(u.telefono, '') ilike '%' || btrim(p_query) || '%'
      or u.email ilike '%' || btrim(p_query) || '%'
    )
  order by u.nombre, u.apellido
  limit least(greatest(coalesce(p_limit, 15), 1), 50);
$$;

revoke all on function public.buscar_clientes(text, integer) from public, anon;
grant execute on function public.buscar_clientes(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Reemplazo definitivo de la cola SMS por FCM Push
-- ---------------------------------------------------------------------------

drop trigger if exists trg_citas_encolar_sms_completada on public.citas;
drop function if exists public.encolar_sms_cita_completada();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  service_id uuid references public.servicios(id) on delete set null,
  appointment_id uuid references public.citas(id) on delete cascade,
  event_id text not null unique,
  type text not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  read_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  processing_started_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  error_message text,
  provider_message_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conserva únicamente el significado de filas históricas, nunca el canal SMS.
insert into public.notifications (
  id, user_id, service_id, appointment_id, event_id, type, title, message,
  status, attempts, sent_at, failed_at, error_message, created_at, updated_at
)
select
  n.id, n.cliente_id, n.servicio_id, n.cita_id,
  'legacy-appointment:' || n.cita_id::text,
  'appointment_status_changed', 'Actualización de tu servicio', n.mensaje,
  case
    when n.estado = 'enviada' then 'sent'
    when n.estado = 'error' then 'failed'
    else 'pending'
  end,
  n.intentos, n.enviada_at,
  case when n.estado = 'error' then n.updated_at else null end,
  n.ultimo_error, n.created_at, n.updated_at
from public.notificaciones n
on conflict (event_id) do nothing;

-- La tabla anterior se conserva como archivo sin acceso desde la Data API. No
-- queda conectada a triggers ni al flujo activo de notificaciones.
alter table public.notificaciones rename to notificaciones_sms_archivo;
revoke all on table public.notificaciones_sms_archivo from public, anon, authenticated;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_pending_idx
  on public.notifications (created_at)
  where status in ('pending', 'failed');
create index if not exists notifications_appointment_idx
  on public.notifications (appointment_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own_or_staff on public.notifications;
create policy notifications_select_own_or_staff on public.notifications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  );

drop policy if exists notifications_mark_read_own on public.notifications;
create policy notifications_mark_read_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('web', 'android', 'ios')),
  device_identifier text,
  active boolean not null default true,
  failure_count integer not null default 0 check (failure_count >= 0),
  last_error text,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_active_idx
  on public.push_subscriptions (user_id, active);
create index if not exists push_subscriptions_stale_idx
  on public.push_subscriptions (last_used_at)
  where active;

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.push_subscriptions from public, anon;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.encolar_push_estado_cita()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := 'Actualización de tu servicio';
  v_message text;
  v_service_name text;
  v_version integer;
begin
  if tg_op = 'UPDATE' and old.estado is not distinct from new.estado then
    return new;
  end if;

  select s.nombre into v_service_name
  from public.servicios s
  where s.id = new.servicio_id;

  v_version := case when tg_op = 'INSERT' then 0 else new.estado_version end;
  v_message := case new.estado::text
    when 'pendiente' then 'Tu cita para ' || v_service_name || ' se encuentra pendiente.'
    when 'confirmada' then 'Tu cita para ' || v_service_name || ' fue confirmada.'
    when 'en_proceso' then 'Tu servicio ' || v_service_name || ' se encuentra en proceso.'
    when 'completada' then 'Tu servicio ' || v_service_name || ' fue completado.'
    when 'cancelada' then 'Tu cita para ' || v_service_name || ' fue cancelada.'
    else 'El estado de tu servicio fue actualizado.'
  end;

  insert into public.notifications (
    user_id, service_id, appointment_id, event_id, type, title, message, data
  ) values (
    new.cliente_id,
    new.servicio_id,
    new.id,
    'appointment:' || new.id::text || ':status:' || v_version::text,
    'appointment_status_changed',
    v_title,
    v_message,
    jsonb_build_object(
      'appointment_id', new.id,
      'service_id', new.servicio_id,
      'status', new.estado::text,
      'url', '/?view=appointments&appointmentId=' || new.id::text
    )
  )
  on conflict (event_id) do nothing;

  return new;
end;
$$;

revoke all on function public.encolar_push_estado_cita() from public, anon, authenticated;

drop trigger if exists trg_citas_encolar_push on public.citas;
create trigger trg_citas_encolar_push
after insert or update of estado on public.citas
for each row execute function public.encolar_push_estado_cita();

create or replace function public.claim_push_notification(p_notification_id uuid)
returns setof public.notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.notifications n
  set status = 'processing',
      attempts = n.attempts + 1,
      processing_started_at = now(),
      failed_at = null,
      error_message = null
  where n.id = p_notification_id
    and n.attempts < 5
    and (
      n.status in ('pending', 'failed')
      or (n.status = 'processing' and n.processing_started_at < now() - interval '10 minutes')
    )
  returning n.*;
end;
$$;

revoke all on function public.claim_push_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_push_notification(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Compras/facturas y garantías estructuradas
-- ---------------------------------------------------------------------------

alter table public.productos
  add column if not exists garantia_duracion integer,
  add column if not exists garantia_unidad text;
alter table public.productos drop constraint if exists productos_garantia_check;
alter table public.productos add constraint productos_garantia_check
  check (
    (garantia_duracion is null and garantia_unidad is null)
    or (garantia_duracion > 0 and garantia_unidad in ('dias', 'meses', 'anios'))
  );

alter table public.servicios
  add column if not exists garantia_duracion integer,
  add column if not exists garantia_unidad text;
alter table public.servicios drop constraint if exists servicios_garantia_check;
alter table public.servicios add constraint servicios_garantia_check
  check (
    (garantia_duracion is null and garantia_unidad is null)
    or (garantia_duracion > 0 and garantia_unidad in ('dias', 'meses', 'anios'))
  );

create sequence if not exists public.garantias_numero_seq start 1;

create table if not exists public.garantias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default (
    'GAR-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.garantias_numero_seq')::text, 6, '0')
  ),
  factura_id uuid not null references public.facturas(id) on delete cascade,
  factura_item_id uuid references public.factura_items(id) on delete cascade,
  factura_servicio_id uuid references public.factura_servicios(id) on delete cascade,
  cliente_id uuid not null references public.usuarios(id),
  producto_id uuid references public.productos(id) on delete set null,
  servicio_id uuid references public.servicios(id) on delete set null,
  tipo text not null check (tipo in ('product', 'service')),
  item_nombre text not null,
  sku text,
  item_precio numeric(14,2) not null default 0 check (item_precio >= 0),
  cantidad integer not null default 1 check (cantidad > 0),
  duracion integer not null check (duracion > 0),
  unidad text not null check (unidad in ('dias', 'meses', 'anios')),
  fecha_inicio date not null,
  fecha_fin date not null,
  utilizada_at timestamptz,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio),
  check (
    (tipo = 'product' and factura_servicio_id is null)
    or (tipo = 'service' and factura_item_id is null)
  )
);

create unique index if not exists garantias_factura_item_unique
  on public.garantias (factura_item_id) where factura_item_id is not null;
create unique index if not exists garantias_factura_servicio_unique
  on public.garantias (factura_servicio_id) where factura_servicio_id is not null;
create index if not exists garantias_cliente_fecha_idx
  on public.garantias (cliente_id, fecha_fin desc);
create index if not exists garantias_vigencia_idx
  on public.garantias (fecha_fin) where utilizada_at is null;

alter table public.garantias enable row level security;

create policy garantias_select on public.garantias
  for select to authenticated
  using (
    cliente_id = (select auth.uid())
    or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  );

revoke all on table public.garantias from public, anon, authenticated;
grant select on table public.garantias to authenticated;
grant all on table public.garantias to service_role;

drop trigger if exists trg_garantias_updated_at on public.garantias;
create trigger trg_garantias_updated_at
before update on public.garantias
for each row execute function public.set_updated_at();

create table if not exists public.reclamaciones_garantia (
  id uuid primary key default gen_random_uuid(),
  garantia_id uuid not null references public.garantias(id) on delete cascade,
  codigo text not null unique,
  motivo text not null,
  descripcion text not null,
  estado text not null default 'en_revision'
    check (estado in ('en_revision', 'aprobada', 'en_reparacion', 'finalizada', 'rechazada')),
  tecnico_id uuid references public.empleados(id) on delete set null,
  resolucion text,
  costo_cubierto numeric(14,2) not null default 0 check (costo_cubierto >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reclamaciones_garantia_fecha_idx
  on public.reclamaciones_garantia (garantia_id, created_at desc);
alter table public.reclamaciones_garantia enable row level security;

create policy reclamaciones_select on public.reclamaciones_garantia
  for select to authenticated
  using (
    exists (
      select 1 from public.garantias g
      where g.id = reclamaciones_garantia.garantia_id
        and (
          g.cliente_id = (select auth.uid())
          or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
        )
    )
  );

create policy reclamaciones_insert on public.reclamaciones_garantia
  for insert to authenticated
  with check (
    exists (
      select 1 from public.garantias g
      where g.id = reclamaciones_garantia.garantia_id
        and (
          g.cliente_id = (select auth.uid())
          or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
        )
    )
  );

create policy reclamaciones_update_staff on public.reclamaciones_garantia
  for update to authenticated
  using ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario))
  with check ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario));

revoke all on table public.reclamaciones_garantia from public, anon;
grant select, insert on table public.reclamaciones_garantia to authenticated;
grant update (estado, tecnico_id, resolucion, costo_cubierto) on table public.reclamaciones_garantia to authenticated;
grant all on table public.reclamaciones_garantia to service_role;

drop trigger if exists trg_reclamaciones_garantia_updated_at on public.reclamaciones_garantia;
create trigger trg_reclamaciones_garantia_updated_at
before update on public.reclamaciones_garantia
for each row execute function public.set_updated_at();

create or replace function public.fecha_fin_garantia(
  p_fecha date,
  p_duracion integer,
  p_unidad text
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_unidad
    when 'dias' then p_fecha + p_duracion
    when 'meses' then (p_fecha + make_interval(months => p_duracion))::date
    when 'anios' then (p_fecha + make_interval(years => p_duracion))::date
    else null
  end;
$$;

revoke all on function public.fecha_fin_garantia(date, integer, text) from public, anon;
grant execute on function public.fecha_fin_garantia(date, integer, text) to authenticated, service_role;

create or replace function public.crear_garantia_item_factura()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_factura record;
  v_producto record;
begin
  select f.cliente_id, f.fecha into v_factura
  from public.facturas f where f.id = new.factura_id;

  select p.id, p.garantia_duracion, p.garantia_unidad into v_producto
  from public.variantes_producto vp
  join public.productos p on p.id = vp.producto_id
  where vp.id = new.variante_id;

  if v_producto.garantia_duracion is not null then
    insert into public.garantias (
      factura_id, factura_item_id, cliente_id, producto_id, tipo, item_nombre,
      sku, item_precio, cantidad, duracion, unidad, fecha_inicio, fecha_fin
    ) values (
      new.factura_id, new.id, v_factura.cliente_id, v_producto.id, 'product',
      new.nombre_producto, new.sku, new.precio_unitario, new.cantidad,
      v_producto.garantia_duracion, v_producto.garantia_unidad, v_factura.fecha,
      public.fecha_fin_garantia(v_factura.fecha, v_producto.garantia_duracion, v_producto.garantia_unidad)
    ) on conflict (factura_item_id) where factura_item_id is not null do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.crear_garantia_item_factura() from public, anon, authenticated;

create or replace function public.crear_garantia_servicio_factura()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_factura record;
  v_servicio record;
begin
  select f.cliente_id, f.fecha into v_factura
  from public.facturas f where f.id = new.factura_id;
  select s.id, s.garantia_duracion, s.garantia_unidad into v_servicio
  from public.servicios s where s.id = new.servicio_id;

  if v_servicio.garantia_duracion is not null then
    insert into public.garantias (
      factura_id, factura_servicio_id, cliente_id, servicio_id, tipo, item_nombre,
      item_precio, cantidad, duracion, unidad, fecha_inicio, fecha_fin
    ) values (
      new.factura_id, new.id, v_factura.cliente_id, v_servicio.id, 'service',
      new.nombre_servicio, new.precio_unitario, new.cantidad,
      v_servicio.garantia_duracion, v_servicio.garantia_unidad, v_factura.fecha,
      public.fecha_fin_garantia(v_factura.fecha, v_servicio.garantia_duracion, v_servicio.garantia_unidad)
    ) on conflict (factura_servicio_id) where factura_servicio_id is not null do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.crear_garantia_servicio_factura() from public, anon, authenticated;

drop trigger if exists trg_factura_items_crear_garantia on public.factura_items;
create trigger trg_factura_items_crear_garantia
after insert on public.factura_items
for each row execute function public.crear_garantia_item_factura();

drop trigger if exists trg_factura_servicios_crear_garantia on public.factura_servicios;
create trigger trg_factura_servicios_crear_garantia
after insert on public.factura_servicios
for each row execute function public.crear_garantia_servicio_factura();

create or replace function public.registrar_garantia_manual(
  p_factura_id uuid,
  p_tipo text,
  p_item_nombre text,
  p_sku text,
  p_item_precio numeric,
  p_cantidad integer,
  p_duracion integer,
  p_unidad text,
  p_notas text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_factura record;
  v_id uuid;
begin
  if public.rol_actual() not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No autorizado para registrar garantías' using errcode = '42501';
  end if;
  if p_tipo not in ('product', 'service') or p_duracion <= 0 or p_unidad not in ('dias', 'meses', 'anios') then
    raise exception 'Datos de garantía inválidos';
  end if;
  select f.cliente_id, f.fecha, f.sede_id into v_factura
  from public.facturas f where f.id = p_factura_id;
  if not found then raise exception 'Factura no encontrada'; end if;
  if public.rol_actual() = 'empleado'::public.rol_usuario
     and v_factura.sede_id is distinct from public.sede_actual() then
    raise exception 'Un empleado solo puede registrar garantías de su sede' using errcode = '42501';
  end if;

  insert into public.garantias (
    factura_id, cliente_id, tipo, item_nombre, sku, item_precio, cantidad,
    duracion, unidad, fecha_inicio, fecha_fin, notas
  ) values (
    p_factura_id, v_factura.cliente_id, p_tipo, btrim(p_item_nombre), nullif(btrim(p_sku), ''),
    greatest(coalesce(p_item_precio, 0), 0), greatest(coalesce(p_cantidad, 1), 1),
    p_duracion, p_unidad, v_factura.fecha,
    public.fecha_fin_garantia(v_factura.fecha, p_duracion, p_unidad),
    nullif(btrim(p_notas), '')
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.registrar_garantia_manual(uuid,text,text,text,numeric,integer,integer,text,text) from public, anon;
grant execute on function public.registrar_garantia_manual(uuid,text,text,text,numeric,integer,integer,text,text) to authenticated;

-- Garantías demostrativas vinculadas a facturas reales, con vigencia estructurada.
insert into public.garantias (
  factura_id, factura_servicio_id, cliente_id, servicio_id, tipo, item_nombre,
  item_precio, cantidad, duracion, unidad, fecha_inicio, fecha_fin, notas
)
select
  f.id, fs.id, f.cliente_id, fs.servicio_id, 'service', fs.nombre_servicio,
  fs.precio_unitario, fs.cantidad, 3, 'meses', f.fecha,
  public.fecha_fin_garantia(f.fecha, 3, 'meses'),
  'Garantía de demostración vinculada a una factura persistente.'
from public.facturas f
join public.factura_servicios fs on fs.factura_id = f.id
where f.numero_factura like 'DEMO-FAC-%'
on conflict (factura_servicio_id) where factura_servicio_id is not null do nothing;
