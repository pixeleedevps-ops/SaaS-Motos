-- Productos simples/variables, catálogos reutilizables y lectura paginada.
-- Todas las escrituras de catálogo y producto pasan por RPCs con validación
-- explícita de identidad, rol y sede.

alter table public.atributos enable row level security;
alter table public.valores_atributo enable row level security;
alter table public.variante_valores enable row level security;

drop policy if exists atributos_authenticated_select on public.atributos;
create policy atributos_authenticated_select
on public.atributos for select to authenticated
using (true);

drop policy if exists valores_atributo_authenticated_select on public.valores_atributo;
create policy valores_atributo_authenticated_select
on public.valores_atributo for select to authenticated
using (true);

drop policy if exists variante_valores_authenticated_select on public.variante_valores;
create policy variante_valores_authenticated_select
on public.variante_valores for select to authenticated
using (true);

grant select on table public.atributos, public.valores_atributo, public.variante_valores
to authenticated;
revoke insert, update, delete on table
  public.marcas,
  public.tipos_producto,
  public.atributos,
  public.valores_atributo,
  public.variante_valores,
  public.variantes_producto
from authenticated;

-- Evita duplicados que una PK simple no detecta: una variante no puede tener
-- dos valores pertenecientes al mismo atributo.
create or replace function private.validar_atributo_unico_variante()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atributo_id uuid;
begin
  select va.atributo_id
  into v_atributo_id
  from public.valores_atributo va
  where va.id = new.valor_atributo_id;

  if v_atributo_id is null then
    raise exception 'El valor de atributo seleccionado no existe'
      using errcode = '23503';
  end if;

  if tg_op = 'INSERT' and exists (
    select 1
    from public.variante_valores vv
    join public.valores_atributo existente
      on existente.id = vv.valor_atributo_id
    where vv.variante_id = new.variante_id
      and existente.atributo_id = v_atributo_id
  ) then
    raise exception 'Una variación no puede tener dos valores del mismo atributo'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and exists (
    select 1
    from public.variante_valores vv
    join public.valores_atributo existente
      on existente.id = vv.valor_atributo_id
    where vv.variante_id = new.variante_id
      and existente.atributo_id = v_atributo_id
      and (vv.variante_id, vv.valor_atributo_id)
        is distinct from (old.variante_id, old.valor_atributo_id)
  ) then
    raise exception 'Una variación no puede tener dos valores del mismo atributo'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validar_atributo_unico_variante() from public;

drop trigger if exists trg_variante_atributo_unico on public.variante_valores;
create trigger trg_variante_atributo_unico
before insert or update on public.variante_valores
for each row execute function private.validar_atributo_unico_variante();

