-- Contexto de seguridad multi-sede.
-- El frontend filtra explícitamente, pero estas políticas son la frontera real
-- ante URLs o peticiones manipuladas.

create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.rol = 'empleado'::public.rol_usuario
      and e.cargo ~* '(técnic|tecnic|mecánic|mecanic|electric|especialista)'
      then 'mecanico'::public.rol_usuario
    else u.rol
  end
  from public.usuarios u
  left join public.empleados e on e.usuario_id = u.id and e.activo
  where u.id = (select auth.uid()) and u.activo
  limit 1;
$$;

create or replace function public.sede_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(u.sede_id, e.sede_id)
  from public.usuarios u
  left join public.empleados e on e.usuario_id = u.id and e.activo
  where u.id = (select auth.uid()) and u.activo
  limit 1;
$$;

create or replace function public.empleado_actual_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.empleados e
  where e.usuario_id = (select auth.uid()) and e.activo
  limit 1;
$$;

revoke all on function public.sede_actual() from public;
revoke all on function public.empleado_actual_id() from public, anon;
grant execute on function public.sede_actual() to authenticated, service_role;
grant execute on function public.empleado_actual_id() to authenticated, service_role;

create or replace function public.aplicar_movimiento_inventario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock_actual integer;
begin
  if new.cantidad <= 0 then
    raise exception 'La cantidad del movimiento debe ser mayor que cero' using errcode = '22023';
  end if;

  insert into public.inventario_sede (variante_id, sede_id, stock, stock_minimo)
  values (new.variante_id, new.sede_id, 0, 5)
  on conflict (variante_id, sede_id) do nothing;

  select i.stock into v_stock_actual
  from public.inventario_sede i
  where i.variante_id = new.variante_id and i.sede_id = new.sede_id
  for update;

  if new.tipo = 'salida'::public.tipo_movimiento and v_stock_actual < new.cantidad then
    raise exception 'Stock insuficiente para registrar la salida' using errcode = '22023';
  end if;

  update public.inventario_sede i
  set stock = case
    when new.tipo = 'entrada'::public.tipo_movimiento then i.stock + new.cantidad
    else i.stock - new.cantidad
  end
  where i.variante_id = new.variante_id and i.sede_id = new.sede_id;

  return new;
end;
$$;

drop policy if exists sedes_authenticated_select on public.sedes;
create policy sedes_authenticated_select on public.sedes
for select to authenticated
using (activo or (select public.rol_actual()) = 'admin'::public.rol_usuario);

drop policy if exists usuarios_select_propio on public.usuarios;
create policy usuarios_select_propio on public.usuarios
for select to authenticated
using (
  id = (select auth.uid())
  or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
  or (
    (select public.rol_actual()) = 'mecanico'::public.rol_usuario
    and rol = 'cliente'::public.rol_usuario
    and exists (
      select 1 from public.citas c
      where c.cliente_id = usuarios.id
        and c.empleado_id = (select public.empleado_actual_id())
    )
  )
);

drop policy if exists empleados_select_staff on public.empleados;
create policy empleados_select_staff on public.empleados
for select to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
  or (
    (select public.rol_actual()) = 'mecanico'::public.rol_usuario
    and usuario_id = (select auth.uid())
  )
);

drop policy if exists motos_select on public.motos_clientes;
create policy motos_select on public.motos_clientes
for select to authenticated
using (
  ((select public.rol_actual()) = 'cliente'::public.rol_usuario and cliente_id = (select auth.uid()))
  or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
  or (
    (select public.rol_actual()) = 'mecanico'::public.rol_usuario
    and exists (
      select 1 from public.citas c
      where c.moto_id = motos_clientes.id
        and c.empleado_id = (select public.empleado_actual_id())
    )
  )
);

drop policy if exists motos_insert on public.motos_clientes;
create policy motos_insert on public.motos_clientes
for insert to authenticated
with check (
  ((select public.rol_actual()) = 'cliente'::public.rol_usuario and cliente_id = (select auth.uid()))
  or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
);

