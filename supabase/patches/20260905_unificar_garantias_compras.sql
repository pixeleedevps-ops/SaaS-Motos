-- Relaciona cada servicio facturado con su cita real y expone una lectura
-- unificada y protegida por las políticas RLS de las tablas de origen.

alter table public.factura_servicios
  add column if not exists cita_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'factura_servicios_cita_id_fkey'
      and conrelid = 'public.factura_servicios'::regclass
  ) then
    alter table public.factura_servicios
      add constraint factura_servicios_cita_id_fkey
      foreign key (cita_id) references public.citas(id) on delete set null;
  end if;
end;
$$;

create index if not exists factura_servicios_cita_id_idx
  on public.factura_servicios (cita_id)
  where cita_id is not null;

alter table public.factura_items
  add column if not exists fecha_vencimiento_garantia date;

alter table public.citas
  add column if not exists fecha_proxima_revision date;

create index if not exists factura_items_garantia_vigencia_idx
  on public.factura_items (fecha_vencimiento_garantia)
  where fecha_vencimiento_garantia is not null;

create index if not exists citas_proxima_revision_idx
  on public.citas (fecha_proxima_revision)
  where fecha_proxima_revision is not null;

create or replace function public.preparar_garantia_item_factura()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_fecha date;
  v_duracion integer;
  v_unidad text;
begin
  select f.fecha, p.garantia_duracion, p.garantia_unidad
    into v_fecha, v_duracion, v_unidad
  from public.facturas f
  join public.variantes_producto vp on vp.id = new.variante_id
  join public.productos p on p.id = vp.producto_id
  where f.id = new.factura_id;

  if found and v_duracion is not null and v_unidad is not null then
    new.fecha_vencimiento_garantia := public.fecha_fin_garantia(v_fecha, v_duracion, v_unidad);
  else
    new.fecha_vencimiento_garantia := null;
  end if;

  return new;
end;
$$;

revoke all on function public.preparar_garantia_item_factura() from public, anon, authenticated;

drop trigger if exists trg_factura_items_preparar_garantia on public.factura_items;
create trigger trg_factura_items_preparar_garantia
before insert or update of factura_id, variante_id on public.factura_items
for each row execute function public.preparar_garantia_item_factura();

create or replace function public.preparar_revision_cita()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_duracion integer;
  v_unidad text;
begin
  if new.estado = 'completada'::public.estado_cita then
    select s.garantia_duracion, s.garantia_unidad
      into v_duracion, v_unidad
    from public.servicios s
    where s.id = new.servicio_id;

    if v_duracion is not null and v_unidad is not null then
      new.fecha_proxima_revision := public.fecha_fin_garantia(
        new.fecha_hora::date,
        v_duracion,
        v_unidad
      );
    else
      new.fecha_proxima_revision := null;
    end if;
  else
    new.fecha_proxima_revision := null;
  end if;

  return new;
end;
$$;

revoke all on function public.preparar_revision_cita() from public, anon, authenticated;

drop trigger if exists trg_citas_preparar_revision on public.citas;
create trigger trg_citas_preparar_revision
before insert or update of estado, servicio_id, fecha_hora on public.citas
for each row execute function public.preparar_revision_cita();

create or replace function public.validar_factura_servicio_cita()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cita record;
  v_factura record;
begin
  if new.cita_id is null then
    return new;
  end if;

  select c.cliente_id, c.sede_id, c.servicio_id, c.estado
    into v_cita
  from public.citas c
  where c.id = new.cita_id;

  if not found then
    raise exception 'La cita asociada no existe' using errcode = '23503';
  end if;

  select f.cliente_id, f.sede_id
    into v_factura
  from public.facturas f
  where f.id = new.factura_id;

  if not found then
    raise exception 'La factura asociada no existe' using errcode = '23503';
  end if;

  if v_cita.servicio_id is distinct from new.servicio_id then
    raise exception 'El servicio facturado no corresponde al servicio de la cita' using errcode = '23514';
  end if;

  if v_cita.cliente_id is distinct from v_factura.cliente_id then
    raise exception 'La cita y la factura pertenecen a clientes diferentes' using errcode = '23514';
  end if;

  if v_cita.sede_id is distinct from v_factura.sede_id then
    raise exception 'La cita y la factura pertenecen a sedes diferentes' using errcode = '23514';
  end if;

  if v_cita.estado is distinct from 'completada'::public.estado_cita then
    raise exception 'Solo se pueden facturar servicios de citas completadas' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validar_factura_servicio_cita() from public, anon, authenticated;

