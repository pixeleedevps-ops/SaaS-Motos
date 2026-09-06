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

create or replace function public.actualizar_estado_factura(p_factura_id uuid, p_estado text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
  v_sede uuid;
begin
  if v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario) then
    raise exception 'No autorizado para modificar facturas' using errcode = '42501';
  end if;
  if p_estado not in ('pagada', 'pendiente', 'anulada', 'borrador') then
    raise exception 'Estado de factura inválido';
  end if;
  select f.sede_id into v_sede from public.facturas f where f.id = p_factura_id;
  if not found then raise exception 'Factura no encontrada'; end if;
  if v_rol <> 'admin'::public.rol_usuario and v_sede is distinct from public.sede_actual() then
    raise exception 'Solo puede modificar facturas de su sede' using errcode = '42501';
  end if;
  update public.facturas set estado = p_estado where facturas.id = p_factura_id;
end;
$$;

revoke all on function public.crear_factura(uuid,uuid,date,text,text,text,text,text,text,text,text,text,text,numeric,jsonb) from public, anon;
revoke all on function public.actualizar_estado_factura(uuid,text) from public, anon;
grant execute on function public.crear_factura(uuid,uuid,date,text,text,text,text,text,text,text,text,text,text,numeric,jsonb) to authenticated, service_role;
grant execute on function public.actualizar_estado_factura(uuid,text) to authenticated, service_role;
