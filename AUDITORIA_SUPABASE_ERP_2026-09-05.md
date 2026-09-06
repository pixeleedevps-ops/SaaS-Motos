# Auditoría de Supabase, seguridad y eficiencia del ERP

Fecha de corte: 5 de septiembre de 2026 (America/Bogota)  
Proyecto Supabase: `ioequrikfgrrdkebmbcg`  
Alcance: esquema Postgres en producción, RLS, funciones, triggers, índices, integridad, Edge Functions, código fuente, bundle compilado, historial Git y dependencias npm.

## Resultado ejecutivo

La base no presenta una exposición directa por `service_role`: no se encontró una llave privada de Supabase, token de Twilio, JWT privado ni clave privada de Firebase en el código fuente, el bundle actual o el historial Git examinado. El navegador usa solamente `VITE_SUPABASE_PUBLISHABLE_KEY`, que es el tipo de llave correcto para un cliente protegido por RLS. Los archivos `.env` están ignorados y el único archivo de entorno versionado es `.env.example`.

Sí existe un hallazgo crítico de autorización: las políticas actuales permiten a futuros usuarios `empleado` y `vendedor` consultar todos los perfiles de clientes y todos los vehículos, sin sede, y el vendedor puede acceder a datos de vehículos que la especificación le prohíbe ver. También hay riesgos altos en facturación, inventario y persistencia.

No se modificó ni eliminó nada en producción durante esta auditoría. Tampoco se ejecutó `VACUUM`, `ANALYZE`, despliegue de funciones ni migración. Antes de cualquiera de esos cambios debe generarse un backup y probarse la migración en staging.

## Evidencia resumida

- PostgreSQL 17.6; base aproximada de 14 MB.
- Estadísticas acumuladas desde el arranque del 4 de septiembre de 2026: menos de dos días de observación. No sirven todavía para justificar la eliminación de índices.
- Cache hit: 99,98 %. No hay señal actual de presión de lectura o capacidad.
- 25 de 25 tablas públicas tienen RLS activo.
- No se detectaron llaves foráneas sin un índice de apoyo.
- No se detectaron enums huérfanos ni funciones con cuerpos duplicados.
- `sedes.tipo` es consistente: dos filas `Sede` y una `bodega`; no coexisten `CD` y `sede`.
- `usuarios.id -> auth.users.id` usa `ON DELETE CASCADE`. Otras relaciones históricas importantes usan `NO ACTION`, `SET NULL` o `CASCADE` de manera razonable para impedir huérfanos.
- TypeScript (`npm run lint`) y el build de producción terminan correctamente.
- Bundle principal: 850,86 kB minificado / 211,99 kB gzip; Vite advierte que supera 500 kB.
- `npm audit`: 3 vulnerabilidades moderadas (`express`, `body-parser`, `qs`), todas con corrección disponible.
- El conector de logs de Supabase devolvió un error de herramienta; la revisión de uso se complementó con `pg_stat_statements`, catálogos de Postgres, filas exactas y código fuente. No se pudo afirmar “sin consultas en las últimas 24 horas” desde Logs Explorer.

## Hallazgos críticos

### C-01 — RLS permite leer clientes y vehículos fuera de sede

**Descripción.** `usuarios_select_propio` permite que cualquier `admin`, `empleado` o `vendedor` lea todas las filas de `usuarios`. `motos_select` permite que esos mismos tres roles lean todos los vehículos. No hay condición por `sede_id`, cita o factura para empleado/vendedor. Además, la regla de producto indica que un vendedor no debe ver datos del vehículo.

**Impacto.** Cuando se creen cuentas operativas, un vendedor de una sede podrá consultar por REST los datos personales de clientes de otras sedes y todos los vehículos, aunque la interfaz los oculte. Es una fuga de datos entre sedes y una violación directa del modelo de permisos.

**Evidencia.** `supabase/patches/20260905_scope_data_by_role_and_branch.sql`, políticas `usuarios_select_propio` y `motos_select`, líneas 98–144. En producción hoy solo hay un `admin` y un `cliente`, por lo que el riesgo todavía no se materializa con un vendedor existente, pero queda habilitado por diseño.

