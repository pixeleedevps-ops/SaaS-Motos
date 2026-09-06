-- FASE 2 (A-07): integridad de citas y escrituras por RPC acotada.
-- Preparada para staging. No aplicar directamente en producción.

create or replace function private.validar_relaciones_cita()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.usuarios u
    where u.id = new.cliente_id
      and u.rol = 'cliente'::public.rol_usuario
      and u.activo
  ) then
    raise exception 'El cliente no existe o está inactivo' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.sedes s
    where s.id = new.sede_id
      and s.activo
      and s.tipo = 'Sede'::public.tipo_ubicacion
  ) then
    raise exception 'Las citas solo pueden agendarse en una sede de taller activa' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.servicios s where s.id = new.servicio_id and s.activo
  ) then
    raise exception 'El servicio no existe o está inactivo' using errcode = '23514';
  end if;

  if new.moto_id is not null and not exists (
    select 1
    from public.motos_clientes m
    where m.id = new.moto_id
      and m.cliente_id = new.cliente_id
      and m.activo
  ) then
    raise exception 'La moto no pertenece al cliente de la cita' using errcode = '23514';
  end if;

  if new.empleado_id is not null and not exists (
    select 1
    from public.empleados e
    where e.id = new.empleado_id
      and e.sede_id = new.sede_id
      and e.activo
  ) then
    raise exception 'El técnico no pertenece a la sede o está inactivo' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validar_relaciones_cita()
from public, anon, authenticated, service_role;

drop trigger if exists trg_citas_validar_relaciones on public.citas;
create trigger trg_citas_validar_relaciones
before insert or update of cliente_id, moto_id, empleado_id, servicio_id, sede_id
on public.citas
for each row execute function private.validar_relaciones_cita();

create or replace function public.cambiar_estado_cita(
  p_cita_id uuid,
  p_estado public.estado_cita,
  p_estado_version integer
)
returns table (id uuid, estado public.estado_cita, estado_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
  v_cita record;
begin
  if (select auth.uid()) is null
     or v_rol not in (
       'admin'::public.rol_usuario,
       'empleado'::public.rol_usuario,
       'vendedor'::public.rol_usuario,
       'mecanico'::public.rol_usuario
     ) then
    raise exception 'No autorizado para cambiar el estado de la cita' using errcode = '42501';
  end if;

  select c.id, c.sede_id, c.empleado_id, c.estado, c.estado_version
  into v_cita
  from public.citas c
  where c.id = p_cita_id
  for update;
  if not found then
    raise exception 'Cita no encontrada' using errcode = 'P0002';
  end if;

  if v_rol in ('empleado'::public.rol_usuario, 'vendedor'::public.rol_usuario)
     and v_cita.sede_id is distinct from public.sede_actual() then
    raise exception 'No puede modificar citas de otra sede' using errcode = '42501';
  end if;
  if v_rol = 'mecanico'::public.rol_usuario
     and v_cita.empleado_id is distinct from public.empleado_actual_id() then
    raise exception 'Solo puede modificar sus citas asignadas' using errcode = '42501';
  end if;
  if v_cita.estado_version is distinct from p_estado_version then
    raise exception 'La cita fue modificada por otro usuario; recargue e intente nuevamente'
      using errcode = '40001';
  end if;
  if v_cita.estado in (
    'completada'::public.estado_cita,
    'cancelada'::public.estado_cita
  ) and v_cita.estado is distinct from p_estado then
    raise exception 'Una cita completada o cancelada no puede reabrirse' using errcode = '22023';
  end if;

  update public.citas c
  set estado = p_estado,
      updated_at = now()
  where c.id = p_cita_id;

  return query
  select c.id, c.estado, c.estado_version
  from public.citas c
  where c.id = p_cita_id;
end;
$$;

revoke all on function public.cambiar_estado_cita(uuid, public.estado_cita, integer)
from public, anon, authenticated, service_role;
grant execute on function public.cambiar_estado_cita(uuid, public.estado_cita, integer)
to authenticated, service_role;

create or replace function public.reagendar_cita(
  p_cita_id uuid,
  p_fecha_hora timestamptz,
  p_empleado_id uuid
)
returns table (id uuid, fecha_hora timestamptz, empleado_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
  v_cita record;
begin
  if (select auth.uid()) is null
     or v_rol not in (
       'admin'::public.rol_usuario,
       'empleado'::public.rol_usuario,
       'vendedor'::public.rol_usuario
     ) then
    raise exception 'No autorizado para reagendar citas' using errcode = '42501';
  end if;
  if p_fecha_hora is null then
    raise exception 'La nueva fecha y hora son obligatorias' using errcode = '22023';
  end if;

  select c.id, c.sede_id, c.estado
  into v_cita
  from public.citas c
  where c.id = p_cita_id
  for update;
  if not found then
    raise exception 'Cita no encontrada' using errcode = 'P0002';
  end if;
  if v_rol <> 'admin'::public.rol_usuario
     and v_cita.sede_id is distinct from public.sede_actual() then
    raise exception 'No puede reagendar citas de otra sede' using errcode = '42501';
  end if;
  if v_cita.estado in (
    'completada'::public.estado_cita,
    'cancelada'::public.estado_cita
  ) then
    raise exception 'No se puede reagendar una cita completada o cancelada' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.empleados e
    where e.id = p_empleado_id
      and e.sede_id = v_cita.sede_id
      and e.activo
  ) then
    raise exception 'El técnico no pertenece a la sede o está inactivo' using errcode = '23514';
  end if;

  update public.citas c
  set fecha_hora = p_fecha_hora,
      empleado_id = p_empleado_id,
      updated_at = now()
  where c.id = p_cita_id;

  return query
  select c.id, c.fecha_hora, c.empleado_id
  from public.citas c
  where c.id = p_cita_id;
end;
$$;

revoke all on function public.reagendar_cita(uuid, timestamptz, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.reagendar_cita(uuid, timestamptz, uuid)
to authenticated, service_role;

-- Todos los perfiles autenticados comparten el rol PostgreSQL `authenticated`.
-- Por eso el UPDATE directo se revoca y cada rol pasa por las RPCs anteriores.
revoke update on table public.citas from authenticated;
