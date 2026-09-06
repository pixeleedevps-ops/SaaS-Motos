-- FASE 2 (A-01/A-02/A-08): catálogo seguro e inventario paginado por sede.
-- Preparada para staging. No aplicar directamente en producción.

-- El catálogo general nunca expone el costo de adquisición.
drop view if exists public.catalogo_productos_publico;
create view public.catalogo_productos_publico
with (security_invoker = true)
as
select
  p.id,
  p.nombre,
  p.descripcion,
  p.marca_id,
  p.tipo_id,
  p.sku_base,
  p.precio,
  p.imagen_url,
  p.activo,
  p.sede_id,
  p.garantia_duracion,
  p.garantia_unidad,
  p.created_at,
  p.updated_at
from public.productos p
where p.activo;

revoke all on public.catalogo_productos_publico from public, anon;
grant select on public.catalogo_productos_publico to authenticated;

drop policy if exists productos_select_authenticated on public.productos;
create policy productos_select_authenticated
on public.productos
for select
to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in (
      'empleado'::public.rol_usuario,
      'vendedor'::public.rol_usuario
    )
    and sede_id = (select public.sede_actual())
  )
  or (
    (select public.rol_actual()) = 'cliente'::public.rol_usuario
    and activo
  )
);

drop policy if exists productos_insert_staff on public.productos;
create policy productos_insert_staff
on public.productos
for insert
to authenticated
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists productos_update_staff on public.productos;
create policy productos_update_staff
on public.productos
for update
to authenticated
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

-- La tabla base deja de entregar costo a sesiones web. El personal obtiene el
-- dato únicamente mediante la RPC acotada por rol y sede definida abajo.
revoke select on table public.productos from authenticated;
grant select (
  id, nombre, descripcion, marca_id, tipo_id, sku_base, precio, imagen_url,
  activo, sede_id, garantia_duracion, garantia_unidad, created_at, updated_at
) on table public.productos to authenticated;

drop policy if exists inventario_select_staff on public.inventario_sede;
create policy inventario_select_staff
on public.inventario_sede
for select
to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists inventario_insert_staff on public.inventario_sede;
create policy inventario_insert_staff
on public.inventario_sede
for insert
to authenticated
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists inventario_update_staff on public.inventario_sede;
create policy inventario_update_staff
on public.inventario_sede
for update
to authenticated
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

drop policy if exists movimientos_select on public.movimientos_inventario;
create policy movimientos_select
on public.movimientos_inventario
for select
to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists movimientos_insert on public.movimientos_inventario;
create policy movimientos_insert
on public.movimientos_inventario
for insert
to authenticated
with check (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and sede_id = (select public.sede_actual())
  )
);

drop policy if exists traslados_productos_staff_select on public.traslados_productos;
create policy traslados_productos_staff_select
on public.traslados_productos
for select
to authenticated
using (
  (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and (
      sede_origen_id = (select public.sede_actual())
      or sede_destino_id = (select public.sede_actual())
    )
  )
);

-- Lectura de inventario para la aplicación: siempre paginada y validada. El
-- vendedor puede consultar su sede, pero nunca escribir ni consultar otra.
create or replace function public.inventario_paginado(
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
    raise exception 'No autorizado para consultar inventario' using errcode = '42501';
  end if;

  if v_rol <> 'admin'::public.rol_usuario then
    if v_sede is null then
      raise exception 'El usuario no tiene una sede asignada' using errcode = '42501';
    end if;
    if p_sede_id is not null and p_sede_id is distinct from v_sede then
      raise exception 'No puede consultar inventario de otra sede' using errcode = '42501';
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
from public, anon, authenticated, service_role;
grant execute on function public.inventario_paginado(uuid, integer, integer)
to authenticated, service_role;

-- Las funciones SECURITY DEFINER siguen haciendo su propia verificación. Esta
-- migración redefine sus controles en otra fase; entre tanto, se revoca la
-- ejecución del vendedor mediante funciones de guardia específicas del rol.
create or replace function public.configurar_garantia_producto(
  p_producto_id uuid,
  p_duracion integer,
  p_unidad text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
begin
  if v_rol not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No autorizado para configurar la garantía' using errcode = '42501';
  end if;
  if (p_duracion is null) <> (p_unidad is null)
     or (p_duracion is not null and (p_duracion <= 0 or p_unidad not in ('dias', 'meses', 'anios'))) then
    raise exception 'Duración de garantía inválida' using errcode = '22023';
  end if;
  update public.productos p
  set garantia_duracion = p_duracion,
      garantia_unidad = p_unidad,
      updated_at = now()
  where p.id = p_producto_id
    and (
      v_rol = 'admin'::public.rol_usuario
      or p.sede_id = public.sede_actual()
    );
  if not found then
    raise exception 'Producto no encontrado o fuera de su sede' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.configurar_garantia_producto(uuid, integer, text)
from public, anon, authenticated, service_role;
grant execute on function public.configurar_garantia_producto(uuid, integer, text)
to authenticated, service_role;
