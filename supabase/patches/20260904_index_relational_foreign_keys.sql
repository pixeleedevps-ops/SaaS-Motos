-- Índices para las claves foráneas usadas por citas, facturación, inventario,
-- garantías y notificaciones. Mejoran joins y evitan bloqueos largos al borrar
-- o actualizar una fila referenciada.
create index if not exists citas_servicio_id_idx on public.citas (servicio_id);
create index if not exists factura_items_factura_id_idx on public.factura_items (factura_id);
create index if not exists factura_items_variante_id_idx on public.factura_items (variante_id);
create index if not exists factura_servicios_factura_id_idx on public.factura_servicios (factura_id);
create index if not exists factura_servicios_servicio_id_idx on public.factura_servicios (servicio_id);
create index if not exists facturas_empleado_id_idx on public.facturas (empleado_id);
create index if not exists garantias_factura_id_idx on public.garantias (factura_id);
create index if not exists garantias_producto_id_idx on public.garantias (producto_id);
create index if not exists garantias_servicio_id_idx on public.garantias (servicio_id);
create index if not exists movimientos_inventario_usuario_id_idx on public.movimientos_inventario (usuario_id);
create index if not exists movimientos_inventario_variante_id_idx on public.movimientos_inventario (variante_id);
create index if not exists notifications_service_id_idx on public.notifications (service_id);
create index if not exists reclamaciones_garantia_tecnico_id_idx on public.reclamaciones_garantia (tecnico_id);
create index if not exists usuarios_sede_id_idx on public.usuarios (sede_id);

-- La tabla histórica se mantiene inaccesible para conservar auditoría, pero su
-- FK también debe estar indexada mientras exista.
create index if not exists notificaciones_sms_archivo_servicio_id_idx
  on public.notificaciones_sms_archivo (servicio_id);
