# Validación de staging — fases 1 y 2

Fecha: 6 de septiembre de 2026.

Estas migraciones están preparadas, pero **no deben ejecutarse directamente en
producción**. El proyecto no tiene una rama de Supabase de desarrollo y crearla
puede generar costo. Antes de desplegar se requiere un staging aislado y un
backup verificable.

## Orden de aplicación

1. `patches/20260906010000_phase1_rls_clientes_vehiculos.sql`
2. `patches/20260906020000_phase2_catalogo_inventario_seguro.sql`
3. `patches/20260906020100_phase2_inventory_write_roles.sql`
4. `patches/20260906030000_phase2_facturacion_atomica.sql`
5. `patches/20260906040000_phase2_citas_controladas.sql`
6. `patches/20260906050000_phase2_asistencia_persistente.sql`
7. `patches/20260906060000_phase2_employee_auth_integrity.sql`
8. `patches/20260906070000_phase2_reportes_servidor.sql`

El frontend que usa las RPC nuevas debe desplegarse únicamente después de las
migraciones 1–8.

## Datos mínimos de prueba

- Dos sedes de taller activas: A y B.
- Una bodega activa.
- Un usuario por rol: `admin`, `empleado`, `vendedor`, `mecanico`, `cliente`.
- Un empleado y un vendedor en cada sede.
- El mecánico enlazado mediante `empleados.usuario_id`.
- Dos clientes: uno con cita/factura en A y otro únicamente en B.
- Una moto por cliente.
- Un producto con variante y stock en cada sede.
- Un servicio con garantía y otro sin garantía.

## Matriz de seguridad obligatoria

Ejecutar cada caso con el JWT real del rol indicado, usando el cliente web o una
petición REST directa. No usar `service_role` para estas comprobaciones.

| Caso | Rol | Operación | Resultado esperado |
|---|---|---|---|
| RLS-01 | vendedor A | leer cliente exclusivo de B | 0 filas |
| RLS-02 | vendedor A | leer `motos_clientes` | 0 filas |
| RLS-03 | vendedor A | `motos_cliente_para_agendamiento` para cliente de A | solo `id` y `placa` |
| RLS-04 | vendedor A | la misma RPC para cliente exclusivo de B | error `42501` |
| RLS-05 | mecánico | leer moto de una cita propia | 1 fila |
| RLS-06 | mecánico | leer moto de otro técnico | 0 filas |
| CAT-01 | cliente | seleccionar `costo` desde `productos` | error de privilegios |
| CAT-02 | cliente | leer `catalogo_productos_publico` | catálogo activo sin costo |
| INV-01 | vendedor A | llamar `inventario_paginado` para A | filas de A, máximo 100 |
| INV-02 | vendedor A | llamar la RPC para B | error `42501` |
| INV-03 | vendedor | crear/reponer/trasladar inventario | error `42501` |
| INV-04 | empleado A | mover inventario desde A | éxito |
| INV-05 | empleado A | mover inventario desde B | error `42501` |
| CIT-01 | vendedor A | asignar técnico de B a cita de A | error de integridad |
| CIT-02 | cualquier staff | asignar moto de otro cliente | error de integridad |
| CIT-03 | mecánico | `UPDATE` directo sobre `citas` | permiso denegado |
| CIT-04 | mecánico | `cambiar_estado_cita` propia | éxito |
| CIT-05 | mecánico | cambiar cliente/sede/servicio/fecha | no existe RPC autorizada / permiso denegado |
| CIT-06 | dos sesiones | cambiar con la misma `estado_version` | la segunda recibe `40001` |
| ASI-01 | empleado | registrar entrada y recargar | la fila persiste |
| ASI-02 | empleado | segunda entrada el mismo día | error `22023` |
| ASI-03 | empleado A | marcar asistencia de otro empleado | error `42501` |
| REP-01 | vendedor A | pedir reporte de B | error `42501` |
| REP-02 | admin | reporte consolidado sin sede | totales de todas las sedes |
| REP-03 | admin | reporte de A | únicamente facturas/citas de A |

## Facturación e inventario

1. Consultar el saldo de la variante en `inventario_sede`.
2. Enviar a `crear_factura` solamente `referenceId`, `type`, `quantity`,
   `discountPercent` y, para servicio, `appointmentId`.
3. Intentar incluir `unitPrice`, `total`, `description` o `sku` manipulados y
   verificar que los valores persistidos sigan coincidiendo con el catálogo.
4. Confirmar que la creación de una factura con producto:
   - reduce el stock en la misma transacción;
   - crea una salida en `movimientos_inventario`;
   - enlaza esa salida mediante `factura_item_id`.
5. Intentar facturar más unidades que las disponibles. No deben existir ni la
   factura ni sus líneas después del error.
6. Intentar descuento superior al 20 % con `empleado` y `vendedor`; debe fallar.
7. Facturar un servicio con garantía sin cita completada; debe fallar.
8. Facturar una cita que pertenezca a otro cliente, servicio o sede; debe fallar.
9. Anular la factura y comprobar una entrada compensatoria de inventario.
10. Intentar reactivar una factura anulada; debe fallar.

## Garantías

- Producto con garantía: aparece en `garantias_compras_unificadas` con número de
  factura y vencimiento correcto.
- Producto sin garantía: no aparece.
- Servicio con garantía y cita completada: aparece enlazado a esa cita/factura.
- Servicio sin garantía: no aparece.
- Factura anulada: no aparece en la vista unificada.

## Verificación técnica

Después de aplicar las migraciones en staging:

1. Regenerar `src/types/database.ts` desde ese esquema y comparar el resultado.
2. Ejecutar `npm run lint`.
3. Ejecutar `npm run build`.
4. Ejecutar `npm audit --audit-level=moderate`.
5. Revisar los asesores de seguridad y rendimiento de Supabase.
6. Ejecutar `EXPLAIN (ANALYZE, BUFFERS)` sobre `inventario_paginado` y las
   consultas de citas por sede/rango.
7. Repetir toda la matriz después del despliegue y antes de promover a
   producción.

## Bloqueos externos pendientes

- Crear/obtener el staging sin costo adicional.
- Confirmar y verificar el backup de producción.
- Crear las cinco cuentas reales de empleados con credenciales consentidas.
- Configurar los secretos privados de Firebase y desplegar
  `send-push-notification` primero en staging.
- Activar manualmente Leaked Password Protection cuando el propietario decida
  hacerlo en el panel de Auth.
- Diseñar el almacenamiento de fotos/firmas de actas sin guardar base64 en
  Postgres; requiere validar la política de almacenamiento y cuota.
