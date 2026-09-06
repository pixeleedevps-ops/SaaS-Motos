-- Roles operativos explícitos para aplicar permisos diferentes por sede.
-- Se ejecuta por separado porque PostgreSQL no permite usar de forma segura
-- valores recién agregados al enum dentro de la misma transacción.
alter type public.rol_usuario add value if not exists 'vendedor' after 'empleado';
alter type public.rol_usuario add value if not exists 'mecanico' after 'vendedor';
