-- DATOS DEMO PARA EL ESQUEMA EXISTENTE EN ESPAÑOL
-- Ejecutar en Supabase > SQL Editor. No crea contraseñas ni usuarios Auth.
-- Requiere al menos un usuario ya creado en Authentication > Users, porque
-- usuarios.id está ligado de forma segura a auth.users.

do $$
declare
  v_user uuid;
  v_employee uuid;
  v_bodega uuid;
  v_norte uuid;
  v_sur uuid;
  v_motul uuid;
  v_brembo uuid;
  v_lubricante uuid;
  v_frenos uuid;
  v_aceite uuid;
  v_pastillas uuid;
  v_aceite_variant uuid;
  v_pastillas_variant uuid;
  v_service uuid;
  v_moto uuid;
  v_cita uuid;
  v_factura uuid;
  v_traslado uuid;
begin
  select id into v_user from public.usuarios order by created_at limit 1;
  if v_user is null then
    raise exception 'Primero crea un usuario en Authentication > Users e inicia sesión una vez.';
  end if;

  insert into public.sedes (nombre, direccion, telefono, ciudad)
  select 'Bodega Central Demo', 'Av. Industrial # 10-25', '+57 300 000 0001', 'Bogotá'
  where not exists (select 1 from public.sedes where nombre = 'Bodega Central Demo');
  insert into public.sedes (nombre, direccion, telefono, ciudad)
  select 'Sede Norte Demo', 'Calle 170 # 12-40', '+57 300 000 0002', 'Bogotá'
  where not exists (select 1 from public.sedes where nombre = 'Sede Norte Demo');
  insert into public.sedes (nombre, direccion, telefono, ciudad)
  select 'Sede Sur Demo', 'Av. Primero de Mayo # 50-20', '+57 300 000 0003', 'Bogotá'
  where not exists (select 1 from public.sedes where nombre = 'Sede Sur Demo');
  select id into v_bodega from public.sedes where nombre = 'Bodega Central Demo';
  select id into v_norte from public.sedes where nombre = 'Sede Norte Demo';
  select id into v_sur from public.sedes where nombre = 'Sede Sur Demo';

  insert into public.marcas (nombre) select 'Motul' where not exists (select 1 from public.marcas where nombre = 'Motul');
  insert into public.marcas (nombre) select 'Brembo' where not exists (select 1 from public.marcas where nombre = 'Brembo');
  insert into public.tipos_producto (nombre) select 'Lubricantes' where not exists (select 1 from public.tipos_producto where nombre = 'Lubricantes');
  insert into public.tipos_producto (nombre) select 'Frenos' where not exists (select 1 from public.tipos_producto where nombre = 'Frenos');
  select id into v_motul from public.marcas where nombre = 'Motul';
  select id into v_brembo from public.marcas where nombre = 'Brembo';
  select id into v_lubricante from public.tipos_producto where nombre = 'Lubricantes';
  select id into v_frenos from public.tipos_producto where nombre = 'Frenos';

  insert into public.productos (nombre, descripcion, marca_id, tipo_id, sku_base, precio, garantia_meses)
  select 'Aceite Motul 7100 4T 10W-40 4L', 'Lubricante sintético para motocicleta.', v_motul, v_lubricante, 'DEMO-MOT-7100-4L', 245000, 12
  where not exists (select 1 from public.productos where sku_base = 'DEMO-MOT-7100-4L');
  insert into public.productos (nombre, descripcion, marca_id, tipo_id, sku_base, precio, garantia_meses)
  select 'Pastillas de freno delanteras Brembo', 'Pastillas sinterizadas para uso urbano.', v_brembo, v_frenos, 'DEMO-BRM-PAD-01', 165000, 6
  where not exists (select 1 from public.productos where sku_base = 'DEMO-BRM-PAD-01');
  select id into v_aceite from public.productos where sku_base = 'DEMO-MOT-7100-4L';
  select id into v_pastillas from public.productos where sku_base = 'DEMO-BRM-PAD-01';

  insert into public.variantes_producto (producto_id, sku)
  select v_aceite, 'DEMO-MOT-7100-4L-STD' where not exists (select 1 from public.variantes_producto where sku = 'DEMO-MOT-7100-4L-STD');
  insert into public.variantes_producto (producto_id, sku)
  select v_pastillas, 'DEMO-BRM-PAD-01-STD' where not exists (select 1 from public.variantes_producto where sku = 'DEMO-BRM-PAD-01-STD');
  select id into v_aceite_variant from public.variantes_producto where sku = 'DEMO-MOT-7100-4L-STD';
  select id into v_pastillas_variant from public.variantes_producto where sku = 'DEMO-BRM-PAD-01-STD';

  insert into public.inventario_sede (variante_id, sede_id, stock, stock_minimo) values
    (v_aceite_variant, v_bodega, 45, 10), (v_aceite_variant, v_norte, 8, 5), (v_aceite_variant, v_sur, 3, 5),
    (v_pastillas_variant, v_bodega, 25, 8), (v_pastillas_variant, v_norte, 4, 5)
  on conflict (variante_id, sede_id) do update set stock = excluded.stock, stock_minimo = excluded.stock_minimo;

  insert into public.servicios (nombre, descripcion, tipo, duracion_estimada_min, precio, requiere_seguimiento_garantia)
  select 'Cambio de aceite premium', 'Cambio de aceite Motul y revisión general.', 'mantenimiento', 60, 180000, false
  where not exists (select 1 from public.servicios where nombre = 'Cambio de aceite premium');
  select id into v_service from public.servicios where nombre = 'Cambio de aceite premium' order by id limit 1;

  insert into public.empleados (usuario_id, cargo, sede_id)
  select v_user, 'Administrador de pruebas', v_norte where not exists (select 1 from public.empleados where usuario_id = v_user);
  select id into v_employee from public.empleados where usuario_id = v_user;

  insert into public.motos_clientes (cliente_id, marca, modelo, anio, placa, cilindraje)
  select v_user, 'Yamaha', 'MT-07', 2024, 'DEM01A', '689 cc'
  where not exists (select 1 from public.motos_clientes where placa = 'DEM01A');
  select id into v_moto from public.motos_clientes where placa = 'DEM01A';

  insert into public.citas (cliente_id, empleado_id, servicio_id, sede_id, moto_id, fecha_hora, estado, notas)
  select v_user, v_employee, v_service, v_norte, v_moto, now() + interval '1 day', 'confirmada', 'Cita de prueba para validar la aplicación.'
  where not exists (select 1 from public.citas where notas = 'Cita de prueba para validar la aplicación.');
  select id into v_cita from public.citas where notas = 'Cita de prueba para validar la aplicación.' limit 1;

  insert into public.traslados_inventario (sede_origen_id, sede_destino_id, estado, usuario_id, notas)
  select v_bodega, v_norte, 'solicitado', v_user, 'Traslado demo: aceite para Sede Norte'
  where not exists (select 1 from public.traslados_inventario where notas = 'Traslado demo: aceite para Sede Norte');
  select id into v_traslado from public.traslados_inventario where notas = 'Traslado demo: aceite para Sede Norte' limit 1;
  insert into public.traslado_items (traslado_id, variante_id, cantidad)
  select v_traslado, v_aceite_variant, 6
  where not exists (select 1 from public.traslado_items where traslado_id = v_traslado and variante_id = v_aceite_variant);

  insert into public.facturas (numero_factura, cliente_id, empleado_id, sede_id, subtotal, impuestos, total)
  select 'DEMO-FACT-0001', v_user, v_user, v_norte, 180000, 34200, 214200
  where not exists (select 1 from public.facturas where numero_factura = 'DEMO-FACT-0001');
  select id into v_factura from public.facturas where numero_factura = 'DEMO-FACT-0001';
  insert into public.factura_items (factura_id, variante_id, nombre_producto, cantidad, precio_unitario, subtotal)
  select v_factura, v_aceite_variant, 'Aceite Motul 7100 4T 10W-40 4L', 1, 245000, 245000
  where not exists (select 1 from public.factura_items where factura_id = v_factura and variante_id = v_aceite_variant);
  insert into public.factura_servicios (factura_id, servicio_id, nombre_servicio, precio)
  select v_factura, v_service, 'Cambio de aceite premium', 180000
  where not exists (select 1 from public.factura_servicios where factura_id = v_factura and servicio_id = v_service);

  insert into public.asistencia_empleados (empleado_id, sede_id, fecha, hora_entrada)
  values (v_employee, v_norte, current_date, now()) on conflict (empleado_id, fecha) do nothing;
  insert into public.notificaciones (cita_id, cliente_id, estado_nuevo, mensaje)
  select v_cita, v_user, 'confirmada', 'Notificación demo: tu cita fue confirmada.'
  where not exists (select 1 from public.notificaciones where mensaje = 'Notificación demo: tu cita fue confirmada.');
end $$;