drop trigger if exists trg_factura_servicios_validar_cita on public.factura_servicios;
create trigger trg_factura_servicios_validar_cita
before insert or update of factura_id, servicio_id, cita_id on public.factura_servicios
for each row execute function public.validar_factura_servicio_cita();

create or replace function public.crear_garantia_servicio_factura()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_factura record;
  v_cita record;
  v_servicio record;
begin
  -- Una línea de servicio sin cita no puede producir una garantía verificable.
  if new.cita_id is null then
    return new;
  end if;

  select f.cliente_id into v_factura
  from public.facturas f
  where f.id = new.factura_id;

  select c.fecha_hora::date as fecha_servicio, c.fecha_proxima_revision
    into v_cita
  from public.citas c
  where c.id = new.cita_id;

  select s.id, s.garantia_duracion, s.garantia_unidad into v_servicio
  from public.servicios s where s.id = new.servicio_id;

  if v_cita.fecha_proxima_revision is not null
     and v_servicio.garantia_duracion is not null then
    insert into public.garantias (
      factura_id, factura_servicio_id, cliente_id, servicio_id, tipo, item_nombre,
      item_precio, cantidad, duracion, unidad, fecha_inicio, fecha_fin
    ) values (
      new.factura_id, new.id, v_factura.cliente_id, v_servicio.id, 'service',
      new.nombre_servicio, new.precio_unitario, new.cantidad,
      v_servicio.garantia_duracion, v_servicio.garantia_unidad,
      v_cita.fecha_servicio, v_cita.fecha_proxima_revision
    ) on conflict (factura_servicio_id) where factura_servicio_id is not null do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.crear_garantia_servicio_factura() from public, anon, authenticated;

-- Backfills deterministas: no se intenta adivinar cita_id para facturas históricas.
update public.factura_items fi
set fecha_vencimiento_garantia = public.fecha_fin_garantia(
  f.fecha,
  p.garantia_duracion,
  p.garantia_unidad
)
from public.facturas f,
     public.variantes_producto vp,
     public.productos p
where f.id = fi.factura_id
  and vp.id = fi.variante_id
  and p.id = vp.producto_id
  and p.garantia_duracion is not null
  and p.garantia_unidad is not null
  and fi.fecha_vencimiento_garantia is null;

update public.citas c
set fecha_proxima_revision = public.fecha_fin_garantia(
  c.fecha_hora::date,
  s.garantia_duracion,
  s.garantia_unidad
)
from public.servicios s
where s.id = c.servicio_id
  and c.estado = 'completada'::public.estado_cita
  and s.garantia_duracion is not null
  and s.garantia_unidad is not null
  and c.fecha_proxima_revision is null;

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
  v_rol public.rol_usuario := public.rol_actual();
  v_factura_id uuid;
  v_numero text;
  v_item jsonb;
  v_subtotal numeric(14,2) := 0;
  v_descuento numeric(14,2) := 0;
  v_impuestos numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_empleado_nombre text;
  v_cliente record;