drop policy if exists motos_update on public.motos_clientes;
create policy motos_update on public.motos_clientes
for update to authenticated
using (
  ((select public.rol_actual()) = 'cliente'::public.rol_usuario and cliente_id = (select auth.uid()))
  or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
)
with check (
  ((select public.rol_actual()) = 'cliente'::public.rol_usuario and cliente_id = (select auth.uid()))
  or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
);

drop policy if exists inventario_select_staff on public.inventario_sede;
create policy inventario_select_staff on public.inventario_sede
for select to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists inventario_insert_staff on public.inventario_sede;
create policy inventario_insert_staff on public.inventario_sede
for insert to authenticated
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists inventario_update_staff on public.inventario_sede;
create policy inventario_update_staff on public.inventario_sede
for update to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
)
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists movimientos_select on public.movimientos_inventario;
create policy movimientos_select on public.movimientos_inventario
for select to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists movimientos_insert on public.movimientos_inventario;
create policy movimientos_insert on public.movimientos_inventario
for insert to authenticated
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists traslados_productos_staff_select on public.traslados_productos;
create policy traslados_productos_staff_select on public.traslados_productos
for select to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and (sede_origen_id = (select public.sede_actual()) or sede_destino_id = (select public.sede_actual()))
  )
);

drop policy if exists citas_select on public.citas;
create policy citas_select on public.citas
for select to authenticated
using (
  ((select public.rol_actual()) = 'cliente'::public.rol_usuario and cliente_id = (select auth.uid()))
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
  or (
    (select public.rol_actual()) = 'mecanico'::public.rol_usuario
    and empleado_id = (select public.empleado_actual_id())
  )
);

drop policy if exists citas_insert on public.citas;
create policy citas_insert on public.citas
for insert to authenticated
with check (
  ((select public.rol_actual()) = 'cliente'::public.rol_usuario and cliente_id = (select auth.uid()))
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists citas_update on public.citas;
create policy citas_update on public.citas
for update to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
  or (
    (select public.rol_actual()) = 'mecanico'::public.rol_usuario
    and empleado_id = (select public.empleado_actual_id())
  )
)
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
  or (
    (select public.rol_actual()) = 'mecanico'::public.rol_usuario
    and empleado_id = (select public.empleado_actual_id())
  )
);

drop policy if exists asistencia_select on public.asistencia_empleados;
create policy asistencia_select on public.asistencia_empleados
for select to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
  or empleado_id = (select public.empleado_actual_id())
);