create or replace function public.crear_opcion_catalogo_producto(
  p_catalogo text,
  p_nombre text,
  p_atributo_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
  v_catalogo text := lower(btrim(coalesce(p_catalogo, '')));
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_id uuid;
begin
  if (select auth.uid()) is null
     or v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No tiene permiso para administrar catálogos de producto'
      using errcode = '42501';
  end if;

  if v_nombre = '' or char_length(v_nombre) > 80 then
    raise exception 'El nombre debe contener entre 1 y 80 caracteres'
      using errcode = '22023';
  end if;

  if v_catalogo = 'marca' then
    select m.id into v_id
    from public.marcas m
    where lower(btrim(m.nombre)) = lower(v_nombre)
    limit 1;
    if v_id is null then
      insert into public.marcas (nombre) values (v_nombre)
      returning id into v_id;
    end if;
  elsif v_catalogo = 'categoria' then
    select t.id into v_id
    from public.tipos_producto t
    where lower(btrim(t.nombre)) = lower(v_nombre)
    limit 1;
    if v_id is null then
      insert into public.tipos_producto (nombre) values (v_nombre)
      returning id into v_id;
    end if;
  elsif v_catalogo = 'atributo' then
    select a.id into v_id
    from public.atributos a
    where lower(btrim(a.nombre)) = lower(v_nombre)
    limit 1;
    if v_id is null then
      insert into public.atributos (nombre) values (v_nombre)
      returning id into v_id;
    end if;
  elsif v_catalogo = 'valor_atributo' then
    if p_atributo_id is null
       or not exists (select 1 from public.atributos a where a.id = p_atributo_id) then
      raise exception 'Seleccione un atributo válido antes de crear un valor'
        using errcode = '22023';
    end if;
    select va.id into v_id
    from public.valores_atributo va
    where va.atributo_id = p_atributo_id
      and lower(btrim(va.valor)) = lower(v_nombre)
    limit 1;
    if v_id is null then
      insert into public.valores_atributo (atributo_id, valor)
      values (p_atributo_id, v_nombre)
      returning id into v_id;
    end if;
  else
    raise exception 'Catálogo no permitido: %', p_catalogo
      using errcode = '22023';
  end if;

  return jsonb_build_object(
    'id', v_id,
    'nombre', v_nombre,
    'catalogo', v_catalogo,
    'atributo_id', p_atributo_id
  );
exception
  when unique_violation then
    if v_catalogo = 'marca' then
      select id into v_id from public.marcas
      where lower(btrim(nombre)) = lower(v_nombre) limit 1;
    elsif v_catalogo = 'categoria' then
      select id into v_id from public.tipos_producto
      where lower(btrim(nombre)) = lower(v_nombre) limit 1;
    elsif v_catalogo = 'atributo' then
      select id into v_id from public.atributos
      where lower(btrim(nombre)) = lower(v_nombre) limit 1;
    else
      select id into v_id from public.valores_atributo
      where atributo_id = p_atributo_id
        and lower(btrim(valor)) = lower(v_nombre) limit 1;
    end if;
    return jsonb_build_object(
      'id', v_id,
      'nombre', v_nombre,
      'catalogo', v_catalogo,
      'atributo_id', p_atributo_id
    );
end;
$$;

revoke all on function public.crear_opcion_catalogo_producto(text, text, uuid)
from public, anon, authenticated;
grant execute on function public.crear_opcion_catalogo_producto(text, text, uuid)
to authenticated;

create or replace function public.crear_producto_con_variantes(
  p_tipo_producto text,
  p_nombre text,
  p_descripcion text,
  p_sku_base text,
  p_marca_id uuid,
  p_tipo_id uuid,
  p_sede_id uuid,
  p_costo numeric,
  p_precio_base numeric,
  p_imagen_url text,
  p_garantia_duracion integer,
  p_garantia_unidad text,
  p_variantes jsonb,
  p_activo boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_rol public.rol_usuario := public.rol_actual();
  v_tipo_producto text := lower(btrim(coalesce(p_tipo_producto, '')));
  v_producto_id uuid;
  v_variante_id uuid;
  v_item jsonb;
  v_ordinal bigint;
  v_sku text;
  v_stock integer;
  v_stock_minimo integer;
  v_precio_adicional numeric;
  v_valor_ids jsonb;
  v_valor_id uuid;
  v_valores_count integer;
  v_atributos_count integer;
  v_atributos_esperados integer;
  v_combo text;
  v_combos text[] := array[]::text[];
  v_resultado jsonb := '[]'::jsonb;
begin
  if v_usuario_id is null
     or v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No tiene permiso para crear productos'
      using errcode = '42501';
  end if;

  if v_rol = 'empleado'::public.rol_usuario
     and p_sede_id is distinct from public.sede_actual() then
    raise exception 'Solo puede crear inventario en su sede asignada'
      using errcode = '42501';
  end if;

  if v_tipo_producto not in ('simple', 'variable') then
    raise exception 'Seleccione un tipo de producto válido'
      using errcode = '22023';
  end if;

  if nullif(btrim(p_nombre), '') is null
     or nullif(btrim(p_sku_base), '') is null then
    raise exception 'El nombre y el SKU base son obligatorios'
      using errcode = '22023';
  end if;

  if coalesce(p_costo, -1) < 0 or coalesce(p_precio_base, -1) < 0 then
    raise exception 'El costo y el precio no pueden ser negativos'
      using errcode = '22023';
  end if;

  if (p_garantia_duracion is null) <> (p_garantia_unidad is null)
     or (p_garantia_duracion is not null and (
       p_garantia_duracion <= 0
       or p_garantia_unidad not in ('dias', 'meses', 'anios')
     )) then
    raise exception 'La configuración de garantía no es válida'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.sedes s where s.id = p_sede_id and s.activo) then
    raise exception 'La ubicación seleccionada no existe o está inactiva'
      using errcode = '22023';
  end if;
  if not exists (select 1 from public.marcas m where m.id = p_marca_id) then
    raise exception 'La marca seleccionada no existe'
      using errcode = '23503';
  end if;
  if not exists (select 1 from public.tipos_producto t where t.id = p_tipo_id) then
    raise exception 'La categoría seleccionada no existe'
      using errcode = '23503';
  end if;

  if p_variantes is null
     or jsonb_typeof(p_variantes) <> 'array'
     or jsonb_array_length(p_variantes) = 0
     or jsonb_array_length(p_variantes) > 200 then
    raise exception 'Debe enviar entre 1 y 200 variaciones'
      using errcode = '22023';
  end if;
  if v_tipo_producto = 'simple' and jsonb_array_length(p_variantes) <> 1 then
    raise exception 'Un producto simple debe tener exactamente una variación interna'
      using errcode = '22023';
  end if;

  insert into public.productos (
    nombre,
    descripcion,
    marca_id,
    tipo_id,
    sku_base,
    costo,
    precio,
    imagen_url,
    activo,
    sede_id,
    garantia_duracion,
    garantia_unidad
  ) values (
    btrim(p_nombre),
    nullif(btrim(p_descripcion), ''),
    p_marca_id,
    p_tipo_id,
    btrim(p_sku_base),
    p_costo,
    p_precio_base,
    nullif(btrim(p_imagen_url), ''),
    p_activo,
    p_sede_id,
    p_garantia_duracion,
    p_garantia_unidad
  ) returning id into v_producto_id;

  for v_item, v_ordinal in
    select value, ordinality
    from jsonb_array_elements(p_variantes) with ordinality
  loop
    v_sku := nullif(btrim(coalesce(v_item ->> 'sku', '')), '');
    if v_sku is null then
      v_sku := btrim(p_sku_base) || '-' || lpad(v_ordinal::text, 2, '0');
    end if;

    begin
      v_stock := coalesce((v_item ->> 'stock')::integer, 0);
      v_stock_minimo := coalesce((v_item ->> 'stock_minimo')::integer, 0);
      v_precio_adicional := coalesce((v_item ->> 'precio_adicional')::numeric, 0);
    exception when invalid_text_representation then
      raise exception 'Stock, stock mínimo y precio adicional deben ser numéricos'
        using errcode = '22023';
    end;

    if v_stock < 0 or v_stock_minimo < 0 or v_precio_adicional < 0 then
      raise exception 'Stock, stock mínimo y precio adicional no pueden ser negativos'
        using errcode = '22023';
    end if;

    v_valor_ids := coalesce(v_item -> 'valor_ids', '[]'::jsonb);
    if jsonb_typeof(v_valor_ids) <> 'array' then
      raise exception 'Los valores de variación deben enviarse como una lista'
        using errcode = '22023';
    end if;
    v_valores_count := jsonb_array_length(v_valor_ids);

    if v_tipo_producto = 'simple' and v_valores_count <> 0 then
      raise exception 'La variación interna de un producto simple no usa atributos'
        using errcode = '22023';
    end if;
    if v_tipo_producto = 'variable' and v_valores_count = 0 then
      raise exception 'Cada variación debe tener al menos un valor de atributo'
        using errcode = '22023';
    end if;

    select count(*), count(distinct va.atributo_id)
    into v_valores_count, v_atributos_count
    from jsonb_array_elements_text(v_valor_ids) entrada(id)
    join public.valores_atributo va on va.id = entrada.id::uuid;

    if v_atributos_count <> jsonb_array_length(v_valor_ids) then
      raise exception 'Una variación no puede repetir atributos ni usar valores inexistentes'
        using errcode = '23514';
    end if;

    if v_tipo_producto = 'variable' then
      if v_atributos_esperados is null then
        v_atributos_esperados := v_atributos_count;
      elsif v_atributos_count <> v_atributos_esperados then
        raise exception 'Todas las variaciones deben usar el mismo conjunto de atributos'
          using errcode = '23514';
      end if;

      select string_agg(va.atributo_id::text || ':' || va.id::text, '|' order by va.atributo_id)
      into v_combo
      from jsonb_array_elements_text(v_valor_ids) entrada(id)
      join public.valores_atributo va on va.id = entrada.id::uuid;

      if v_combo = any(v_combos) then
        raise exception 'Hay una combinación de variación duplicada'
          using errcode = '23505';
      end if;
      v_combos := array_append(v_combos, v_combo);
    end if;

    insert into public.variantes_producto (
      producto_id,
      sku,
      precio_adicional,
      activo
    ) values (
      v_producto_id,
      v_sku,
      v_precio_adicional,
      coalesce((v_item ->> 'activo')::boolean, true)
    ) returning id into v_variante_id;

    for v_valor_id in
      select value::uuid from jsonb_array_elements_text(v_valor_ids)
    loop
      insert into public.variante_valores (variante_id, valor_atributo_id)
      values (v_variante_id, v_valor_id);
    end loop;

    insert into public.inventario_sede (
      variante_id,
      sede_id,
      stock,
      stock_minimo
    ) values (
      v_variante_id,
      p_sede_id,
      0,
      v_stock_minimo
    );

    if v_stock > 0 then
      insert into public.movimientos_inventario (
        variante_id,
        sede_id,
        tipo,
        cantidad,
        motivo,
        usuario_id
      ) values (
        v_variante_id,
        p_sede_id,
        'entrada'::public.tipo_movimiento,
        v_stock,
        'Stock inicial',
        v_usuario_id
      );
    end if;

    v_resultado := v_resultado || jsonb_build_array(jsonb_build_object(
      'variante_id', v_variante_id,
      'sku', v_sku
    ));
  end loop;

  return jsonb_build_object(
    'producto_id', v_producto_id,
    'tipo_producto', v_tipo_producto,
    'variantes', v_resultado
  );
exception
  when unique_violation then
    raise exception 'El SKU base o el SKU de una variación ya está registrado'
      using errcode = '23505';
end;
$$;

revoke all on function public.crear_producto_con_variantes(
  text, text, text, text, uuid, uuid, uuid, numeric, numeric, text,
  integer, text, jsonb, boolean
) from public, anon, authenticated;
grant execute on function public.crear_producto_con_variantes(
  text, text, text, text, uuid, uuid, uuid, numeric, numeric, text,
  integer, text, jsonb, boolean
) to authenticated;

-- Compatibilidad con clientes anteriores: conserva la firma pero aplica los
-- mismos permisos y la misma transacción segura del nuevo flujo.
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
language sql
security invoker
set search_path = ''
as $$
  select public.crear_producto_con_variantes(
    'simple',
    p_nombre,
    p_descripcion,
    p_sku,
    p_marca_id,
    p_tipo_id,
    p_sede_id,
    p_costo,
    p_precio,
    p_imagen_url,
    null,
    null,
    jsonb_build_array(jsonb_build_object(
      'sku', p_sku,
      'precio_adicional', 0,
      'stock', p_stock_inicial,
      'stock_minimo', p_stock_minimo,
      'activo', p_activo,
      'valor_ids', '[]'::jsonb
    )),
    p_activo
  );
$$;

revoke all on function public.crear_producto_inventario(
  text, text, text, uuid, uuid, uuid, numeric, numeric, text,
  integer, integer, boolean
) from public, anon, authenticated;
grant execute on function public.crear_producto_inventario(
  text, text, text, uuid, uuid, uuid, numeric, numeric, text,
  integer, integer, boolean
) to authenticated;

drop function if exists public.inventario_paginado(uuid, integer, integer);

create function public.inventario_paginado(
  p_sede_id uuid default null,
  p_offset integer default 0,
  p_limit integer default 100
)
returns table (
  inventario_id uuid,
  variante_id uuid,
  producto_id uuid,
  sede_id uuid,
  sede_nombre text,
  sede_tipo public.tipo_ubicacion,
  stock integer,
  stock_minimo integer,
  variante_sku text,
  precio_adicional numeric,
  variante_activa boolean,
  producto_nombre text,
  producto_descripcion text,
  imagen_url text,
  sku_base text,
  precio numeric,
  costo numeric,
  producto_activo boolean,
  garantia_duracion integer,
  garantia_unidad text,
  marca_nombre text,
  categoria_nombre text,
  atributos jsonb,
  total_filas bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
  v_sede uuid := public.sede_actual();
  v_limite integer := least(greatest(coalesce(p_limit, 100), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if (select auth.uid()) is null
     or v_rol not in (
       'admin'::public.rol_usuario,
       'empleado'::public.rol_usuario,
       'vendedor'::public.rol_usuario
     ) then
    raise exception 'No autorizado para consultar inventario'
      using errcode = '42501';
  end if;

  if v_rol <> 'admin'::public.rol_usuario then
    if v_sede is null then
      raise exception 'El usuario no tiene una sede asignada'
        using errcode = '42501';
    end if;
    if p_sede_id is not null and p_sede_id is distinct from v_sede then
      raise exception 'No puede consultar inventario de otra sede'
        using errcode = '42501';
    end if;
    p_sede_id := v_sede;
  end if;

  return query
  select
    i.id,
    v.id,
    p.id,
    i.sede_id,
    s.nombre,
    s.tipo,
    i.stock,
    i.stock_minimo,
    v.sku,
    v.precio_adicional,
    v.activo,
    p.nombre,
    p.descripcion,
    p.imagen_url,
    p.sku_base,
    p.precio,
    p.costo,
    p.activo,
    p.garantia_duracion,
    p.garantia_unidad,
    m.nombre,
    tp.nombre,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('atributo', a.nombre, 'valor', va.valor)
        order by a.nombre, va.valor
      )
      from public.variante_valores vv
      join public.valores_atributo va on va.id = vv.valor_atributo_id
      join public.atributos a on a.id = va.atributo_id
      where vv.variante_id = v.id
    ), '[]'::jsonb),
    count(*) over ()
  from public.inventario_sede i
  join public.sedes s on s.id = i.sede_id and s.activo
  join public.variantes_producto v on v.id = i.variante_id
  join public.productos p on p.id = v.producto_id
  left join public.marcas m on m.id = p.marca_id
  left join public.tipos_producto tp on tp.id = p.tipo_id
  where p_sede_id is null or i.sede_id = p_sede_id
  order by p.nombre, v.sku, i.id
  offset v_offset
  limit v_limite;
end;
$$;

revoke all on function public.inventario_paginado(uuid, integer, integer)
from public, anon, authenticated;
grant execute on function public.inventario_paginado(uuid, integer, integer)
to authenticated;
