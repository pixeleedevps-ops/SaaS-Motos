-- Despacho automático y endurecimiento final de CRUD relacionados.

create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_webhook_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'push_webhook_secret',
      'Secreto interno generado para autenticar Postgres frente a send-push-notification'
    );
  end if;
end $$;

create or replace function public.verify_push_webhook_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(p_secret, '') = (
      select ds.decrypted_secret
      from vault.decrypted_secrets ds
      where ds.name = 'push_webhook_secret'
      limit 1
    ),
    false
  );
$$;

revoke all on function public.verify_push_webhook_secret(text) from public, anon, authenticated;
grant execute on function public.verify_push_webhook_secret(text) to service_role;

create or replace function public.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_webhook_secret'
  limit 1;

  if nullif(v_secret, '') is null then
    raise warning 'push_dispatch_skipped notification_id=% reason=missing_internal_secret', new.id;
    return new;
  end if;

  perform net.http_post(
    url := 'https://ioequrikfgrrdkebmbcg.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object('notificationId', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- El estado de la cita y la fila del outbox deben persistir aunque falle el transporte.
  raise warning 'push_dispatch_failed notification_id=% code=%', new.id, sqlstate;
  return new;
end;
$$;

revoke all on function public.dispatch_push_notification() from public, anon, authenticated;

drop trigger if exists trg_notifications_dispatch_push on public.notifications;
create trigger trg_notifications_dispatch_push
after insert on public.notifications
for each row execute function public.dispatch_push_notification();

-- Un cliente puede radicar una reclamación, pero no aprobarla ni asignar costos/técnicos.
create or replace function public.proteger_reclamacion_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.rol_actual() not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    new.estado := 'en_revision';
    new.tecnico_id := null;
    new.resolucion := null;
    new.costo_cubierto := 0;
  end if;
  return new;
end;
$$;

revoke all on function public.proteger_reclamacion_cliente() from public, anon, authenticated;

drop trigger if exists trg_reclamaciones_proteger_cliente on public.reclamaciones_garantia;
create trigger trg_reclamaciones_proteger_cliente
before insert on public.reclamaciones_garantia
for each row execute function public.proteger_reclamacion_cliente();

-- CRUD de servicios: lectura autenticada y escritura administrativa/operativa.
drop policy if exists servicios_insert_staff on public.servicios;
create policy servicios_insert_staff on public.servicios
  for insert to authenticated
  with check ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario));

drop policy if exists servicios_update_staff on public.servicios;
create policy servicios_update_staff on public.servicios
  for update to authenticated
  using ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario))
  with check ((select public.rol_actual()) in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario));

revoke all on table public.servicios from anon;
grant select, insert, update on table public.servicios to authenticated;

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
begin
  if public.rol_actual() not in ('admin'::public.rol_usuario, 'empleado'::public.rol_usuario) then
    raise exception 'No autorizado para configurar la garantía' using errcode = '42501';
  end if;
  if (p_duracion is null) <> (p_unidad is null)
     or (p_duracion is not null and (p_duracion <= 0 or p_unidad not in ('dias', 'meses', 'anios'))) then
    raise exception 'Duración de garantía inválida';
  end if;
  update public.productos
  set garantia_duracion = p_duracion, garantia_unidad = p_unidad
  where id = p_producto_id;
  if not found then raise exception 'Producto no encontrado'; end if;
end;
$$;

revoke all on function public.configurar_garantia_producto(uuid,integer,text) from public, anon;
grant execute on function public.configurar_garantia_producto(uuid,integer,text) to authenticated;