drop policy if exists asistencia_insert on public.asistencia_empleados;
create policy asistencia_insert on public.asistencia_empleados
for insert to authenticated
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    empleado_id = (select public.empleado_actual_id())
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists asistencia_update on public.asistencia_empleados;
create policy asistencia_update on public.asistencia_empleados
for update to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    empleado_id = (select public.empleado_actual_id())
    and sede_id = (select public.sede_actual())
  )
)
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    empleado_id = (select public.empleado_actual_id())
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists facturas_select on public.facturas;
create policy facturas_select on public.facturas
for select to authenticated
using (
  ((select public.rol_actual()) = 'cliente'::public.rol_usuario and cliente_id = (select auth.uid()))
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists facturas_insert on public.facturas;
create policy facturas_insert on public.facturas
for insert to authenticated
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists factura_items_select on public.factura_items;
create policy factura_items_select on public.factura_items
for select to authenticated
using (exists (
  select 1 from public.facturas f
  where f.id = factura_items.factura_id
    and (
      ((select public.rol_actual()) = 'cliente'::public.rol_usuario and f.cliente_id = (select auth.uid()))
      or (select public.rol_actual()) = 'admin'::public.rol_usuario
      or (
        (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
        and f.sede_id = (select public.sede_actual())
      )
    )
));

drop policy if exists factura_servicios_select on public.factura_servicios;
create policy factura_servicios_select on public.factura_servicios
for select to authenticated
using (exists (
  select 1 from public.facturas f
  where f.id = factura_servicios.factura_id
    and (
      ((select public.rol_actual()) = 'cliente'::public.rol_usuario and f.cliente_id = (select auth.uid()))
      or (select public.rol_actual()) = 'admin'::public.rol_usuario
      or (
        (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
        and f.sede_id = (select public.sede_actual())
      )
    )
));

drop policy if exists garantias_select on public.garantias;
create policy garantias_select on public.garantias
for select to authenticated
using (
  ((select public.rol_actual()) = 'cliente'::public.rol_usuario and cliente_id = (select auth.uid()))
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and exists (
      select 1 from public.facturas f
      where f.id = garantias.factura_id and f.sede_id = (select public.sede_actual())
    )
  )
);

drop policy if exists reclamaciones_select on public.reclamaciones_garantia;
create policy reclamaciones_select on public.reclamaciones_garantia
for select to authenticated
using (exists (
  select 1 from public.garantias g
  join public.facturas f on f.id = g.factura_id
  where g.id = reclamaciones_garantia.garantia_id
    and (
      ((select public.rol_actual()) = 'cliente'::public.rol_usuario and g.cliente_id = (select auth.uid()))
      or (select public.rol_actual()) = 'admin'::public.rol_usuario
      or (
        (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
        and f.sede_id = (select public.sede_actual())
      )
    )
));

drop policy if exists notifications_select_own_or_staff on public.notifications;
create policy notifications_select_own_or_staff on public.notifications
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and exists (
      select 1 from public.citas c
      where c.id = notifications.appointment_id
        and c.sede_id = (select public.sede_actual())
    )
  )
);

drop policy if exists productos_insert_staff on public.productos;
create policy productos_insert_staff on public.productos
for insert to authenticated
with check ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario));

drop policy if exists productos_update_staff on public.productos;
create policy productos_update_staff on public.productos
for update to authenticated
using ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario))
with check ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario));

drop policy if exists servicios_insert_staff on public.servicios;
create policy servicios_insert_staff on public.servicios
for insert to authenticated
with check ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario));

drop policy if exists servicios_update_staff on public.servicios;
create policy servicios_update_staff on public.servicios
for update to authenticated
using ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario))
with check ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario));

create or replace function public.trasladar_producto_entre_sedes(
  p_producto_id uuid,
  p_sede_origen_id uuid,
  p_sede_destino_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_rol public.rol_usuario := public.rol_actual();
  v_producto_nombre text;
  v_balance record;
  v_movidos integer := 0;
begin
  if v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario) then
    raise exception 'No tiene permiso para mover inventario' using errcode = '42501';
  end if;
  if v_rol <> 'admin'::public.rol_usuario and p_sede_origen_id is distinct from public.sede_actual() then
    raise exception 'Solo puede mover inventario desde su sede asignada' using errcode = '42501';
  end if;
  if p_sede_origen_id = p_sede_destino_id then
    return jsonb_build_object('producto_id', p_producto_id, 'sin_cambios', true);
  end if;
  if not exists (select 1 from public.sedes s where s.id = p_sede_origen_id and s.activo) then
    raise exception 'La sede de origen no existe o está inactiva' using errcode = '22023';
  end if;
  if not exists (select 1 from public.sedes s where s.id = p_sede_destino_id and s.activo) then
    raise exception 'La sede de destino no existe o está inactiva' using errcode = '22023';
  end if;

  select p.nombre into v_producto_nombre
  from public.productos p where p.id = p_producto_id for update;
  if not found then raise exception 'El producto no existe' using errcode = 'P0002'; end if;

  for v_balance in
    select i.id, i.variante_id, i.stock, i.stock_minimo
    from public.inventario_sede i
    join public.variantes_producto v on v.id = i.variante_id
    where v.producto_id = p_producto_id and i.sede_id = p_sede_origen_id
    for update of i
  loop
    insert into public.inventario_sede as destino (variante_id, sede_id, stock, stock_minimo)
    values (v_balance.variante_id, p_sede_destino_id, 0, v_balance.stock_minimo)
    on conflict (variante_id, sede_id) do update
      set stock_minimo = greatest(destino.stock_minimo, excluded.stock_minimo);

    if v_balance.stock > 0 then
      insert into public.movimientos_inventario (variante_id, sede_id, tipo, cantidad, motivo, usuario_id)
      values
        (v_balance.variante_id, p_sede_origen_id, 'salida', v_balance.stock, 'Traslado a otra sede', v_usuario_id),
        (v_balance.variante_id, p_sede_destino_id, 'entrada', v_balance.stock, 'Traslado desde otra sede', v_usuario_id);
    end if;
    delete from public.inventario_sede where id = v_balance.id;
    v_movidos := v_movidos + 1;
  end loop;

  if v_movidos = 0 then
    raise exception 'El producto no tiene inventario registrado en la sede de origen' using errcode = 'P0002';
  end if;

  update public.productos
  set sede_id = p_sede_destino_id, updated_at = now()
  where id = p_producto_id;

  insert into public.traslados_productos (producto_id, sede_origen_id, sede_destino_id, usuario_id)
  values (p_producto_id, p_sede_origen_id, p_sede_destino_id, v_usuario_id);

  return jsonb_build_object(
    'producto_id', p_producto_id,
    'producto', v_producto_nombre,
    'sede_origen_id', p_sede_origen_id,
    'sede_destino_id', p_sede_destino_id,
    'variantes_movidas', v_movidos
  );
