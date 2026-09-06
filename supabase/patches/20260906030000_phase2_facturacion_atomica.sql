-- FASE 2 (A-03/A-04): facturación calculada en servidor e inventario atómico.
-- Preparada para staging. No aplicar directamente en producción.

alter table public.movimientos_inventario
  add column if not exists factura_item_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'movimientos_inventario_factura_item_id_fkey'
      and conrelid = 'public.movimientos_inventario'::regclass
  ) then
    alter table public.movimientos_inventario
      add constraint movimientos_inventario_factura_item_id_fkey
      foreign key (factura_item_id)
      references public.factura_items(id)
      on delete set null;
  end if;
end $$;

create index if not exists movimientos_factura_item_id_idx
  on public.movimientos_inventario (factura_item_id)
  where factura_item_id is not null;

create unique index if not exists movimientos_factura_item_tipo_unique
  on public.movimientos_inventario (factura_item_id, tipo)
  where factura_item_id is not null;

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
  v_factura_item_id uuid;
  v_numero text;
  v_item jsonb;
  v_resolved_item jsonb;
  v_resolved_items jsonb := '[]'::jsonb;
  v_subtotal numeric(14,2) := 0;
  v_descuento numeric(14,2) := 0;
  v_impuestos numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_empleado_nombre text;
  v_cliente record;
  v_catalogo record;
  v_cita record;
  v_tipo text;
  v_referencia uuid;
  v_cita_id uuid;
  v_cantidad integer;
  v_descuento_porcentaje numeric(5,2);
  v_descuento_maximo numeric(5,2);
  v_precio_unitario numeric(14,2);
  v_total_linea numeric(14,2);
  v_vistos_productos uuid[] := array[]::uuid[];
