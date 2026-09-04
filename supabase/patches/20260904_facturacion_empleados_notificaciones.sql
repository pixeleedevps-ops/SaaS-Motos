-- Facturación persistente, catálogo de empleados y cola de SMS al completar citas.
-- Diseñado para el esquema público en español ya existente.

-- Un empleado puede existir en el catálogo antes de recibir una cuenta de acceso.
alter table public.empleados alter column usuario_id drop not null;
alter table public.empleados
  add column if not exists nombre text,
  add column if not exists apellido text,
  add column if not exists email text,
  add column if not exists telefono text,
  add column if not exists documento text;

alter table public.empleados drop constraint if exists empleados_identidad_check;
alter table public.empleados
  add constraint empleados_identidad_check
  check (usuario_id is not null or nullif(btrim(nombre), '') is not null);

create unique index if not exists empleados_email_unique
  on public.empleados (lower(email)) where email is not null;
create unique index if not exists empleados_documento_unique
  on public.empleados (documento) where documento is not null;
create index if not exists empleados_sede_activo_idx
  on public.empleados (sede_id, activo);

drop policy if exists empleados_select_staff on public.empleados;
create policy empleados_select_staff on public.empleados
  for select to authenticated
  using (public.rol_actual() in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario));

drop policy if exists empleados_insert_admin on public.empleados;
create policy empleados_insert_admin on public.empleados
  for insert to authenticated
  with check (public.rol_actual() = 'admin'::public.rol_usuario);

drop policy if exists empleados_update_admin on public.empleados;
create policy empleados_update_admin on public.empleados
  for update to authenticated
  using (public.rol_actual() = 'admin'::public.rol_usuario)
  with check (public.rol_actual() = 'admin'::public.rol_usuario);

drop policy if exists empleados_delete_admin on public.empleados;
create policy empleados_delete_admin on public.empleados
  for delete to authenticated
  using (public.rol_actual() = 'admin'::public.rol_usuario);

-- La cabecera conserva los datos visibles al momento de emitir la factura.
alter table public.facturas
  add column if not exists cliente_nombre text,
  add column if not exists cliente_documento text,
  add column if not exists cliente_email text,
  add column if not exists cliente_telefono text,
  add column if not exists cliente_direccion text,
  add column if not exists moto_placa text,
  add column if not exists moto_modelo text,
  add column if not exists empleado_nombre text,
  add column if not exists fecha_vencimiento date,
  add column if not exists metodo_pago text not null default 'Efectivo',
  add column if not exists estado text not null default 'pagada',
  add column if not exists notas text,
  add column if not exists descuento_total numeric(14,2) not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.facturas drop constraint if exists facturas_estado_check;
alter table public.facturas add constraint facturas_estado_check
  check (estado in ('pagada', 'pendiente', 'anulada', 'borrador'));
alter table public.facturas drop constraint if exists facturas_totales_check;
alter table public.facturas add constraint facturas_totales_check
  check (subtotal >= 0 and impuestos >= 0 and total >= 0 and descuento_total >= 0);

create index if not exists facturas_cliente_fecha_idx on public.facturas (cliente_id, fecha desc);
create index if not exists facturas_sede_estado_fecha_idx on public.facturas (sede_id, estado, fecha desc);

alter table public.factura_items
  add column if not exists sku text,
  add column if not exists descuento_porcentaje numeric(5,2) not null default 0;
alter table public.factura_items drop constraint if exists factura_items_descuento_check;
alter table public.factura_items add constraint factura_items_descuento_check
  check (descuento_porcentaje between 0 and 100 and precio_unitario >= 0 and subtotal >= 0);

alter table public.factura_servicios
  add column if not exists cantidad integer not null default 1,
  add column if not exists precio_unitario numeric(14,2),
  add column if not exists descuento_porcentaje numeric(5,2) not null default 0,
  add column if not exists subtotal numeric(14,2);

update public.factura_servicios
set precio_unitario = coalesce(precio_unitario, precio),
    subtotal = coalesce(subtotal, precio)
where precio_unitario is null or subtotal is null;

alter table public.factura_servicios alter column precio_unitario set not null;
alter table public.factura_servicios alter column subtotal set not null;
alter table public.factura_servicios drop constraint if exists factura_servicios_valores_check;
alter table public.factura_servicios add constraint factura_servicios_valores_check
  check (cantidad > 0 and precio_unitario >= 0 and subtotal >= 0 and descuento_porcentaje between 0 and 100);