end;
$$;

revoke all on function public.trasladar_producto_entre_sedes(uuid, uuid, uuid) from public, anon;
grant execute on function public.trasladar_producto_entre_sedes(uuid, uuid, uuid) to authenticated, service_role;

create or replace function public.mover_producto_sede(p_producto_id uuid, p_sede_destino_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sede_origen_id uuid;
begin
  select p.sede_id into v_sede_origen_id from public.productos p where p.id = p_producto_id;
  if not found then raise exception 'El producto no existe' using errcode = 'P0002'; end if;
  return public.trasladar_producto_entre_sedes(p_producto_id, v_sede_origen_id, p_sede_destino_id);
end;
$$;

revoke all on function public.mover_producto_sede(uuid, uuid) from public, anon;
grant execute on function public.mover_producto_sede(uuid, uuid) to authenticated, service_role;

create or replace function public.crear_producto_inventario(
  p_nombre text, p_descripcion text, p_sku text, p_marca_id uuid, p_tipo_id uuid,
  p_sede_id uuid, p_costo numeric, p_precio numeric, p_imagen_url text,
  p_stock_inicial integer, p_stock_minimo integer, p_activo boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
  v_producto_id uuid;
  v_variante_id uuid;
begin
  if v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario) then
    raise exception 'No tiene permiso para crear productos' using errcode = '42501';
  end if;
  if v_rol <> 'admin'::public.rol_usuario and p_sede_id is distinct from public.sede_actual() then
    raise exception 'Solo puede crear inventario en su sede asignada' using errcode = '42501';
  end if;
  if nullif(btrim(p_nombre), '') is null or nullif(btrim(p_sku), '') is null then
    raise exception 'El nombre y el SKU son obligatorios' using errcode = '22023';
  end if;
  if p_costo < 0 or p_precio < 0 or p_stock_inicial < 0 or p_stock_minimo < 0 then
    raise exception 'Costos, precios y existencias no pueden ser negativos' using errcode = '22023';
  end if;
  if not exists (select 1 from public.sedes s where s.id = p_sede_id and s.activo) then
    raise exception 'La ubicación seleccionada no existe o está inactiva' using errcode = '22023';
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

  insert into public.inventario_sede (variante_id, sede_id, stock, stock_minimo)
  values (v_variante_id, p_sede_id, 0, p_stock_minimo);

  if p_stock_inicial > 0 then
    insert into public.movimientos_inventario (variante_id, sede_id, tipo, cantidad, motivo, usuario_id)
    values (v_variante_id, p_sede_id, 'entrada', p_stock_inicial, 'Stock inicial', (select auth.uid()));
  end if;

  return jsonb_build_object('producto_id', v_producto_id, 'variante_id', v_variante_id);
end;
$$;

revoke all on function public.crear_producto_inventario(text, text, text, uuid, uuid, uuid, numeric, numeric, text, integer, integer, boolean) from public, anon;
grant execute on function public.crear_producto_inventario(text, text, text, uuid, uuid, uuid, numeric, numeric, text, integer, integer, boolean) to authenticated, service_role;

drop policy if exists reclamaciones_insert on public.reclamaciones_garantia;
create policy reclamaciones_insert on public.reclamaciones_garantia
for insert to authenticated
with check (exists (
  select 1 from public.garantias g
  join public.facturas f on f.id = g.factura_id
  where g.id = reclamaciones_garantia.garantia_id
    and (
      ((select public.rol_actual()) = 'cliente'::public.rol_usuario and g.cliente_id = (select auth.uid()))
      or (select public.rol_actual()) = 'admin'::public.rol_usuario
      or (
        (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
        and f.sede_id = (select public.sede_actual())
      )
    )
));

drop policy if exists reclamaciones_update_staff on public.reclamaciones_garantia;
create policy reclamaciones_update_staff on public.reclamaciones_garantia
for update to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and exists (
      select 1 from public.garantias g
      join public.facturas f on f.id = g.factura_id
      where g.id = reclamaciones_garantia.garantia_id
        and f.sede_id = (select public.sede_actual())
    )
  )
)
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
    and exists (
      select 1 from public.garantias g
      join public.facturas f on f.id = g.factura_id
      where g.id = reclamaciones_garantia.garantia_id
        and f.sede_id = (select public.sede_actual())
    )
  )
);

