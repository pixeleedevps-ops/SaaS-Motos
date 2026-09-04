# SaaS-Motos

Sistema de gestión integral para talleres de motos (Motorpro): clientes, inventario, facturación, citas, garantías, actas, asistencia y analíticas.

## Ejecutar localmente

Requiere Node.js.

```bash
npm install
npm run dev
```

Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y
`VITE_SUPABASE_PUBLISHABLE_KEY` desde Supabase Dashboard > Connect. La clave
`service_role` nunca debe estar en una variable `VITE_` ni en el navegador.

## Supabase

Las migraciones versionadas están en `supabase/patches`. El proyecto usa el
esquema relacional en español: `usuarios`, `motos_clientes`, `citas`, `servicios`,
`sedes`, `productos`, `variantes_producto`, `inventario_sede`, `facturas`,
`garantias` y sus tablas relacionadas.

Los productos tienen una sede canónica mediante `productos.sede_id`. Un traslado
actualiza esa clave foránea y registra el movimiento en el kardex; los saldos por
variante y sede permanecen en `inventario_sede`.

Los clientes creados públicamente nacen en Supabase Auth y el trigger seguro crea
su perfil en `usuarios` con rol fijo `cliente`. Desde administración, las cuentas
se crean y modifican mediante la Edge Function `admin-users`; las contraseñas
nunca se insertan en `usuarios`.

## Notificaciones push con Firebase Cloud Messaging

La app no usa Twilio, SMS ni Expo. Cuando una cita cambia realmente de estado,
PostgreSQL crea una fila idempotente en `notifications`; la base invoca de forma
asíncrona `send-push-notification`, que obtiene los dispositivos activos del
cliente y envía el mensaje con Firebase Cloud Messaging HTTP v1. El nombre del
servicio se obtiene de la relación real `citas.servicio_id -> servicios.id`.

1. En Firebase Console crea o selecciona el proyecto y registra una aplicación
   web. Copia su configuración pública a las variables `VITE_FIREBASE_*` de
   `.env`; genera además una clave Web Push (VAPID) y colócala en
   `VITE_FIREBASE_VAPID_KEY`.
2. En Google Cloud/Firebase crea una cuenta de servicio con permiso para enviar
   mensajes FCM y descarga temporalmente su JSON. Guarda sus valores como Edge
   Function Secrets de Supabase, nunca en `.env` ni en Git:

   ```bash
   supabase secrets set FIREBASE_PROJECT_ID="..." FIREBASE_CLIENT_EMAIL="..." FIREBASE_PRIVATE_KEY="..."
   ```

3. Despliega las funciones:

   ```bash
   supabase functions deploy admin-users
   supabase functions deploy send-push-notification --no-verify-jwt
   ```

   `send-push-notification` valida dentro de la propia función el secreto interno
   guardado en Supabase Vault o, para una ejecución manual, el JWT de un admin o
   empleado activo. `--no-verify-jwt` permite entrar al webhook interno de
   PostgreSQL, pero no deja la operación abierta al público.
4. El cliente debe iniciar sesión y pulsar “Activar notificaciones” para conceder
   permiso explícito. El token se almacena en `push_subscriptions` bajo RLS y
   puede coexistir con otros dispositivos del mismo usuario.

Las credenciales privadas requeridas por el backend son únicamente
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`. La clave
privada no debe tener prefijo `VITE_`.

## Comprobación

```bash
npm run lint
npm run build
```

Después del despliegue, revisa también los asesores de seguridad y rendimiento de
Supabase. Mantén RLS activo y no reemplaces las políticas por reglas globales
abiertas.