drop policy if exists factura_servicios_select on public.factura_servicios;
create policy factura_servicios_select on public.factura_servicios
  for select to authenticated
  using (
    exists (
      select 1 from public.facturas f
      where f.id = factura_servicios.factura_id
        and (f.cliente_id = auth.uid() or public.rol_actual() = 'admin'::public.rol_usuario or f.sede_id = public.sede_actual())
    )
  );

drop trigger if exists trg_facturas_updated_at on public.facturas;
create trigger trg_facturas_updated_at
before update on public.facturas
for each row execute function public.set_updated_at();

create sequence if not exists public.facturas_numero_seq start 1;

create or replace function public.crear_factura(
  p_cliente_id uuid,
  p_sede_id uuid,
  p_fecha_vencimiento date,
  p_metodo_pago text,
  p_estado text,
  p_notas text,
  p_cliente_nombre text,
  p_cliente_documento text,
  p_cliente_email text,
  p_cliente_telefono text,
  p_cliente_direccion text,
  p_moto_placa text,
  p_moto_modelo text,
  p_tasa_impuesto numeric,
  p_items jsonb
)
returns table (id uuid, numero_factura text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_factura_id uuid;
  v_numero text;
  v_item jsonb;
  v_subtotal numeric(14,2) := 0;
  v_descuento numeric(14,2) := 0;
  v_impuestos numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_empleado_nombre text;
begin
  if public.rol_actual() not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No autorizado para emitir facturas' using errcode = '42501';
  end if;
  if not exists (select 1 from public.usuarios u where u.id = p_cliente_id) then
    raise exception 'El cliente no existe';
  end if;
  if not exists (select 1 from public.sedes s where s.id = p_sede_id and s.activo) then
    raise exception 'La sede no existe o está inactiva';
  end if;
  if p_estado not in ('pagada', 'pendiente', 'borrador') then
    raise exception 'Estado inicial de factura inválido';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La factura requiere al menos un concepto';
  end if;

  select concat_ws(' ', u.nombre, u.apellido) into v_empleado_nombre
  from public.usuarios u where u.id = auth.uid();

  select
    coalesce(sum((item->>'total')::numeric), 0),
    coalesce(sum(greatest(((item->>'quantity')::numeric * (item->>'unitPrice')::numeric) - (item->>'total')::numeric, 0)), 0)
  into v_subtotal, v_descuento
  from jsonb_array_elements(p_items) item;

  v_impuestos := round(v_subtotal * greatest(coalesce(p_tasa_impuesto, 0), 0) / 100, 2);
  v_total := v_subtotal + v_impuestos;
  v_numero := 'FAC-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.facturas_numero_seq')::text, 6, '0');

  insert into public.facturas (
    numero_factura, cliente_id, empleado_id, sede_id, fecha, fecha_vencimiento,
    subtotal, impuestos, total, descuento_total, metodo_pago, estado, notas,
    cliente_nombre, cliente_documento, cliente_email, cliente_telefono,
    cliente_direccion, moto_placa, moto_modelo, empleado_nombre
  ) values (
    v_numero, p_cliente_id, auth.uid(), p_sede_id, current_date, p_fecha_vencimiento,
    v_subtotal, v_impuestos, v_total, v_descuento, p_metodo_pago, p_estado, nullif(btrim(p_notas), ''),
    p_cliente_nombre, p_cliente_documento, p_cliente_email, p_cliente_telefono,
    p_cliente_direccion, p_moto_placa, p_moto_modelo, v_empleado_nombre
  ) returning facturas.id into v_factura_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'type', '') = 'service' then
      insert into public.factura_servicios (
        factura_id, servicio_id, nombre_servicio, precio, cantidad,
        precio_unitario, descuento_porcentaje, subtotal
      ) values (
        v_factura_id,
        case when nullif(v_item->>'referenceId', '') is null then null else (v_item->>'referenceId')::uuid end,
        v_item->>'description', (v_item->>'total')::numeric,
        greatest((v_item->>'quantity')::integer, 1), (v_item->>'unitPrice')::numeric,
        coalesce((v_item->>'discountPercent')::numeric, 0), (v_item->>'total')::numeric
      );
    else
      insert into public.factura_items (
        factura_id, variante_id, nombre_producto, cantidad, precio_unitario,
        subtotal, sku, descuento_porcentaje
      ) values (
        v_factura_id,
        case when nullif(v_item->>'referenceId', '') is null then null else (v_item->>'referenceId')::uuid end,
        v_item->>'description', greatest((v_item->>'quantity')::integer, 1),
        (v_item->>'unitPrice')::numeric, (v_item->>'total')::numeric,
        nullif(v_item->>'sku', ''), coalesce((v_item->>'discountPercent')::numeric, 0)
      );
    end if;
  end loop;

  return query select v_factura_id, v_numero;
