-- FASE 1: aislamiento de clientes y vehículos por sede.
-- Preparada para staging. No aplicar directamente en producción.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.cliente_relacionado_con_sede_actual(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and public.rol_actual() in (
      'empleado'::public.rol_usuario,
      'vendedor'::public.rol_usuario
    )
    and public.sede_actual() is not null
    and (
      exists (
        select 1
        from public.citas c
        where c.cliente_id = p_cliente_id
          and c.sede_id = public.sede_actual()
      )
      or exists (
        select 1
        from public.facturas f
        where f.cliente_id = p_cliente_id
          and f.sede_id = public.sede_actual()
      )
    );
$$;

revoke all on function private.cliente_relacionado_con_sede_actual(uuid)
from public, anon, authenticated, service_role;
grant execute on function private.cliente_relacionado_con_sede_actual(uuid)
to authenticated;

create index if not exists citas_cliente_sede_idx
on public.citas (cliente_id, sede_id);

create index if not exists facturas_cliente_sede_idx
on public.facturas (cliente_id, sede_id);

drop policy if exists usuarios_select_propio on public.usuarios;
create policy usuarios_select_propio
on public.usuarios
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) in (
      'empleado'::public.rol_usuario,
      'vendedor'::public.rol_usuario
    )
    and rol = 'cliente'::public.rol_usuario
    and (select private.cliente_relacionado_con_sede_actual(usuarios.id))
  )
  or (
    (select public.rol_actual()) = 'mecanico'::public.rol_usuario
    and rol = 'cliente'::public.rol_usuario
    and exists (
      select 1
      from public.citas c
      where c.cliente_id = usuarios.id
        and c.empleado_id = (select public.empleado_actual_id())
    )
  )
);

drop policy if exists motos_select on public.motos_clientes;
create policy motos_select
on public.motos_clientes
for select
to authenticated
using (
  (
    (select public.rol_actual()) = 'cliente'::public.rol_usuario
    and cliente_id = (select auth.uid())
  )
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and (select private.cliente_relacionado_con_sede_actual(motos_clientes.cliente_id))
  )
  or (
    (select public.rol_actual()) = 'mecanico'::public.rol_usuario
    and exists (
      select 1
      from public.citas c
      where c.moto_id = motos_clientes.id
        and c.empleado_id = (select public.empleado_actual_id())
    )
  )
);

drop policy if exists motos_insert on public.motos_clientes;
create policy motos_insert
on public.motos_clientes
for insert
to authenticated
with check (
  (
    (select public.rol_actual()) = 'cliente'::public.rol_usuario
    and cliente_id = (select auth.uid())
  )
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and (select private.cliente_relacionado_con_sede_actual(motos_clientes.cliente_id))
  )
);

drop policy if exists motos_update on public.motos_clientes;
create policy motos_update
on public.motos_clientes
for update
to authenticated
using (
  (
    (select public.rol_actual()) = 'cliente'::public.rol_usuario
    and cliente_id = (select auth.uid())
  )
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and (select private.cliente_relacionado_con_sede_actual(motos_clientes.cliente_id))
  )
)
with check (
  (
    (select public.rol_actual()) = 'cliente'::public.rol_usuario
    and cliente_id = (select auth.uid())
  )
  or (select public.rol_actual()) = 'admin'::public.rol_usuario
  or (
    (select public.rol_actual()) = 'empleado'::public.rol_usuario
    and (select private.cliente_relacionado_con_sede_actual(motos_clientes.cliente_id))
  )
);

create or replace function public.motos_cliente_para_agendamiento(p_cliente_id uuid)
returns table (id uuid, placa text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
begin
  if (select auth.uid()) is null then
    raise exception 'Sesión requerida' using errcode = '42501';
  end if;

  if v_rol = 'vendedor'::public.rol_usuario
     and not private.cliente_relacionado_con_sede_actual(p_cliente_id) then
    raise exception 'El cliente no está relacionado con su sede' using errcode = '42501';
  end if;

  if v_rol not in (
    'admin'::public.rol_usuario,
    'empleado'::public.rol_usuario,
    'vendedor'::public.rol_usuario
  ) then
    raise exception 'No autorizado para consultar motos de agendamiento' using errcode = '42501';
  end if;

  return query
  select m.id, m.placa
  from public.motos_clientes m
  where m.cliente_id = p_cliente_id
    and m.activo
  order by m.placa;
end;
$$;

revoke all on function public.motos_cliente_para_agendamiento(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.motos_cliente_para_agendamiento(uuid)
to authenticated, service_role;

