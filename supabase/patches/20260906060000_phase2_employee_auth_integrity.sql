-- FASE 2 (A-06 parcial): integridad del vínculo empleado -> Auth/usuarios.
-- Las cuentas reales deben crearse en staging con credenciales consentidas;
-- esta migración no crea usuarios ficticios ni asigna contraseñas.

create unique index if not exists empleados_usuario_id_unique
  on public.empleados (usuario_id)
  where usuario_id is not null;

create or replace function private.validar_usuario_empleado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario record;
begin
  if new.usuario_id is null then
    return new;
  end if;

  select u.rol, u.sede_id, u.activo
  into v_usuario
  from public.usuarios u
  where u.id = new.usuario_id;
  if not found then
    raise exception 'La cuenta de usuario asociada no existe' using errcode = '23503';
  end if;
  if not v_usuario.activo
     or v_usuario.rol not in (
       'empleado'::public.rol_usuario,
       'mecanico'::public.rol_usuario,
       'vendedor'::public.rol_usuario
     ) then
    raise exception 'La cuenta asociada debe ser un perfil operativo activo' using errcode = '23514';
  end if;
  if v_usuario.sede_id is not null
     and v_usuario.sede_id is distinct from new.sede_id then
    raise exception 'La sede del usuario no coincide con la sede del empleado' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validar_usuario_empleado()
from public, anon, authenticated, service_role;

drop trigger if exists trg_empleados_validar_usuario on public.empleados;
create trigger trg_empleados_validar_usuario
before insert or update of usuario_id, sede_id
on public.empleados
for each row execute function private.validar_usuario_empleado();