end;
$$;

revoke all on function public.crear_factura(uuid,uuid,date,text,text,text,text,text,text,text,text,text,text,numeric,jsonb) from public;
grant execute on function public.crear_factura(uuid,uuid,date,text,text,text,text,text,text,text,text,text,text,numeric,jsonb) to authenticated;

create or replace function public.actualizar_estado_factura(p_factura_id uuid, p_estado text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.rol_actual() not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No autorizado para modificar facturas' using errcode = '42501';
  end if;
  if p_estado not in ('pagada', 'pendiente', 'anulada', 'borrador') then
    raise exception 'Estado de factura inválido';
  end if;
  update public.facturas set estado = p_estado where facturas.id = p_factura_id;
  if not found then raise exception 'Factura no encontrada'; end if;
end;
$$;

revoke all on function public.actualizar_estado_factura(uuid,text) from public;
grant execute on function public.actualizar_estado_factura(uuid,text) to authenticated;

-- Outbox auditable: el trigger obtiene teléfono y servicio desde las llaves de la cita.
create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.citas(id) on delete cascade,
  cliente_id uuid not null references public.usuarios(id) on delete cascade,
  servicio_id uuid not null references public.servicios(id),
  estado_nuevo public.estado_cita not null,
  telefono text,
  servicio_nombre text not null,
  mensaje text not null,
  canal text not null default 'sms' check (canal in ('sms')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviando', 'enviada', 'error', 'sin_telefono')),
  proveedor text,
  proveedor_id text,
  intentos integer not null default 0 check (intentos >= 0),
  ultimo_error text,
  enviada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cita_id)
);

alter table public.notificaciones enable row level security;
create index if not exists notificaciones_estado_created_idx on public.notificaciones (estado, created_at);
create index if not exists notificaciones_cliente_created_idx on public.notificaciones (cliente_id, created_at desc);

drop policy if exists notificaciones_select on public.notificaciones;
create policy notificaciones_select on public.notificaciones
  for select to authenticated
  using (
    cliente_id = auth.uid()
    or public.rol_actual() in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  );

drop policy if exists notificaciones_update_staff on public.notificaciones;
create policy notificaciones_update_staff on public.notificaciones
  for update to authenticated
  using (public.rol_actual() in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario))
  with check (public.rol_actual() in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario));

drop trigger if exists trg_notificaciones_updated_at on public.notificaciones;
create trigger trg_notificaciones_updated_at
before update on public.notificaciones
for each row execute function public.set_updated_at();

create or replace function public.encolar_sms_cita_completada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_telefono text;
  v_servicio_nombre text;
