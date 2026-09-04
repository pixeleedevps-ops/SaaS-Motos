-- Evita políticas ALL superpuestas con SELECT y evalúa auth.uid()/auth.role()
-- una sola vez por consulta. El catálogo de productos es legible por cualquier
-- usuario autenticado de forma intencional; las escrituras siguen limitadas al
-- personal autorizado.

drop policy if exists productos_admin_write on public.productos;
drop policy if exists productos_select on public.productos;

create policy productos_select_authenticated
on public.productos for select to authenticated
using (true);

create policy productos_insert_staff
on public.productos for insert to authenticated
with check ((select public.rol_actual()) in ('admin', 'empleado'));

create policy productos_update_staff
on public.productos for update to authenticated
using ((select public.rol_actual()) in ('admin', 'empleado'))
with check ((select public.rol_actual()) in ('admin', 'empleado'));

create policy productos_delete_admin
on public.productos for delete to authenticated
using ((select public.rol_actual()) = 'admin');

drop policy if exists inventario_admin_write on public.inventario_sede;
drop policy if exists inventario_select on public.inventario_sede;

create policy inventario_select_staff
on public.inventario_sede for select to authenticated
using (
  (select public.rol_actual()) = 'admin'
  or sede_id = (select public.sede_actual())
);

create policy inventario_insert_staff
on public.inventario_sede for insert to authenticated
with check (
  (select public.rol_actual()) = 'admin'
  or ((select public.rol_actual()) = 'empleado' and sede_id = (select public.sede_actual()))
);

create policy inventario_update_staff
on public.inventario_sede for update to authenticated
using (
  (select public.rol_actual()) = 'admin'
  or ((select public.rol_actual()) = 'empleado' and sede_id = (select public.sede_actual()))
)
with check (
  (select public.rol_actual()) = 'admin'
  or ((select public.rol_actual()) = 'empleado' and sede_id = (select public.sede_actual()))
);

create policy inventario_delete_admin
on public.inventario_sede for delete to authenticated
using ((select public.rol_actual()) = 'admin');

alter policy asistencia_select on public.asistencia_empleados
using (
  (select public.rol_actual()) = 'admin'
  or sede_id = (select public.sede_actual())
  or empleado_id in (
    select e.id from public.empleados e where e.usuario_id = (select auth.uid())
  )
);

alter policy facturas_select on public.facturas
using (
  cliente_id = (select auth.uid())
  or (select public.rol_actual()) = 'admin'
  or sede_id = (select public.sede_actual())
);

alter policy factura_items_select on public.factura_items
using (
  exists (
    select 1 from public.facturas f
    where f.id = factura_items.factura_id
      and (
        f.cliente_id = (select auth.uid())
        or (select public.rol_actual()) = 'admin'
        or f.sede_id = (select public.sede_actual())
      )
  )
);

create index if not exists variante_valores_valor_atributo_id_idx
  on public.variante_valores (valor_atributo_id);
