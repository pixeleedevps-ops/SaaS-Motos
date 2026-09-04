-- Evita recalcular auth.uid()/helpers estables por cada fila en las políticas nuevas.
drop policy if exists empleados_select_staff on public.empleados;
create policy empleados_select_staff on public.empleados
  for select to authenticated
  using ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario));

drop policy if exists empleados_insert_admin on public.empleados;
create policy empleados_insert_admin on public.empleados
  for insert to authenticated
  with check ((select public.rol_actual()) = 'admin'::public.rol_usuario);

drop policy if exists empleados_update_admin on public.empleados;
create policy empleados_update_admin on public.empleados
  for update to authenticated
  using ((select public.rol_actual()) = 'admin'::public.rol_usuario)
  with check ((select public.rol_actual()) = 'admin'::public.rol_usuario);

drop policy if exists empleados_delete_admin on public.empleados;
create policy empleados_delete_admin on public.empleados
  for delete to authenticated
  using ((select public.rol_actual()) = 'admin'::public.rol_usuario);

drop policy if exists factura_servicios_select on public.factura_servicios;
create policy factura_servicios_select on public.factura_servicios
  for select to authenticated
  using (
    exists (
      select 1 from public.facturas f
      where f.id = factura_servicios.factura_id
        and (
          f.cliente_id = (select auth.uid())
          or (select public.rol_actual()) = 'admin'::public.rol_usuario
          or f.sede_id = (select public.sede_actual())
        )
    )
  );

drop policy if exists notificaciones_select on public.notificaciones;
create policy notificaciones_select on public.notificaciones
  for select to authenticated
  using (
    cliente_id = (select auth.uid())
    or (select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario)
  );

drop policy if exists notificaciones_update_staff on public.notificaciones;
create policy notificaciones_update_staff on public.notificaciones
  for update to authenticated
  using ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario))
  with check ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario));