begin
  if (select auth.uid()) is null
     or v_rol not in (
       'admin'::public.rol_usuario,
       'empleado'::public.rol_usuario,
       'vendedor'::public.rol_usuario
     ) then
    raise exception 'No autorizado para emitir facturas' using errcode = '42501';
  end if;
  if v_rol <> 'admin'::public.rol_usuario
     and p_sede_id is distinct from public.sede_actual() then
    raise exception 'Solo puede facturar en su sede asignada' using errcode = '42501';
  end if;
  if p_tasa_impuesto is null or p_tasa_impuesto < 0 or p_tasa_impuesto > 100 then
    raise exception 'La tasa de impuesto debe estar entre 0 y 100' using errcode = '22023';
  end if;
  if p_estado not in ('pagada', 'pendiente', 'borrador') then
    raise exception 'Estado inicial de factura inválido' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La factura requiere al menos un concepto' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'La factura excede el máximo de 100 conceptos' using errcode = '22023';
  end if;

  select u.nombre, u.apellido, u.documento, u.email, u.telefono
  into v_cliente
  from public.usuarios u
  where u.id = p_cliente_id
    and u.rol = 'cliente'::public.rol_usuario
    and u.activo;
  if not found then
    raise exception 'El cliente no existe o está inactivo' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.sedes s where s.id = p_sede_id and s.activo
  ) then
    raise exception 'La sede no existe o está inactiva' using errcode = 'P0002';
  end if;

  v_descuento_maximo := case
    when v_rol = 'admin'::public.rol_usuario then 100
    else 20
  end;

  -- Primero se resuelven y validan todas las líneas. Los precios, nombres,
  -- SKU y totales siempre proceden del catálogo, no del JSON del navegador.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Cada concepto debe ser un objeto JSON' using errcode = '22023';
    end if;

    v_tipo := nullif(v_item->>'type', '');
    begin
      v_referencia := (v_item->>'referenceId')::uuid;
      v_cantidad := (v_item->>'quantity')::integer;
      v_descuento_porcentaje := coalesce((v_item->>'discountPercent')::numeric, 0);
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Referencia, cantidad o descuento inválido' using errcode = '22023';
    end;

    if v_tipo not in ('product', 'service') or v_referencia is null then
      raise exception 'El tipo y la referencia del concepto son obligatorios' using errcode = '22023';
    end if;
    if v_cantidad is null or v_cantidad <= 0 or v_cantidad > 100000 then
      raise exception 'La cantidad debe ser un entero positivo' using errcode = '22023';
    end if;
    if v_descuento_porcentaje < 0 or v_descuento_porcentaje > v_descuento_maximo then
      raise exception 'El descuento excede el máximo autorizado de % por ciento', v_descuento_maximo using errcode = '42501';
    end if;

    if v_tipo = 'product' then
      if v_referencia = any(v_vistos_productos) then
        raise exception 'Una variante de producto no puede repetirse en la factura' using errcode = '22023';
      end if;
      v_vistos_productos := array_append(v_vistos_productos, v_referencia);

      select
        vp.id as variante_id,
        vp.sku,
        p.nombre,
        (p.precio + vp.precio_adicional)::numeric(14,2) as precio_unitario,
        i.stock
      into v_catalogo
      from public.variantes_producto vp
      join public.productos p on p.id = vp.producto_id
      join public.inventario_sede i
        on i.variante_id = vp.id
       and i.sede_id = p_sede_id
      where vp.id = v_referencia
        and vp.activo
        and p.activo
      for update of i;

      if not found then
        raise exception 'El producto no existe, está inactivo o no pertenece a la sede' using errcode = 'P0002';
      end if;
      if v_catalogo.stock < v_cantidad then
        raise exception 'Stock insuficiente para %: disponible %, solicitado %',
          v_catalogo.nombre, v_catalogo.stock, v_cantidad
          using errcode = '22023';
      end if;

      v_precio_unitario := v_catalogo.precio_unitario;
      v_total_linea := round(v_precio_unitario * v_cantidad * (1 - v_descuento_porcentaje / 100), 2);
      v_resolved_item := jsonb_build_object(
        'type', 'product',
        'referenceId', v_catalogo.variante_id,
        'description', v_catalogo.nombre,
        'sku', v_catalogo.sku,
        'quantity', v_cantidad,
        'unitPrice', v_precio_unitario,
        'discountPercent', v_descuento_porcentaje,
        'total', v_total_linea
      );
    else
      select s.id, s.nombre, s.precio, s.garantia_duracion
      into v_catalogo
      from public.servicios s
      where s.id = v_referencia
        and s.activo;
      if not found then
        raise exception 'El servicio no existe o está inactivo' using errcode = 'P0002';
      end if;

      begin
        v_cita_id := nullif(v_item->>'appointmentId', '')::uuid;
      exception when invalid_text_representation then
        raise exception 'La cita asociada no es válida' using errcode = '22023';
      end;

      if v_cita_id is not null then
        select c.id, c.cliente_id, c.servicio_id, c.sede_id, c.estado
        into v_cita
        from public.citas c
        where c.id = v_cita_id
        for share;
        if not found
           or v_cita.cliente_id is distinct from p_cliente_id
           or v_cita.servicio_id is distinct from v_referencia
           or v_cita.sede_id is distinct from p_sede_id
           or v_cita.estado is distinct from 'completada'::public.estado_cita then
          raise exception 'La cita no corresponde al cliente, servicio, sede o estado completado' using errcode = '22023';
        end if;
      elsif v_catalogo.garantia_duracion is not null then
        raise exception 'Un servicio con garantía requiere una cita completada asociada' using errcode = '22023';
      end if;

      v_precio_unitario := v_catalogo.precio;
      v_total_linea := round(v_precio_unitario * v_cantidad * (1 - v_descuento_porcentaje / 100), 2);
      v_resolved_item := jsonb_build_object(
        'type', 'service',
        'referenceId', v_catalogo.id,
        'appointmentId', v_cita_id,
        'description', v_catalogo.nombre,
        'quantity', v_cantidad,
        'unitPrice', v_precio_unitario,
        'discountPercent', v_descuento_porcentaje,
        'total', v_total_linea
      );
    end if;

    v_subtotal := v_subtotal + v_total_linea;
    v_descuento := v_descuento + round(
      v_precio_unitario * v_cantidad * v_descuento_porcentaje / 100,
      2
    );
    v_resolved_items := v_resolved_items || jsonb_build_array(v_resolved_item);
  end loop;

  v_impuestos := round(v_subtotal * p_tasa_impuesto / 100, 2);
  v_total := v_subtotal + v_impuestos;
  v_numero := 'FAC-' || to_char(current_date, 'YYYY') || '-'
    || lpad(nextval('public.facturas_numero_seq')::text, 6, '0');

  select concat_ws(' ', u.nombre, u.apellido)
  into v_empleado_nombre
  from public.usuarios u
  where u.id = (select auth.uid());

  insert into public.facturas (
    numero_factura, cliente_id, empleado_id, sede_id, fecha,
    fecha_vencimiento, subtotal, impuestos, total, descuento_total,
    metodo_pago, estado, notas, cliente_nombre, cliente_documento,
    cliente_email, cliente_telefono, cliente_direccion, moto_placa,
    moto_modelo, empleado_nombre
  ) values (
    v_numero, p_cliente_id, (select auth.uid()), p_sede_id, current_date,
    p_fecha_vencimiento, v_subtotal, v_impuestos, v_total, v_descuento,
    p_metodo_pago, p_estado, nullif(btrim(p_notas), ''),
    concat_ws(' ', v_cliente.nombre, v_cliente.apellido),
    v_cliente.documento, v_cliente.email, v_cliente.telefono,
    nullif(btrim(p_cliente_direccion), ''), nullif(btrim(p_moto_placa), ''),
    nullif(btrim(p_moto_modelo), ''), v_empleado_nombre
  )
  returning facturas.id into v_factura_id;

  for v_item in select value from jsonb_array_elements(v_resolved_items)
  loop
    if v_item->>'type' = 'service' then
      insert into public.factura_servicios (
        factura_id, servicio_id, cita_id, nombre_servicio, precio, cantidad,
        precio_unitario, descuento_porcentaje, subtotal
      ) values (
        v_factura_id, (v_item->>'referenceId')::uuid,
        nullif(v_item->>'appointmentId', '')::uuid,
        v_item->>'description', (v_item->>'total')::numeric,
        (v_item->>'quantity')::integer, (v_item->>'unitPrice')::numeric,
        (v_item->>'discountPercent')::numeric, (v_item->>'total')::numeric
      );
    else
      insert into public.factura_items (
        factura_id, variante_id, nombre_producto, cantidad, precio_unitario,
        subtotal, sku, descuento_porcentaje
      ) values (
        v_factura_id, (v_item->>'referenceId')::uuid,
        v_item->>'description', (v_item->>'quantity')::integer,
        (v_item->>'unitPrice')::numeric, (v_item->>'total')::numeric,
        nullif(v_item->>'sku', ''), (v_item->>'discountPercent')::numeric
      )
      returning factura_items.id into v_factura_item_id;

      -- El trigger del ledger valida stock nuevamente y actualiza el saldo en
      -- la misma transacción. Cualquier error revierte también la factura.
      insert into public.movimientos_inventario (
        variante_id, sede_id, tipo, cantidad, motivo, usuario_id,
        factura_item_id
      ) values (
        (v_item->>'referenceId')::uuid, p_sede_id, 'salida',
        (v_item->>'quantity')::integer,
        'Venta ' || v_numero, (select auth.uid()), v_factura_item_id
      );
    end if;
  end loop;

  return query select v_factura_id, v_numero;
