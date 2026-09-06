-- FASE 2 (A-08): agregados de reportes calculados en Postgres.
-- Preparada para staging. No aplicar directamente en producción.

create or replace function public.reporte_erp(
  p_desde date,
  p_hasta date,
  p_sede_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
  v_sede uuid := public.sede_actual();
  v_resultado jsonb;
begin
  if (select auth.uid()) is null
     or v_rol not in (
       'admin'::public.rol_usuario,
       'empleado'::public.rol_usuario,
       'vendedor'::public.rol_usuario
     ) then
    raise exception 'No autorizado para consultar reportes' using errcode = '42501';
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    raise exception 'Rango de fechas inválido' using errcode = '22023';
  end if;
  if p_hasta - p_desde > 731 then
    raise exception 'El rango no puede superar dos años' using errcode = '22023';
  end if;

  if v_rol <> 'admin'::public.rol_usuario then
    if v_sede is null then
      raise exception 'El usuario no tiene una sede asignada' using errcode = '42501';
    end if;
    if p_sede_id is not null and p_sede_id is distinct from v_sede then
      raise exception 'No puede consultar reportes de otra sede' using errcode = '42501';
    end if;
    p_sede_id := v_sede;
  elsif p_sede_id is not null and not exists (
    select 1 from public.sedes s where s.id = p_sede_id and s.activo
  ) then
    raise exception 'La sede seleccionada no existe o está inactiva' using errcode = 'P0002';
  end if;

  with facturas_validas as materialized (
    select f.id, f.sede_id, f.total
    from public.facturas f
    where f.fecha between p_desde and p_hasta
      and f.estado not in ('anulada', 'borrador')
      and (p_sede_id is null or f.sede_id = p_sede_id)
  ),
  resumen_facturas as (
    select
      count(*)::integer as facturas,
      coalesce(sum(fv.total), 0)::numeric(14,2) as ingresos
    from facturas_validas fv
  ),
  resumen_productos as (
    select coalesce(sum(fi.cantidad), 0)::bigint as unidades
    from public.factura_items fi
    join facturas_validas fv on fv.id = fi.factura_id
  ),
  servicios_demanda as (
    select
      fs.servicio_id,
      fs.nombre_servicio as nombre,
      sum(fs.cantidad)::bigint as cantidad,
      sum(fs.subtotal)::numeric(14,2) as ingresos
    from public.factura_servicios fs
    join facturas_validas fv on fv.id = fs.factura_id
    group by fs.servicio_id, fs.nombre_servicio

    union all

    select
      c.servicio_id,
      s.nombre,
      count(*)::bigint,
      0::numeric(14,2)
    from public.citas c
    join public.servicios s on s.id = c.servicio_id
    where c.estado = 'completada'::public.estado_cita
      and c.fecha_hora::date between p_desde and p_hasta
      and (p_sede_id is null or c.sede_id = p_sede_id)
      and not exists (
        select 1
        from public.factura_servicios fs
        where fs.cita_id = c.id
      )
    group by c.servicio_id, s.nombre
  ),
  resumen_servicios as (
    select coalesce(sum(sd.cantidad), 0)::bigint as cantidad
    from servicios_demanda sd
  ),
  productos as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.unidades desc, x.ingresos desc), '[]'::jsonb) as data
    from (
      select
        fi.variante_id as id,
        fi.nombre_producto as nombre,
        sum(fi.cantidad)::bigint as unidades,
        sum(fi.subtotal)::numeric(14,2) as ingresos
      from public.factura_items fi
      join facturas_validas fv on fv.id = fi.factura_id
      group by fi.variante_id, fi.nombre_producto
      order by unidades desc, ingresos desc
      limit 10
    ) x
  ),
  servicios as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.cantidad desc, x.ingresos desc), '[]'::jsonb) as data
    from (
      select
        sd.servicio_id as id,
        sd.nombre,
        sum(sd.cantidad)::bigint as cantidad,
        sum(sd.ingresos)::numeric(14,2) as ingresos
      from servicios_demanda sd
      group by sd.servicio_id, sd.nombre
      order by cantidad desc, ingresos desc
      limit 10
    ) x
  ),
  sedes as (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.nombre), '[]'::jsonb) as data
    from (
      select
        s.id,
        s.nombre,
        s.tipo,
        count(fv.id)::integer as facturas,
        coalesce(sum(fv.total), 0)::numeric(14,2) as ingresos,
        case when count(fv.id) = 0 then 0
          else round(sum(fv.total) / count(fv.id), 2)
        end::numeric(14,2) as ticket_promedio
      from public.sedes s
      left join facturas_validas fv on fv.sede_id = s.id
      where s.activo
        and (p_sede_id is null or s.id = p_sede_id)
      group by s.id, s.nombre, s.tipo
    ) x
  )
  select jsonb_build_object(
    'desde', p_desde,
    'hasta', p_hasta,
    'sede_id', p_sede_id,
    'resumen', jsonb_build_object(
      'ingresos', rf.ingresos,
      'facturas', rf.facturas,
      'ticket_promedio', case when rf.facturas = 0 then 0 else round(rf.ingresos / rf.facturas, 2) end,
      'productos_vendidos', rp.unidades,
      'servicios_realizados', rs.cantidad,
      'margen_bruto', null
    ),
    'productos', p.data,
    'servicios', sv.data,
    'sedes', se.data
  )
  into v_resultado
  from resumen_facturas rf
  cross join resumen_productos rp
  cross join resumen_servicios rs
  cross join productos p
  cross join servicios sv
  cross join sedes se;

  return v_resultado;
end;
$$;

revoke all on function public.reporte_erp(date, date, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.reporte_erp(date, date, uuid)
to authenticated, service_role;
