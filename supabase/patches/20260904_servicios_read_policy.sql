-- Permite que el catálogo sea visible a cualquier usuario autenticado.
-- La pantalla de la aplicación ya exige una sesión antes de ejecutar esta
-- consulta. No se abre el catálogo al rol anon.
alter table if exists public.servicios enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'servicios'
      and policyname = 'servicios_select_authenticated'
  ) then
    create policy servicios_select_authenticated
      on public.servicios for select to authenticated
      using (true);
  end if;
end $$;