create or replace function public.configurar_garantia_producto(p_producto_id uuid, p_duracion integer, p_unidad text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.rol_actual() not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario) then
    raise exception 'No autorizado para configurar la garantía' using errcode = '42501';
  end if;
  if (p_duracion is null) <> (p_unidad is null)
     or (p_duracion is not null and (p_duracion <= 0 or p_unidad not in ('dias', 'meses', 'anios'))) then
    raise exception 'Duración de garantía inválida';
  end if;
  update public.productos
  set garantia_duracion = p_duracion, garantia_unidad = p_unidad
  where id = p_producto_id;
  if not found then raise exception 'Producto no encontrado'; end if;
end;
$$;

create or replace function public.registrar_garantia_manual(
  p_factura_id uuid, p_tipo text, p_item_nombre text, p_sku text,
  p_item_precio numeric, p_cantidad integer, p_duracion integer,
  p_unidad text, p_notas text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_factura record;
  v_id uuid;
  v_rol public.rol_usuario := public.rol_actual();
begin
  if v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario) then
    raise exception 'No autorizado para registrar garantías' using errcode = '42501';
  end if;
  if p_tipo not in ('product', 'service') or p_duracion <= 0 or p_unidad not in ('dias', 'meses', 'anios') then
    raise exception 'Datos de garantía inválidos';
  end if;
  select f.cliente_id, f.fecha, f.sede_id into v_factura
  from public.facturas f where f.id = p_factura_id;
  if not found then raise exception 'Factura no encontrada'; end if;
  if v_rol <> 'admin'::public.rol_usuario and v_factura.sede_id is distinct from public.sede_actual() then
    raise exception 'Solo puede registrar garantías de su sede' using errcode = '42501';
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

create or replace function public.proteger_reclamacion_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.rol_actual() not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario) then
    new.estado := 'en_revision';
    new.tecnico_id := null;
    new.resolucion := null;
    new.costo_cubierto := 0;
  end if;
  return new;
end;
$$;
;
