-- FASE 2 (A-02): solo admin y empleado administran inventario.
-- Preparada para staging. No aplicar directamente en producción.

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
  if v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No tiene permiso para crear productos' using errcode = '42501';
  end if;
  if v_rol <> 'admin'::public.rol_usuario
     and p_sede_id is distinct from public.sede_actual() then
    raise exception 'Solo puede crear inventario en su sede asignada' using errcode = '42501';
  end if;
  if nullif(btrim(p_nombre), '') is null or nullif(btrim(p_sku), '') is null then
    raise exception 'El nombre y el SKU son obligatorios' using errcode = '22023';
  end if;
  if p_costo < 0 or p_precio < 0 or p_stock_inicial < 0 or p_stock_minimo < 0 then
    raise exception 'Costos, precios y existencias no pueden ser negativos' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.sedes s where s.id = p_sede_id and s.activo
  ) then
    raise exception 'La ubicación seleccionada no existe o está inactiva' using errcode = '22023';
  end if;

  insert into public.productos (
    nombre, descripcion, marca_id, tipo_id, sku_base, costo, precio,
    imagen_url, activo, sede_id
  ) values (
    btrim(p_nombre), nullif(btrim(p_descripcion), ''), p_marca_id, p_tipo_id,
    btrim(p_sku), p_costo, p_precio, nullif(btrim(p_imagen_url), ''),
    p_activo, p_sede_id
  )
  returning id into v_producto_id;

  insert into public.variantes_producto (producto_id, sku, precio_adicional, activo)
  values (v_producto_id, btrim(p_sku), 0, p_activo)
  returning id into v_variante_id;

  insert into public.inventario_sede (variante_id, sede_id, stock, stock_minimo)
  values (v_variante_id, p_sede_id, 0, p_stock_minimo);

  if p_stock_inicial > 0 then
    insert into public.movimientos_inventario (
      variante_id, sede_id, tipo, cantidad, motivo, usuario_id
    ) values (
      v_variante_id, p_sede_id, 'entrada', p_stock_inicial,
      'Stock inicial', (select auth.uid())
    );
  end if;

  return jsonb_build_object(
    'producto_id', v_producto_id,
    'variante_id', v_variante_id
  );
end;
$$;

revoke all on function public.crear_producto_inventario(
  text, text, text, uuid, uuid, uuid, numeric, numeric, text,
  integer, integer, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.crear_producto_inventario(
  text, text, text, uuid, uuid, uuid, numeric, numeric, text,
  integer, integer, boolean
) to authenticated, service_role;

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
  if v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No tiene permiso para mover inventario' using errcode = '42501';
  end if;
  if v_rol <> 'admin'::public.rol_usuario
     and p_sede_origen_id is distinct from public.sede_actual() then
    raise exception 'Solo puede mover inventario desde su sede asignada' using errcode = '42501';
  end if;
  if p_sede_origen_id = p_sede_destino_id then
    return jsonb_build_object('producto_id', p_producto_id, 'sin_cambios', true);
  end if;
  if not exists (
    select 1 from public.sedes s where s.id = p_sede_origen_id and s.activo
  ) then
    raise exception 'La sede de origen no existe o está inactiva' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.sedes s where s.id = p_sede_destino_id and s.activo
  ) then
    raise exception 'La sede de destino no existe o está inactiva' using errcode = '22023';
  end if;

  select p.nombre
  into v_producto_nombre
  from public.productos p
  where p.id = p_producto_id
    and p.sede_id = p_sede_origen_id
  for update;
  if not found then
    raise exception 'El producto no existe en la sede de origen' using errcode = 'P0002';
  end if;

  for v_balance in
    select i.id, i.variante_id, i.stock, i.stock_minimo
    from public.inventario_sede i
    join public.variantes_producto v on v.id = i.variante_id
    where v.producto_id = p_producto_id
      and i.sede_id = p_sede_origen_id
    order by i.id
    for update of i
  loop
    insert into public.inventario_sede as destino (
      variante_id, sede_id, stock, stock_minimo
    ) values (
      v_balance.variante_id, p_sede_destino_id, 0, v_balance.stock_minimo
    )
    on conflict (variante_id, sede_id) do update
      set stock_minimo = greatest(destino.stock_minimo, excluded.stock_minimo);

    if v_balance.stock > 0 then
      insert into public.movimientos_inventario (
        variante_id, sede_id, tipo, cantidad, motivo, usuario_id
      ) values
        (
          v_balance.variante_id, p_sede_origen_id, 'salida',
          v_balance.stock, 'Traslado a otra sede', v_usuario_id
        ),
        (
          v_balance.variante_id, p_sede_destino_id, 'entrada',
          v_balance.stock, 'Traslado desde otra sede', v_usuario_id
        );
    end if;

    delete from public.inventario_sede where id = v_balance.id;
    v_movidos := v_movidos + 1;
  end loop;

  if v_movidos = 0 then
    raise exception 'El producto no tiene inventario en la sede de origen' using errcode = 'P0002';
  end if;

  update public.productos
  set sede_id = p_sede_destino_id,
      updated_at = now()
  where id = p_producto_id;

  insert into public.traslados_productos (
    producto_id, sede_origen_id, sede_destino_id, usuario_id
  ) values (
    p_producto_id, p_sede_origen_id, p_sede_destino_id, v_usuario_id
  );

  return jsonb_build_object(
    'producto_id', p_producto_id,
    'producto', v_producto_nombre,
    'sede_origen_id', p_sede_origen_id,
    'sede_destino_id', p_sede_destino_id,
    'variantes_movidas', v_movidos
  );
end;
$$;

revoke all on function public.trasladar_producto_entre_sedes(uuid, uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.trasladar_producto_entre_sedes(uuid, uuid, uuid)
to authenticated, service_role;

create or replace function public.mover_producto_sede(
  p_producto_id uuid,
  p_sede_destino_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sede_origen_id uuid;
  v_rol public.rol_usuario := public.rol_actual();
begin
  if v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No tiene permiso para mover inventario' using errcode = '42501';
  end if;

  select p.sede_id
  into v_sede_origen_id
  from public.productos p
  where p.id = p_producto_id;
  if not found then
    raise exception 'El producto no existe' using errcode = 'P0002';
  end if;

  return public.trasladar_producto_entre_sedes(
    p_producto_id,
    v_sede_origen_id,
    p_sede_destino_id
  );
end;
$$;

revoke all on function public.mover_producto_sede(uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.mover_producto_sede(uuid, uuid)
to authenticated, service_role;
