-- Los helpers de RLS deben funcionar también desde funciones con search_path vacío.
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select u.rol from public.usuarios u where u.id = auth.uid();
$$;

create or replace function public.sede_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.sede_id from public.empleados e where e.usuario_id = auth.uid();
$$;

revoke all on function public.rol_actual() from public, anon;
revoke all on function public.sede_actual() from public, anon;
grant execute on function public.rol_actual() to authenticated;
grant execute on function public.sede_actual() to authenticated;

revoke all on function public.crear_factura(uuid,uuid,date,text,text,text,text,text,text,text,text,text,text,numeric,jsonb) from public, anon;
revoke all on function public.actualizar_estado_factura(uuid,text) from public, anon;
grant execute on function public.crear_factura(uuid,uuid,date,text,text,text,text,text,text,text,text,text,text,numeric,jsonb) to authenticated;
grant execute on function public.actualizar_estado_factura(uuid,text) to authenticated;

revoke all on function public.encolar_sms_cita_completada() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = '';