**Plan de corrección.** Cambio complejo; no aplicarlo directamente:

1. Definir la pertenencia de un cliente a una sede. Como el cliente puede visitar varias sedes, conviene derivar acceso por `citas.sede_id` o `facturas.sede_id`, no asignarle una sede fija sin validar el negocio.
2. Reescribir `usuarios_select_propio` para que empleado/vendedor solo vea clientes vinculados a su sede mediante una relación verificable.
3. Quitar `vendedor` de `motos_select`, `motos_insert` y `motos_update`. Si necesita seleccionar una moto al agendar, exponer una vista/RPC mínima con identificador y placa, sin detalles prohibidos y limitada a la cita/sede.
4. Crear pruebas RLS con JWT de admin, vendedor A, vendedor B, mecánico y cliente.
5. Probar en staging y aplicar después de backup.

Referencia: [Row Level Security de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Hallazgos altos

### A-01 — El catálogo `productos` expone costo y permite escrituras globales

**Descripción.** `productos_select_authenticated` usa `USING (true)`. Como `productos` contiene `costo` y `sede_id`, cualquier usuario autenticado, incluso un cliente, puede solicitar esos campos directamente. La política posterior `productos_update_staff` permite a `empleado` y `vendedor` modificar cualquier producto sin comprobar la sede.

**Impacto.** Exposición del costo de adquisición y edición cruzada de productos/sedes mediante la API, aunque la pantalla no lo permita.

**Evidencia.** `supabase/patches/20260904_finalize_rls_performance.sql`, líneas 9–20, y la redefinición más reciente en `supabase/patches/20260905_scope_data_by_role_and_branch.sql`, líneas 437–446.

**Plan.** Separar el catálogo público en una vista `security_invoker` sin `costo`; restringir la tabla base a personal; aplicar sede en `USING` y `WITH CHECK`; eliminar `vendedor` de escritura si se mantiene la regla de que solo administración/empleado gestiona inventario.

### A-02 — El vendedor puede crear y mover inventario

**Descripción.** Frontend, políticas RLS y RPC incluyen `vendedor` en creación, reposición y traslado. La especificación solicitó que únicamente administración y empleado puedan mover inventario.

**Impacto.** Un vendedor puede cambiar existencias y trasladar stock desde su sede a cualquier sede destino.

**Evidencia.** `src/context/AppContext.tsx`, línea 905; `supabase/patches/20260905_scope_data_by_role_and_branch.sql`, líneas 166–226 y 459–615.

**Corrección propuesta.** Es un cambio coordinado: retirar `vendedor` de `canManageInventory`, de las políticas `inventario_*`/`movimientos_*` y de `crear_producto_inventario`, `configurar_garantia_producto`, `trasladar_producto_entre_sedes` y `mover_producto_sede`. Probar los cinco roles antes de migrar.

### A-03 — La factura confía en precios, totales y relaciones enviados por el navegador

**Descripción.** `crear_factura` suma `item.total`, `unitPrice`, descuento e impuesto recibidos en JSON. No vuelve a consultar el precio real de `productos`/`servicios`, no valida límites de descuento y permite asociar un `appointmentId` que no necesariamente corresponde al cliente, servicio o sede de la factura.

**Impacto.** Un usuario autorizado puede manipular la petición y emitir facturas con precio o total arbitrario, incluso inconsistentes, y conectar garantías con una cita incorrecta.

**Evidencia.** `supabase/patches/20260905_unificar_garantias_compras.sql`, líneas 248–356; el frontend transmite esos valores en `src/context/AppContext.tsx`, líneas 1127–1147.

**Plan.** Convertir el JSON de entrada en referencias y cantidades; resolver precios en la base; validar descuentos mediante una regla autorizada; validar que la cita pertenezca al cliente/sede/servicio; rechazar números negativos/no finitos; guardar un snapshot del precio resuelto por el servidor. Añadir pruebas transaccionales de manipulación.

### A-04 — Facturar productos no descuenta inventario

**Descripción.** Los triggers de `factura_items` preparan garantía, pero no generan una salida de `movimientos_inventario` ni reducen `inventario_sede`. Tampoco `crear_factura` lo hace.

**Impacto.** Stock contable superior al stock físico, ventas sin kardex y reportes de inventario incorrectos.

**Plan.** En staging, extender la transacción de facturación para bloquear la fila `inventario_sede`, validar stock, registrar una salida idempotente vinculada a la línea de factura y rechazar insuficiencia. Definir también qué ocurre al anular una factura. No implementarlo con un segundo llamado desde frontend.

### A-05 — El envío push está roto en producción

**Descripción.** PostgreSQL invoca `send-push-notification`, pero el proyecto desplegado solo tiene `admin-users` y el endpoint retirado `send-completion-sms`. La función push existe únicamente en el repositorio. Además, el `.env` local usa nombres `NEXT_PUBLIC_FIREBASE_*`, mientras Vite lee `VITE_FIREBASE_*`.

**Impacto.** Hay 9 notificaciones `pending`, 0 enviadas y 0 suscripciones. El cliente no recibe la notificación al completar el servicio.

**Evidencia.** `supabase/functions/send-push-notification/index.ts`; `src/services/pushNotifications.ts`, líneas 16–32; `README.md`, líneas 34–71. El trigger usa Vault y apunta al slug no desplegado.

**Plan seguro.** En staging: renombrar las variables públicas locales a `VITE_FIREBASE_*`, configurar los tres secretos privados de Firebase en Edge Function Secrets, desplegar `send-push-notification --no-verify-jwt`, registrar un dispositivo y completar una cita de prueba. Verificar transición `pending -> processing -> sent`; luego repetir en producción. No reutilizar Twilio: `send-completion-sms` devuelve deliberadamente HTTP 410.

### A-06 — Ningún empleado está vinculado a una cuenta Auth

**Descripción.** Los 5 empleados tienen `usuario_id = null`. `empleado_actual_id()` y la experiencia del mecánico dependen de esa relación.

**Impacto.** Mecánicos/vendedores no pueden resolverse de forma segura a su ficha, sede o citas; el filtrado “mis citas” y la asistencia autenticada no pueden funcionar correctamente.

**Plan.** Crear cuentas Auth controladas, enlazar cada empleado por UUID, asignar rol y sede coherentes, y añadir una comprobación/constraint parcial que impida múltiples empleados para el mismo usuario. No generar cuentas ficticias en producción sin consentimiento y política de credenciales.

### A-07 — Citas permiten relaciones de negocio inconsistentes y actualización excesiva por mecánico

**Descripción.** Las FKs comprueban que cliente, moto, técnico, servicio y sede existan, pero no que la moto pertenezca al cliente ni que el técnico pertenezca a la sede. La política de update del mecánico le permite actualizar cualquier columna mientras `empleado_id` siga apuntándole; la interfaz solo cambia estado, pero una petición directa no tiene esa limitación.

**Impacto.** Citas cruzadas entre clientes/sedes, exposición indirecta de vehículos y modificación de fecha, cliente, servicio o sede por un mecánico.

**Plan.** Crear RPCs específicas (`cambiar_estado_cita`, `reagendar_cita`) con permisos distintos, revocar el update directo a mecánico y añadir validación transaccional de moto/cliente y técnico/sede.

### A-08 — Carga masiva centralizada sin paginación

**Descripción.** Un cambio de sede vuelve a cargar clientes, inventario, todas las citas históricas, asistencia, empleados, facturas con todos sus detalles y garantías. Inventario no tiene `.range()`/paginación; citas y facturas tampoco limitan fecha. Reportes y agenda filtran el rango después en el navegador.

**Impacto.** Con 800+ productos y crecimiento de facturas/citas aumentarán tiempo de carga, memoria, transferencia y costo. El refresco completo tras mutaciones amplifica el problema.

**Evidencia.** `src/context/AppContext.tsx`, líneas 334–386; `src/components/analytics/AnalyticsView.tsx`, líneas 63–123; `src/components/appointments/AppointmentsView.tsx`, filtrado local del rango.

**Plan.** Dividir AppContext por dominio; paginar inventario y facturas; consultar citas por intervalo; mover agregados de analítica a RPC/vistas; mantener catálogos globales pequeños en caché. Conservar siempre `sede_id` en la consulta, no filtrar sedes en cliente.

### A-09 — Asistencia y actas no son persistentes

**Descripción.** `recordAttendance` solo modifica estado React con valores fijos y nunca inserta/actualiza `asistencia_empleados`. `createActa` solo actualiza memoria; no existe una tabla de actas en Supabase. Con Supabase configurado, estos datos se pierden al recargar.

**Impacto.** Registros operativos que aparentan guardarse pero desaparecen; la tabla de asistencia permanece vacía.

**Evidencia.** `src/context/AppContext.tsx`, líneas 620–662 y 1347–1355.

**Plan.** Implementar CRUD transaccional y RLS para asistencia; diseñar tabla de actas con relación a cita, cliente, moto, técnico y sede antes de habilitar el botón de guardado real.

### A-10 — Historial de migraciones no reproducible desde Git

**Descripción.** Producción registra `tighten_client_scope`, `derive_legacy_mechanic_role`, `fix_inventory_movement_ledger` y `revoke_anonymous_branch_rpcs`, pero esos cuatro archivos no existen en `supabase/patches` ni `supabase/migrations`.

**Impacto.** Un entorno nuevo o staging creado desde el repositorio no reproduce producción; futuras migraciones pueden partir de supuestos incorrectos.

**Plan.** Recuperar el SQL exacto de esas versiones, versionarlo sin reejecutarlo en producción y validar un rebuild completo en un proyecto temporal.

## Hallazgos medios

### M-01 — Tres tablas con RLS pero sin políticas

`atributos`, `valores_atributo` y `variante_valores` tienen RLS activo y datos (2, 6 y 8 filas), pero ninguna política. No exponen datos: quedan bloqueadas por la API. El problema es funcional, pues la característica de atributos/variantes está desconectada. Definir si se implementa y crear políticas mínimas; si se abandona, respaldar y retirar el conjunto completo con sus dependencias. [Detalle del asesor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

### M-02 — Integridad incompleta del catálogo e inventario

Hay 7 productos, 7 variantes y solo 1 saldo en `inventario_sede`; 2 productos no tienen variante y 6 variantes no tienen inventario en ninguna sede. Son candidatos a depuración, no a borrado automático. Generar un listado de negocio, decidir si son borradores o productos válidos sin stock y corregirlos mediante una migración idempotente.

### M-03 — Garantías configuradas de forma incompleta

Los 7 productos y 5 servicios tienen garantía vacía; las 8 líneas de servicio históricas tienen `cita_id = null`; las 4 garantías existentes son de servicio y la vista unificada no puede demostrar filas verificables. Hacer backfill solo con una fuente inequívoca; lo no verificable debe quedar marcado como legado, no unido por fecha/nombre.

### M-04 — Búsqueda de clientes no está indexada para `%texto%` ni limitada por sede

`buscar_clientes` usa `ILIKE '%consulta%'` sobre nombre, documento, teléfono y email. Solo hay B-tree de documento/email; esos índices no aceleran el patrón con comodín inicial. Además, la seguridad hereda la política global de `usuarios`.

**Corrección propuesta.** Primero corregir RLS; después habilitar `pg_trgm` en el esquema de extensiones y crear GIN trigram para los campos realmente buscados, midiendo con `EXPLAIN (ANALYZE, BUFFERS)` en staging. Para documento/teléfono exactos, usar igualdad normalizada antes de la búsqueda parcial.

### M-05 — Estadísticas desactualizadas y muchos dead tuples relativos

`last_analyze`/`last_autoanalyze` están vacíos en la mayoría de tablas. Hay, por ejemplo, 32 tuplas muertas estimadas en `usuarios`, 27 en `inventario_sede` y 21 en `citas`, aunque las tablas son diminutas. Las estimaciones de filas difieren de los conteos exactos.

**Corrección lista para mantenimiento, después de backup:** ejecutar `ANALYZE` sobre las tablas públicas después de cargas/migraciones; usar `VACUUM (ANALYZE)` solo en una ventana controlada si las métricas de bloat lo justifican. No se ejecutó durante la auditoría.

### M-06 — “Índices no utilizados” no son eliminables todavía

El asesor lista múltiples `idx_scan = 0`, pero el servidor lleva menos de dos días activo y varias tablas tienen 0–8 filas. Muchos índices protegen FK, unicidad, RLS o consultas todavía sin tráfico. No hay un índice seguro para eliminar con la evidencia actual. Observar 30–60 días de tráfico representativo y revisar planes antes de retirar alguno. [Detalle del asesor](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

### M-07 — Leaked Password Protection está desactivado

Supabase Auth no está comprobando contraseñas contra el catálogo de credenciales filtradas. Activarlo en Auth > Password Security y probar registro/cambio de contraseña. [Guía oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### M-08 — Dependencias moderadamente vulnerables y paquetes sin uso

`npm audit` reporta 3 vulnerabilidades moderadas por `express -> body-parser -> qs`, con riesgo de DoS. `express`, `dotenv`, `@google/genai` y `motion` no tienen imports reales en el proyecto actual.

**Corrección simple lista para una rama:** `npm uninstall express dotenv @google/genai motion`, luego `npm audit`, `npm run lint` y `npm run build`. Revisar antes que no exista un backend fuera de este repositorio que dependa del mismo `package.json`.

### M-09 — Bundle grande y sin separación por módulo

El bundle JS principal pesa 850,86 kB minificado. Aplicar `React.lazy`/`import()` a las vistas, especialmente Firebase, analítica y módulos administrativos. Medir carga inicial después del cambio.

### M-10 — UI de autorización tiene una ventana permisiva

`AuthGate` acepta cualquier sesión válida y `currentUserRole` inicia en `null`; el Sidebar devuelve todos los módulos para roles desconocidos hasta cargar el perfil. RLS evita la lectura, pero la UI no falla cerrada. Introducir estado `roleLoading` y no renderizar navegación sensible hasta confirmar perfil activo; redirigir perfiles ausentes/inactivos.

### M-11 — Reposición de inventario es optimista sin rollback

`restockProduct` incrementa el estado local y muestra éxito antes de confirmar la inserción del movimiento. Si falla Supabase, la UI queda temporalmente con stock falso. Esperar la respuesta, usar el stock devuelto por la base y revertir/recargar al fallar.

### M-12 — Uso excesivo de `any` en la capa principal

Hay 22 usos de `any`, principalmente en consultas relacionales de AppContext. Esto oculta desajustes de nombres/nullable y ya obliga a castear la vista de garantías. Regenerar tipos desde el esquema live y tipar DTOs por consulta.

## Hallazgos bajos y candidatos de limpieza

### B-01 — `pg_net` está instalado en `public`

El asesor recomienda mover la extensión a un esquema dedicado. El cambio puede afectar el trigger push y debe probarse en staging. [Detalle del asesor](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).

### B-02 — Funciones `SECURITY DEFINER` expuestas a `authenticated`

El asesor marca 10 RPCs. Varias son intencionales (`crear_factura`, traslados), pero otras auxiliares (`rol_actual`, `sede_actual`, `empleado_actual_id`) no necesitan estar invocables directamente. Todas usan `search_path = ''`, lo cual es positivo. Revocar `EXECUTE` directo de helpers cuando las políticas sigan pudiendo evaluarlas, y conservar solo RPCs explícitamente públicas con validación completa. [Detalle del asesor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

### B-03 — Grants de tabla a `anon` son más amplios de lo necesario

RLS sin políticas `anon` bloquea actualmente las filas, por lo que no existe fuga directa. Como defensa en profundidad, revocar permisos `anon` en tablas no públicas después de pruebas de registro/Auth. RLS y grants son capas separadas.

### B-04 — Tabla y función SMS retiradas

`notificaciones_sms_archivo` está vacía y no tiene llamadas desde la aplicación; `send-completion-sms` está desplegada pero siempre devuelve 410. Son los candidatos más claros de limpieza, pero primero exportar/respaldar, confirmar que no hay integraciones externas y retirar en staging. No eliminarlos hasta que el flujo FCM esté funcionando.

### B-05 — Columnas siempre vacías o con default

- `productos`: `imagen_url` y garantía vacíos en 7/7; `costo = 0` en 7/7.
- `servicios`: garantía vacía en 5/5.
- `empleados`: `usuario_id` vacío en 5/5.
- `sedes`: dirección/teléfono vacíos en 3/3.
- `citas`: próxima revisión vacía en 3/3.
- `factura_servicios`: `cita_id` vacío en 8/8.
- `facturas`: `email_enviado = false` y descuento 0 en 7/7.
- `motos_clientes`: VIN vacío en 2/2.
- `movimientos_inventario`: `usuario_id` vacío en 1/1.

No se recomienda eliminar estas columnas solo con una muestra tan pequeña. Varias son necesarias para funcionalidades solicitadas; los valores vacíos muestran implementación incompleta.

## Inventario de tablas y uso

| Grupo | Tablas / conteos exactos | Conclusión |
|---|---|---|
| Núcleo | sedes 3, usuarios 2, empleados 5, productos 7, variantes 7, inventario 1, citas 3, facturas 7 | Activas y necesarias |
| Facturación | factura_servicios 8, factura_items 0, garantías 4 | `factura_items` está conectada y no debe borrarse; aún no hay ventas de producto |
| Vacías conectadas | asistencia 0, push_subscriptions 0, reclamaciones 0 | Funcionalidad real pero incompleta/sin uso todavía |
| Candidato legado | notificaciones_sms_archivo 0 | Revisar y retirar solo después de backup y FCM operativo |
| Variantes avanzadas | atributos 2, valores 6, variante_valores 8 | Datos presentes, sin consumo desde frontend ni políticas |
| Auditoría/cola | traslados_productos 1, movimientos 1, notifications 9 | Necesarias; la cola push está atascada |

`inventario_sede` no es redundante: es la fuente del stock por variante y sede. `productos.sede_id` expresa la ubicación canónica del producto, mientras `inventario_sede` conserva el saldo físico por variante/ubicación y permite kardex/traslados.

## Controles que sí están bien

- RLS activo en todas las tablas públicas sensibles.
- No hay políticas para `anon` que abran filas sensibles.
- No se encontró `service_role` ni secretos privados materializados en frontend, bundle o historial Git.
- La Edge Function `admin-users` obtiene la service role desde secretos del runtime, valida JWT con `auth.getUser()` y exige perfil `admin` activo.
- La creación pública usa Supabase Auth; el trigger crea `usuarios` con rol fijo `cliente`. La auditoría encontró 0 usuarios Auth sin perfil y 0 perfiles sin Auth.
- Trigger de protección impide que un usuario normal cambie su rol, sede, estado, id o email privilegiado.
- Sede aplicada en servidor para inventario, citas, asistencia, empleados, facturas y garantías del contexto operativo.
- No hay patrón N+1 en la carga principal: se usan relaciones embebidas. El problema es volumen, no multiplicación de consultas por fila.
- Todas las FK públicas tienen índice de apoyo.
- Enums actuales están usados; no existe `rol_usuario_old`.
- No se detectaron triggers duplicados o desconectados.

## Orden recomendado de ejecución

1. Backup verificable y proyecto staging reproducible.
2. Recuperar las cuatro migraciones ausentes de Git.
3. Corregir RLS de clientes/vehículos/productos y permisos de inventario; ejecutar matriz de pruebas por rol/sede.
4. Endurecer `crear_factura`, validar relaciones de cita y hacer el descuento de stock en la misma transacción.
5. Vincular empleados con Auth.
6. Desplegar y probar FCM con nombres de entorno correctos.
7. Persistir asistencia y diseñar actas.
8. Paginar consultas y mover analítica a consultas agregadas.
9. Ejecutar `ANALYZE`, observar índices 30–60 días y solo entonces decidir eliminaciones.
10. Retirar SMS legado y dependencias npm sin uso en una rama separada.

## Validaciones finales de la auditoría

- `npm run lint`: aprobado.
- `npm run build`: aprobado con advertencia de chunk > 500 kB.
- `npm audit`: 0 críticas, 0 altas, 3 moderadas.
- Cambios en Supabase durante la auditoría: ninguno.
- Archivos de aplicación modificados durante la auditoría: ninguno.
- Archivo creado: este informe.