end;
$$;

revoke all on function public.crear_factura(
  uuid, uuid, date, text, text, text, text, text, text, text,
  text, text, text, numeric, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.crear_factura(
  uuid, uuid, date, text, text, text, text, text, text, text,
  text, text, text, numeric, jsonb
) to authenticated, service_role;

create or replace function public.actualizar_estado_factura(
  p_factura_id uuid,
  p_estado text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
  v_factura record;
  v_item record;
begin
  if (select auth.uid()) is null
     or v_rol not in (
       'admin'::public.rol_usuario,
       'empleado'::public.rol_usuario,
       'vendedor'::public.rol_usuario
     ) then
    raise exception 'No autorizado para modificar facturas' using errcode = '42501';
  end if;
  if p_estado not in ('pagada', 'pendiente', 'anulada', 'borrador') then
    raise exception 'Estado de factura inválido' using errcode = '22023';
  end if;

  select f.id, f.sede_id, f.estado, f.numero_factura
  into v_factura
  from public.facturas f
  where f.id = p_factura_id
  for update;
  if not found then
    raise exception 'Factura no encontrada' using errcode = 'P0002';
  end if;
  if v_rol <> 'admin'::public.rol_usuario
     and v_factura.sede_id is distinct from public.sede_actual() then
    raise exception 'Solo puede modificar facturas de su sede' using errcode = '42501';
  end if;
  if v_factura.estado = p_estado then
    return;
  end if;
  if v_factura.estado = 'anulada' then
    raise exception 'Una factura anulada no puede reactivarse' using errcode = '22023';
  end if;

  if p_estado = 'anulada' then
    for v_item in
      select fi.id, fi.variante_id, fi.cantidad
      from public.factura_items fi
      where fi.factura_id = p_factura_id
        and fi.variante_id is not null
      order by fi.id
    loop
      insert into public.movimientos_inventario (
        variante_id, sede_id, tipo, cantidad, motivo, usuario_id,
        factura_item_id
      ) values (
        v_item.variante_id, v_factura.sede_id, 'entrada', v_item.cantidad,
        'Reversión por anulación ' || v_factura.numero_factura,
        (select auth.uid()), v_item.id
      );
    end loop;
  end if;

  update public.facturas
  set estado = p_estado
  where id = p_factura_id;
end;
$$;

revoke all on function public.actualizar_estado_factura(uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.actualizar_estado_factura(uuid, text)
to authenticated, service_role;
