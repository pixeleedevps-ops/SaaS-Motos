-- FASE 2 (A-09 parcial): asistencia persistente y consistente.
-- Preparada para staging. No aplicar directamente en producción.

do $$
begin
  if exists (
    select 1
    from public.asistencia_empleados
    group by empleado_id, fecha
    having count(*) > 1
  ) then
    raise exception 'Existen asistencias duplicadas por empleado/fecha; deben revisarse antes de crear la restricción';
  end if;
end $$;

create unique index if not exists asistencia_empleado_fecha_unique
  on public.asistencia_empleados (empleado_id, fecha);

create or replace function public.registrar_asistencia(
  p_tipo text,
  p_empleado_id uuid default null
)
returns table (
  id uuid,
  empleado_id uuid,
  sede_id uuid,
  fecha date,
  hora_entrada timestamptz,
  hora_salida timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := public.rol_actual();
  v_empleado_id uuid;
  v_empleado record;
  v_fecha date := (now() at time zone 'America/Bogota')::date;
  v_registro public.asistencia_empleados%rowtype;
begin
  if (select auth.uid()) is null
     or v_rol not in (
       'admin'::public.rol_usuario,
       'empleado'::public.rol_usuario,
       'vendedor'::public.rol_usuario,
       'mecanico'::public.rol_usuario
     ) then
    raise exception 'No autorizado para registrar asistencia' using errcode = '42501';
  end if;
  if p_tipo not in ('checkIn', 'checkOut') then
    raise exception 'Tipo de marcación inválido' using errcode = '22023';
  end if;

  if v_rol = 'admin'::public.rol_usuario then
    v_empleado_id := coalesce(p_empleado_id, public.empleado_actual_id());
  else
    v_empleado_id := public.empleado_actual_id();
    if p_empleado_id is not null and p_empleado_id is distinct from v_empleado_id then
      raise exception 'Solo puede registrar su propia asistencia' using errcode = '42501';
    end if;
  end if;

  select e.id, e.sede_id, e.activo
  into v_empleado
  from public.empleados e
  where e.id = v_empleado_id;
  if not found or not v_empleado.activo then
    raise exception 'Empleado no encontrado o inactivo' using errcode = 'P0002';
  end if;
  if v_rol <> 'admin'::public.rol_usuario
     and v_empleado.sede_id is distinct from public.sede_actual() then
    raise exception 'El empleado no pertenece a su sede' using errcode = '42501';
  end if;

  select a.*
  into v_registro
  from public.asistencia_empleados a
  where a.empleado_id = v_empleado_id
    and a.fecha = v_fecha
  for update;

  if p_tipo = 'checkIn' then
    if found then
      if v_registro.hora_salida is null then
        raise exception 'Ya existe una entrada abierta para hoy' using errcode = '22023';
      end if;
      raise exception 'La jornada de hoy ya fue cerrada' using errcode = '22023';
    end if;

    insert into public.asistencia_empleados (
      empleado_id, sede_id, fecha, hora_entrada
    ) values (
      v_empleado_id, v_empleado.sede_id, v_fecha, now()
    )
    returning * into v_registro;
  else
    if not found or v_registro.hora_entrada is null then
      raise exception 'No existe una entrada abierta para hoy' using errcode = '22023';
    end if;
    if v_registro.hora_salida is not null then
      raise exception 'La salida de hoy ya fue registrada' using errcode = '22023';
    end if;

    update public.asistencia_empleados a
    set hora_salida = now()
    where a.id = v_registro.id
    returning * into v_registro;
  end if;

  return query
  select
    v_registro.id,
    v_registro.empleado_id,
    v_registro.sede_id,
    v_registro.fecha,
    v_registro.hora_entrada,
    v_registro.hora_salida;
end;
$$;

revoke all on function public.registrar_asistencia(text, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.registrar_asistencia(text, uuid)
to authenticated, service_role;
