-- Soporte transaccional para alta y traslado de productos desde la aplicación.
-- La sede vigente vive en productos.sede_id; los traslados conservan origen y destino.

alter table public.productos
  add column if not exists costo numeric not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.productos'::regclass
      and conname = 'productos_costo_no_negativo'
  ) then
    alter table public.productos
      add constraint productos_costo_no_negativo check (costo >= 0);
  end if;
end $$;

create table if not exists public.traslados_productos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete restrict,
  sede_origen_id uuid not null references public.sedes(id) on delete restrict,
  sede_destino_id uuid not null references public.sedes(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  fecha timestamptz not null default now(),
  constraint traslados_productos_sedes_distintas check (sede_origen_id <> sede_destino_id)
);

create index if not exists idx_traslados_productos_producto_fecha
  on public.traslados_productos (producto_id, fecha desc);
create index if not exists idx_traslados_productos_origen
  on public.traslados_productos (sede_origen_id);
create index if not exists idx_traslados_productos_destino
  on public.traslados_productos (sede_destino_id);
create index if not exists idx_traslados_productos_usuario
  on public.traslados_productos (usuario_id);

alter table public.traslados_productos enable row level security;
revoke all on table public.traslados_productos from anon;
grant select on table public.traslados_productos to authenticated;

drop policy if exists traslados_productos_staff_select on public.traslados_productos;
create policy traslados_productos_staff_select
on public.traslados_productos
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = (select auth.uid())
      and u.activo
      and u.rol in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  )
);

-- Estas tablas son catálogos necesarios para construir el formulario.
grant select on table public.sedes, public.marcas, public.tipos_producto, public.variantes_producto to authenticated;

drop policy if exists sedes_authenticated_select on public.sedes;
create policy sedes_authenticated_select on public.sedes for select to authenticated using (true);
drop policy if exists marcas_authenticated_select on public.marcas;
create policy marcas_authenticated_select on public.marcas for select to authenticated using (true);
drop policy if exists tipos_producto_authenticated_select on public.tipos_producto;
create policy tipos_producto_authenticated_select on public.tipos_producto for select to authenticated using (true);
drop policy if exists variantes_producto_authenticated_select on public.variantes_producto;
create policy variantes_producto_authenticated_select on public.variantes_producto for select to authenticated using (true);

create or replace function public.crear_producto_inventario(
  p_nombre text,
  p_descripcion text,
  p_sku text,
  p_marca_id uuid,
  p_tipo_id uuid,
  p_sede_id uuid,
  p_costo numeric,
  p_precio numeric,
  p_imagen_url text,
  p_stock_inicial integer,
  p_stock_minimo integer,
  p_activo boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario;
  v_producto_id uuid;
  v_variante_id uuid;
begin
  select u.rol into v_rol
  from public.usuarios u
  where u.id = (select auth.uid()) and u.activo;

  if v_rol is null or v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No tiene permiso para crear productos' using errcode = '42501';
  end if;
  if nullif(btrim(p_nombre), '') is null or nullif(btrim(p_sku), '') is null then
    raise exception 'El nombre y el SKU son obligatorios' using errcode = '22023';
  end if;
  if p_costo < 0 or p_precio < 0 or p_stock_inicial < 0 or p_stock_minimo < 0 then
    raise exception 'Costos, precios y existencias no pueden ser negativos' using errcode = '22023';
  end if;
  if not exists (select 1 from public.sedes s where s.id = p_sede_id and s.activo) then
    raise exception 'La sede seleccionada no existe o está inactiva' using errcode = '22023';
  end if;

  insert into public.productos (
    nombre, descripcion, marca_id, tipo_id, sku_base, costo, precio, imagen_url, activo, sede_id
  ) values (
    btrim(p_nombre), nullif(btrim(p_descripcion), ''), p_marca_id, p_tipo_id,
    btrim(p_sku), p_costo, p_precio, nullif(btrim(p_imagen_url), ''), p_activo, p_sede_id
  ) returning id into v_producto_id;

  insert into public.variantes_producto (producto_id, sku, precio_adicional, activo)
  values (v_producto_id, btrim(p_sku), 0, p_activo)
  returning id into v_variante_id;

  insert into public.inventario_sede as destino (variante_id, sede_id, stock, stock_minimo)
  values (v_variante_id, p_sede_id, p_stock_inicial, p_stock_minimo);

  return jsonb_build_object('producto_id', v_producto_id, 'variante_id', v_variante_id);
end;
$$;

revoke all on function public.crear_producto_inventario(text, text, text, uuid, uuid, uuid, numeric, numeric, text, integer, integer, boolean) from public, anon;
grant execute on function public.crear_producto_inventario(text, text, text, uuid, uuid, uuid, numeric, numeric, text, integer, integer, boolean) to authenticated;

create or replace function public.mover_producto_sede(
  p_producto_id uuid,
  p_sede_destino_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_rol public.rol_usuario;
  v_sede_origen_id uuid;
  v_producto_nombre text;
begin
  select u.rol into v_rol
  from public.usuarios u
  where u.id = v_usuario_id and u.activo;

  if v_rol is null or v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No tiene permiso para mover inventario' using errcode = '42501';
  end if;

  select p.sede_id, p.nombre
  into v_sede_origen_id, v_producto_nombre
  from public.productos p
  where p.id = p_producto_id
  for update;

  if not found then
    raise exception 'El producto no existe' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.sedes s where s.id = p_sede_destino_id and s.activo) then
    raise exception 'La sede de destino no existe o está inactiva' using errcode = '22023';
  end if;
  if v_sede_origen_id = p_sede_destino_id then
    return jsonb_build_object('producto_id', p_producto_id, 'sin_cambios', true);
  end if;

  -- Combina existencias si ya hubiera un saldo de la variante en el destino.
  insert into public.inventario_sede as destino (variante_id, sede_id, stock, stock_minimo)
  select i.variante_id, p_sede_destino_id, i.stock, i.stock_minimo
  from public.inventario_sede i
  join public.variantes_producto v on v.id = i.variante_id
  where v.producto_id = p_producto_id
    and i.sede_id = v_sede_origen_id
  on conflict (variante_id, sede_id) do update
    set stock = destino.stock + excluded.stock,
        stock_minimo = greatest(destino.stock_minimo, excluded.stock_minimo);

  delete from public.inventario_sede i
  using public.variantes_producto v
  where i.variante_id = v.id
    and v.producto_id = p_producto_id
    and i.sede_id = v_sede_origen_id;

  -- Aun un producto con stock cero conserva un saldo en su nueva sede.
  insert into public.inventario_sede (variante_id, sede_id, stock, stock_minimo)
  select v.id, p_sede_destino_id, 0, 5
  from public.variantes_producto v
  where v.producto_id = p_producto_id
  on conflict (variante_id, sede_id) do nothing;

  update public.productos
  set sede_id = p_sede_destino_id,
      updated_at = now()
  where id = p_producto_id;

  insert into public.traslados_productos (
    producto_id, sede_origen_id, sede_destino_id, usuario_id
  ) values (
    p_producto_id, v_sede_origen_id, p_sede_destino_id, v_usuario_id
  );

  return jsonb_build_object(
    'producto_id', p_producto_id,
    'producto', v_producto_nombre,
    'sede_origen_id', v_sede_origen_id,
    'sede_destino_id', p_sede_destino_id
  );
end;
$$;

revoke all on function public.mover_producto_sede(uuid, uuid) from public, anon;
grant execute on function public.mover_producto_sede(uuid, uuid) to authenticated;
