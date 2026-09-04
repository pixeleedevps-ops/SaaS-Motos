# SaaS-Motos

Sistema de gestión integral para talleres de motos (Motorpro): clientes, inventario, facturación, citas, garantías, actas, asistencia y analíticas.

## Requisitos

- Node.js

## Ejecutar localmente

1. Instalar dependencias:
   `npm install`
2. Ejecutar la app:
   `npm run dev`

## Supabase

1. En Supabase Dashboard > SQL Editor, ejecuta la migración ubicada en
   `supabase/migrations/202609030001_initial_motorpro.sql` (o usa `supabase db push`).
2. Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY` desde Dashboard > Connect. No uses la clave
   `service_role` en el navegador.
3. Crea las bodegas (incluida la principal) en `warehouses` y sus saldos por
   producto en `inventory_balances`. La interfaz carga esos datos al iniciar.
4. Para push móvil basado en Expo, configura `EXPO_ACCESS_TOKEN` como secreto,
   despliega `supabase/functions/push`, y crea un Database Webhook sobre
   `public.notifications` para `INSERT` dirigido a esa función.

La migración deja registrados productos por bodega, movimientos de kardex y
traslados con sus estados y cantidades solicitadas, despachadas y recibidas.

Si el catálogo muestra las categorías pero no las tarjetas, ejecuta también
`supabase/patches/20260904_servicios_read_policy.sql`. En algunos proyectos
`servicios` tiene RLS activo sin una política de lectura; el SQL Editor puede
ver las filas como administrador, pero el navegador no. La política solo
permite lectura a usuarios autenticados.

### Altas con contraseña

Los empleados y clientes deben crearse mediante la Edge Function `admin-users`,
nunca insertando una contraseña en `usuarios`. Configura el secreto
`SUPABASE_SERVICE_ROLE_KEY` en Supabase y despliega con
`supabase functions deploy admin-users`. La función solo acepta solicitudes de
un usuario autenticado cuyo rol en `usuarios` sea `admin`; crea el usuario en
Supabase Auth y, para empleados, también su fila en `empleados`.
