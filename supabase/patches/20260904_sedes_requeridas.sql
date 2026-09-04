-- Ejecutar en Supabase SQL Editor (el MCP configurado es read-only).
insert into public.sedes (nombre, direccion, ciudad, tipo)
select '7 de agosto', null, 'Bogotá', 'Sede'::tipo_ubicacion
where not exists (select 1 from public.sedes where lower(nombre)=lower('7 de agosto'));
insert into public.sedes (nombre, direccion, ciudad, tipo)
select '1ero de mayo', null, 'Bogotá', 'Sede'::tipo_ubicacion
where not exists (select 1 from public.sedes where lower(nombre)=lower('1ero de mayo'));
insert into public.sedes (nombre, direccion, ciudad, tipo)
select 'Bodega', null, null, 'bodega'::tipo_ubicacion
where not exists (select 1 from public.sedes where lower(nombre)=lower('Bodega'));