begin
  if new.estado = 'completada'::public.estado_cita
     and old.estado is distinct from new.estado then
    select u.telefono, s.nombre
      into v_telefono, v_servicio_nombre
    from public.usuarios u
    join public.servicios s on s.id = new.servicio_id
    where u.id = new.cliente_id;

    insert into public.notificaciones (
      cita_id, cliente_id, servicio_id, estado_nuevo, telefono,
      servicio_nombre, mensaje, estado
    ) values (
      new.id, new.cliente_id, new.servicio_id, new.estado, nullif(btrim(v_telefono), ''),
      v_servicio_nombre,
      'MotoPro informa: tu servicio "' || v_servicio_nombre || '" ha sido completado. Ya puedes comunicarte con la sede para coordinar la entrega.',
      case when nullif(btrim(v_telefono), '') is null then 'sin_telefono' else 'pendiente' end
    ) on conflict (cita_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_citas_encolar_sms_completada on public.citas;
create trigger trg_citas_encolar_sms_completada
after update of estado on public.citas
for each row execute function public.encolar_sms_cita_completada();

-- Catálogo de demostración sin cuentas falsas de Authentication.
insert into public.empleados (nombre, apellido, email, telefono, documento, cargo, sede_id, fecha_contratacion, activo)
select demo.nombre, demo.apellido, demo.email, demo.telefono, demo.documento, demo.cargo, sede.id, demo.fecha_contratacion, true
from (values
  ('Marcos', 'Silva', 'marcos.silva@demo.motopro.co', '+57 300 555 0101', 'DEMO-EMP-001', 'Técnico mecánico principal', '1ero de mayo', date '2024-01-15'),
  ('David', 'Morales', 'david.morales@demo.motopro.co', '+57 300 555 0102', 'DEMO-EMP-002', 'Técnico mecánico', '1ero de mayo', date '2024-03-04'),
  ('Carlos Arturo', 'Ruiz', 'carlos.ruiz@demo.motopro.co', '+57 300 555 0103', 'DEMO-EMP-003', 'Electricista e inyección', '7 de agosto', date '2023-08-21'),
  ('Roberto', 'Gómez', 'roberto.gomez@demo.motopro.co', '+57 300 555 0104', 'DEMO-EMP-004', 'Especialista en neumáticos', '7 de agosto', date '2024-06-10'),
  ('Natalia', 'Rojas', 'natalia.rojas@demo.motopro.co', '+57 300 555 0105', 'DEMO-EMP-005', 'Asesora de servicio', 'Bodega', date '2025-02-03')
) as demo(nombre, apellido, email, telefono, documento, cargo, sede_nombre, fecha_contratacion)
join public.sedes sede on lower(sede.nombre) = lower(demo.sede_nombre)
where not exists (select 1 from public.empleados e where e.documento = demo.documento);

-- Historial demostrativo. Usa un usuario real existente como FK y congela los datos visibles.
do $$
declare
  v_cliente public.usuarios%rowtype;
  v_sede uuid;
  v_servicio record;
  v_factura uuid;
  v_numero text;
  v_estado text;
  v_dias integer;
begin
  select * into v_cliente from public.usuarios order by created_at limit 1;
  select id into v_sede from public.sedes where activo order by nombre limit 1;
  if v_cliente.id is null or v_sede is null then return; end if;

  for v_servicio in
    select id, nombre, precio, row_number() over (order by nombre) as posicion
    from public.servicios where activo order by nombre limit 4
  loop
    v_numero := 'DEMO-FAC-000' || v_servicio.posicion;
    v_estado := case when v_servicio.posicion = 2 then 'pendiente' when v_servicio.posicion = 4 then 'anulada' else 'pagada' end;
    v_dias := (v_servicio.posicion * 9)::integer;
    insert into public.facturas (
      numero_factura, cliente_id, empleado_id, sede_id, fecha, hora,
      fecha_vencimiento, subtotal, impuestos, total, descuento_total,
      metodo_pago, estado, notas, cliente_nombre, cliente_documento,
      cliente_email, cliente_telefono, cliente_direccion, moto_placa,
      moto_modelo, empleado_nombre
    ) values (
      v_numero, v_cliente.id, v_cliente.id, v_sede, current_date - v_dias,
      time '10:00', current_date - v_dias + 15, v_servicio.precio,
      round(v_servicio.precio * 0.19, 2), round(v_servicio.precio * 1.19, 2), 0,
      case when v_servicio.posicion = 2 then 'Transferencia' else 'Efectivo' end,
      v_estado, 'Factura de demostración para validar el historial y sus estados.',
      concat_ws(' ', v_cliente.nombre, v_cliente.apellido), v_cliente.documento,
      v_cliente.email, v_cliente.telefono, 'Datos de demostración',
      'DEM-01A', 'Motocicleta de demostración', concat_ws(' ', v_cliente.nombre, v_cliente.apellido)
    ) on conflict (numero_factura) do nothing
    returning id into v_factura;

    if v_factura is null then
      select id into v_factura from public.facturas where numero_factura = v_numero;
    end if;
    insert into public.factura_servicios (
      factura_id, servicio_id, nombre_servicio, precio, cantidad,
      precio_unitario, descuento_porcentaje, subtotal
    ) select v_factura, v_servicio.id, v_servicio.nombre, v_servicio.precio,
      1, v_servicio.precio, 0, v_servicio.precio
    where not exists (
      select 1 from public.factura_servicios fs
      where fs.factura_id = v_factura and fs.servicio_id = v_servicio.id
    );
    v_factura := null;
  end loop;
end $$;