begin
  if v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario) then
    raise exception 'No autorizado para emitir facturas' using errcode = '42501';
  end if;
  if v_rol <> 'admin'::public.rol_usuario and p_sede_id is distinct from public.sede_actual() then
    raise exception 'Solo puede facturar en su sede asignada' using errcode = '42501';
  end if;
  select u.nombre, u.apellido, u.documento, u.email, u.telefono
    into v_cliente from public.usuarios u where u.id = p_cliente_id;
  if not found then raise exception 'El cliente no existe'; end if;
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
  from public.usuarios u where u.id = (select auth.uid());

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
    v_numero, p_cliente_id, (select auth.uid()), p_sede_id, current_date, p_fecha_vencimiento,
    v_subtotal, v_impuestos, v_total, v_descuento, p_metodo_pago, p_estado, nullif(btrim(p_notas), ''),
    concat_ws(' ', v_cliente.nombre, v_cliente.apellido), v_cliente.documento,
    v_cliente.email, v_cliente.telefono, p_cliente_direccion,
    p_moto_placa, p_moto_modelo, v_empleado_nombre
  ) returning facturas.id into v_factura_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'type', '') = 'service' then
      insert into public.factura_servicios (
        factura_id, servicio_id, cita_id, nombre_servicio, precio, cantidad,
        precio_unitario, descuento_porcentaje, subtotal
      ) values (
        v_factura_id,
        case when nullif(v_item->>'referenceId', '') is null then null else (v_item->>'referenceId')::uuid end,
        case when nullif(v_item->>'appointmentId', '') is null then null else (v_item->>'appointmentId')::uuid end,
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

revoke all on function public.crear_factura(uuid,uuid,date,text,text,text,text,text,text,text,text,text,text,numeric,jsonb) from public, anon;
grant execute on function public.crear_factura(uuid,uuid,date,text,text,text,text,text,text,text,text,text,text,numeric,jsonb) to authenticated, service_role;

drop view if exists public.garantias_compras_unificadas;
create view public.garantias_compras_unificadas
with (security_invoker = true)
as
select
  ('product:' || fi.id::text) as id,
  fi.id as origen_id,
  'product'::text as tipo,
  f.id as factura_id,
  f.numero_factura,
  f.fecha as fecha_operacion,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_documento,
  f.cliente_email,
  f.cliente_telefono,
  f.moto_placa,
  f.moto_modelo,
  f.metodo_pago,
  f.sede_id,
  se.nombre as sede_nombre,
  fi.nombre_producto as item_nombre,
  fi.sku,
  fi.precio_unitario as item_precio,
  fi.cantidad,
  p.garantia_duracion as duracion,
  p.garantia_unidad as unidad,
  fi.fecha_vencimiento_garantia as fecha_garantia,
  null::uuid as cita_id,
  g.id as garantia_id,
  g.codigo as codigo_garantia
from public.factura_items fi
join public.facturas f on f.id = fi.factura_id
join public.variantes_producto vp on vp.id = fi.variante_id
join public.productos p on p.id = vp.producto_id
join public.sedes se on se.id = f.sede_id
left join public.garantias g on g.factura_item_id = fi.id
where fi.fecha_vencimiento_garantia is not null
  and f.estado <> 'anulada'

union all

select
  ('service:' || fs.id::text) as id,
  fs.id as origen_id,
  'service'::text as tipo,
  f.id as factura_id,
  f.numero_factura,
  c.fecha_hora::date as fecha_operacion,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_documento,
  f.cliente_email,
  f.cliente_telefono,
  f.moto_placa,
  f.moto_modelo,
  f.metodo_pago,
  c.sede_id,
  se.nombre as sede_nombre,
  fs.nombre_servicio as item_nombre,
  null::text as sku,
  fs.precio_unitario as item_precio,
  fs.cantidad,
  s.garantia_duracion as duracion,
  s.garantia_unidad as unidad,
  c.fecha_proxima_revision as fecha_garantia,
  c.id as cita_id,
  g.id as garantia_id,
  g.codigo as codigo_garantia
from public.factura_servicios fs
join public.facturas f on f.id = fs.factura_id
join public.citas c on c.id = fs.cita_id
join public.servicios s on s.id = fs.servicio_id
join public.sedes se on se.id = c.sede_id
left join public.garantias g on g.factura_servicio_id = fs.id
where c.fecha_proxima_revision is not null
  and f.estado <> 'anulada';

revoke all on table public.garantias_compras_unificadas from public, anon;
grant select on table public.garantias_compras_unificadas to authenticated, service_role;

comment on view public.garantias_compras_unificadas is
  'Garantías verificables de productos y servicios; respeta el RLS de sus tablas mediante security_invoker.';
