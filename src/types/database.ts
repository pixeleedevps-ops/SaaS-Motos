export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asistencia_empleados: {
        Row: {
          created_at: string
          empleado_id: string
          fecha: string
          hora_entrada: string | null
          hora_salida: string | null
          id: string
          sede_id: string
        }
        Insert: {
          created_at?: string
          empleado_id: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          sede_id: string
        }
        Update: {
          created_at?: string
          empleado_id?: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_empleados_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_empleados_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "asistencia_empleados_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      atributos: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      citas: {
        Row: {
          cliente_id: string
          created_at: string
          empleado_id: string | null
          estado: Database["public"]["Enums"]["estado_cita"]
          estado_version: number
          fecha_hora: string
          id: string
          moto_id: string | null
          notas: string | null
          sede_id: string
          servicio_id: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          empleado_id?: string | null
          estado?: Database["public"]["Enums"]["estado_cita"]
          estado_version?: number
          fecha_hora: string
          id?: string
          moto_id?: string | null
          notas?: string | null
          sede_id: string
          servicio_id: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          empleado_id?: string | null
          estado?: Database["public"]["Enums"]["estado_cita"]
          estado_version?: number
          fecha_hora?: string
          id?: string
          moto_id?: string | null
          notas?: string | null
          sede_id?: string
          servicio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "citas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_moto_id_fkey"
            columns: ["moto_id"]
            isOneToOne: false
            referencedRelation: "motos_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "citas_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          activo: boolean
          apellido: string | null
          cargo: string
          created_at: string
          documento: string | null
          email: string | null
          fecha_contratacion: string
          id: string
          nombre: string | null
          sede_id: string
          telefono: string | null
          usuario_id: string | null
        }
        Insert: {
          activo?: boolean
          apellido?: string | null
          cargo: string
          created_at?: string
          documento?: string | null
          email?: string | null
          fecha_contratacion?: string
          id?: string
          nombre?: string | null
          sede_id: string
          telefono?: string | null
          usuario_id?: string | null
        }
        Update: {
          activo?: boolean
          apellido?: string | null
          cargo?: string
          created_at?: string
          documento?: string | null
          email?: string | null
          fecha_contratacion?: string
          id?: string
          nombre?: string | null
          sede_id?: string
          telefono?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "empleados_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_items: {
        Row: {
          cantidad: number
          descuento_porcentaje: number
          factura_id: string
          id: string
          nombre_producto: string
          precio_unitario: number
          sku: string | null
          subtotal: number
          variante_id: string | null
        }
        Insert: {
          cantidad: number
          descuento_porcentaje?: number
          factura_id: string
          id?: string
          nombre_producto: string
          precio_unitario: number
          sku?: string | null
          subtotal: number
          variante_id?: string | null
        }
        Update: {
          cantidad?: number
          descuento_porcentaje?: number
          factura_id?: string
          id?: string
          nombre_producto?: string
          precio_unitario?: number
          sku?: string | null
          subtotal?: number
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factura_items_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_items_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "factura_items_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_servicios: {
        Row: {
          cantidad: number
          descuento_porcentaje: number
          factura_id: string
          id: string
          nombre_servicio: string
          precio: number
          precio_unitario: number
          servicio_id: string | null
          subtotal: number
        }
        Insert: {
          cantidad?: number
          descuento_porcentaje?: number
          factura_id: string
          id?: string
          nombre_servicio: string
          precio: number
          precio_unitario: number
          servicio_id?: string | null
          subtotal: number
        }
        Update: {
          cantidad?: number
          descuento_porcentaje?: number
          factura_id?: string
          id?: string
          nombre_servicio?: string
          precio?: number
          precio_unitario?: number
          servicio_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "factura_servicios_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_servicios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          cliente_direccion: string | null
          cliente_documento: string | null
          cliente_email: string | null
          cliente_id: string
          cliente_nombre: string | null
          cliente_telefono: string | null
          created_at: string
          descuento_total: number
          email_enviado: boolean
          empleado_id: string | null
          empleado_nombre: string | null
          estado: string
          fecha: string
          fecha_vencimiento: string | null
          hora: string
          id: string
          impuestos: number
          metodo_pago: string
          moto_modelo: string | null
          moto_placa: string | null
          notas: string | null
          numero_factura: string
          sede_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cliente_direccion?: string | null
          cliente_documento?: string | null
          cliente_email?: string | null
          cliente_id: string
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          created_at?: string
          descuento_total?: number
          email_enviado?: boolean
          empleado_id?: string | null
          empleado_nombre?: string | null
          estado?: string
          fecha?: string
          fecha_vencimiento?: string | null
          hora?: string
          id?: string
          impuestos?: number
          metodo_pago?: string
          moto_modelo?: string | null
          moto_placa?: string | null
          notas?: string | null
          numero_factura: string
          sede_id: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cliente_direccion?: string | null
          cliente_documento?: string | null
          cliente_email?: string | null
          cliente_id?: string
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          created_at?: string
          descuento_total?: number
          email_enviado?: boolean
          empleado_id?: string | null
          empleado_nombre?: string | null
          estado?: string
          fecha?: string
          fecha_vencimiento?: string | null
          hora?: string
          id?: string
          impuestos?: number
          metodo_pago?: string
          moto_modelo?: string | null
          moto_placa?: string | null
          notas?: string | null
          numero_factura?: string
          sede_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "facturas_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      garantias: {
        Row: {
          cantidad: number
          cliente_id: string
          codigo: string
          created_at: string
          duracion: number
          factura_id: string
          factura_item_id: string | null
          factura_servicio_id: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          item_nombre: string
          item_precio: number
          notas: string | null
          producto_id: string | null
          servicio_id: string | null
          sku: string | null
          tipo: string
          unidad: string
          updated_at: string
          utilizada_at: string | null
        }
        Insert: {
          cantidad?: number
          cliente_id: string
          codigo?: string
          created_at?: string
          duracion: number
          factura_id: string
          factura_item_id?: string | null
          factura_servicio_id?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          item_nombre: string
          item_precio?: number
          notas?: string | null
          producto_id?: string | null
          servicio_id?: string | null
          sku?: string | null
          tipo: string
          unidad: string
          updated_at?: string
          utilizada_at?: string | null
        }
        Update: {
          cantidad?: number
          cliente_id?: string
          codigo?: string
          created_at?: string
          duracion?: number
          factura_id?: string
          factura_item_id?: string | null
          factura_servicio_id?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          item_nombre?: string
          item_precio?: number
          notas?: string | null
          producto_id?: string | null
          servicio_id?: string | null
          sku?: string | null
          tipo?: string
          unidad?: string
          updated_at?: string
          utilizada_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garantias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_factura_item_id_fkey"
            columns: ["factura_item_id"]
            isOneToOne: false
            referencedRelation: "factura_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_factura_servicio_id_fkey"
            columns: ["factura_servicio_id"]
            isOneToOne: false
            referencedRelation: "factura_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "garantias_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_sede: {
        Row: {
          id: string
          sede_id: string
          stock: number
          stock_minimo: number
          variante_id: string
        }
        Insert: {
          id?: string
          sede_id: string
          stock?: number
          stock_minimo?: number
          variante_id: string
        }
        Update: {
          id?: string
          sede_id?: string
          stock?: number
          stock_minimo?: number
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_sede_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "inventario_sede_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_sede_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "inventario_sede_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      motos_clientes: {
        Row: {
          activo: boolean
          anio: number | null
          cilindraje: string | null
          cliente_id: string
          color: string | null
          created_at: string
          id: string
          kilometraje: number | null
          marca: string | null
          modelo: string | null
          placa: string | null
          updated_at: string
          vin: string | null
        }
        Insert: {
          activo?: boolean
          anio?: number | null
          cilindraje?: string | null
          cliente_id: string
          color?: string | null
          created_at?: string
          id?: string
          kilometraje?: number | null
          marca?: string | null
          modelo?: string | null
          placa?: string | null
          updated_at?: string
          vin?: string | null
        }
        Update: {
          activo?: boolean
          anio?: number | null
          cilindraje?: string | null
          cliente_id?: string
          color?: string | null
          created_at?: string
          id?: string
          kilometraje?: number | null
          marca?: string | null
          modelo?: string | null
          placa?: string | null
          updated_at?: string
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motos_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          fecha: string
          id: string
          motivo: string | null
          sede_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id: string | null
          variante_id: string
        }
        Insert: {
          cantidad: number
          fecha?: string
          id?: string
          motivo?: string | null
          sede_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
          variante_id: string
        }
        Update: {
          cantidad?: number
          fecha?: string
          id?: string
          motivo?: string | null
          sede_id?: string
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "movimientos_inventario_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "movimientos_inventario_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones_sms_archivo: {
        Row: {
          canal: string
          cita_id: string
          cliente_id: string
          created_at: string
          enviada_at: string | null
          estado: string
          estado_nuevo: Database["public"]["Enums"]["estado_cita"]
          id: string
          intentos: number
          mensaje: string
          proveedor: string | null
          proveedor_id: string | null
          servicio_id: string
          servicio_nombre: string
          telefono: string | null
          ultimo_error: string | null
          updated_at: string
        }
        Insert: {
          canal?: string
          cita_id: string
          cliente_id: string
          created_at?: string
          enviada_at?: string | null
          estado?: string
          estado_nuevo: Database["public"]["Enums"]["estado_cita"]
          id?: string
          intentos?: number
          mensaje: string
          proveedor?: string | null
          proveedor_id?: string | null
          servicio_id: string
          servicio_nombre: string
          telefono?: string | null
          ultimo_error?: string | null
          updated_at?: string
        }
        Update: {
          canal?: string
          cita_id?: string
          cliente_id?: string
          created_at?: string
          enviada_at?: string | null
          estado?: string
          estado_nuevo?: Database["public"]["Enums"]["estado_cita"]
          id?: string
          intentos?: number
          mensaje?: string
          proveedor?: string | null
          proveedor_id?: string | null
          servicio_id?: string
          servicio_nombre?: string
          telefono?: string | null
          ultimo_error?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_cita_id_fkey"
            columns: ["cita_id"]
            isOneToOne: true
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          attempts: number
          created_at: string
          data: Json
          error_message: string | null
          event_id: string
          failed_at: string | null
          id: string
          message: string
          processing_started_at: string | null
          provider_message_ids: Json
          read_at: string | null
          sent_at: string | null
          service_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          attempts?: number
          created_at?: string
          data?: Json
          error_message?: string | null
          event_id: string
          failed_at?: string | null
          id?: string
          message: string
          processing_started_at?: string | null
          provider_message_ids?: Json
          read_at?: string | null
          sent_at?: string | null
          service_id?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          attempts?: number
          created_at?: string
          data?: Json
          error_message?: string | null
          event_id?: string
          failed_at?: string | null
          id?: string
          message?: string
          processing_started_at?: string | null
          provider_message_ids?: Json
          read_at?: string | null
          sent_at?: string | null
          service_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          costo: number
          created_at: string
          descripcion: string | null
          garantia_duracion: number | null
          garantia_unidad: string | null
          id: string
          imagen_url: string | null
          marca_id: string | null
          nombre: string
          precio: number
          sede_id: string
          sku_base: string | null
          tipo_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          costo?: number
          created_at?: string
          descripcion?: string | null
          garantia_duracion?: number | null
          garantia_unidad?: string | null
          id?: string
          imagen_url?: string | null
          marca_id?: string | null
          nombre: string
          precio?: number
          sede_id: string
          sku_base?: string | null
          tipo_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          costo?: number
          created_at?: string
          descripcion?: string | null
          garantia_duracion?: number | null
          garantia_unidad?: string | null
          id?: string
          imagen_url?: string | null
          marca_id?: string | null
          nombre?: string
          precio?: number
          sede_id?: string
          sku_base?: string | null
          tipo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "productos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          device_identifier: string | null
          failure_count: number
          id: string
          last_error: string | null
          last_used_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          device_identifier?: string | null
          failure_count?: number
          id?: string
          last_error?: string | null
          last_used_at?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          device_identifier?: string | null
          failure_count?: number
          id?: string
          last_error?: string | null
          last_used_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      reclamaciones_garantia: {
        Row: {
          codigo: string
          costo_cubierto: number
          created_at: string
          descripcion: string
          estado: string
          garantia_id: string
          id: string
          motivo: string
          resolucion: string | null
          tecnico_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          costo_cubierto?: number
          created_at?: string
          descripcion: string
          estado?: string
          garantia_id: string
          id?: string
          motivo: string
          resolucion?: string | null
          tecnico_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          costo_cubierto?: number
          created_at?: string
          descripcion?: string
          estado?: string
          garantia_id?: string
          id?: string
          motivo?: string
          resolucion?: string | null
          tecnico_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reclamaciones_garantia_garantia_id_fkey"
            columns: ["garantia_id"]
            isOneToOne: false
            referencedRelation: "garantias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamaciones_garantia_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      sedes: {
        Row: {
          activo: boolean
          ciudad: string | null
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          telefono: string | null
          tipo: Database["public"]["Enums"]["tipo_ubicacion"]
        }
        Insert: {
          activo?: boolean
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["tipo_ubicacion"]
        }
        Update: {
          activo?: boolean
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["tipo_ubicacion"]
        }
        Relationships: []
      }
      servicios: {
        Row: {
          activo: boolean
          descripcion: string | null
          duracion_estimada_min: number
          garantia_duracion: number | null
          garantia_unidad: string | null
          id: string
          nombre: string
          precio: number
          tipo: Database["public"]["Enums"]["tipo_servicio"]
        }
        Insert: {
          activo?: boolean
          descripcion?: string | null
          duracion_estimada_min?: number
          garantia_duracion?: number | null
          garantia_unidad?: string | null
          id?: string
          nombre: string
          precio?: number
          tipo?: Database["public"]["Enums"]["tipo_servicio"]
        }
        Update: {
          activo?: boolean
          descripcion?: string | null
          duracion_estimada_min?: number
          garantia_duracion?: number | null
          garantia_unidad?: string | null
          id?: string
          nombre?: string
          precio?: number
          tipo?: Database["public"]["Enums"]["tipo_servicio"]
        }
        Relationships: []
      }
      tipos_producto: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      traslados_productos: {
        Row: {
          fecha: string
          id: string
          producto_id: string
          sede_destino_id: string
          sede_origen_id: string
          usuario_id: string
        }
        Insert: {
          fecha?: string
          id?: string
          producto_id: string
          sede_destino_id: string
          sede_origen_id: string
          usuario_id: string
        }
        Update: {
          fecha?: string
          id?: string
          producto_id?: string
          sede_destino_id?: string
          sede_origen_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traslados_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "traslados_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_productos_sede_destino_id_fkey"
            columns: ["sede_destino_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "traslados_productos_sede_destino_id_fkey"
            columns: ["sede_destino_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_productos_sede_origen_id_fkey"
            columns: ["sede_origen_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "traslados_productos_sede_origen_id_fkey"
            columns: ["sede_origen_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_productos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          apellido: string | null
          created_at: string
          documento: string | null
          email: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          sede_id: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido?: string | null
          created_at?: string
          documento?: string | null
          email: string
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          sede_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string | null
          created_at?: string
          documento?: string | null
          email?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          sede_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["sede_id"]
          },
          {
            foreignKeyName: "usuarios_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      valores_atributo: {
        Row: {
          atributo_id: string
          id: string
          valor: string
        }
        Insert: {
          atributo_id: string
          id?: string
          valor: string
        }
        Update: {
          atributo_id?: string
          id?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "valores_atributo_atributo_id_fkey"
            columns: ["atributo_id"]
            isOneToOne: false
            referencedRelation: "atributos"
            referencedColumns: ["id"]
          },
        ]
      }
      variante_valores: {
        Row: {
          valor_atributo_id: string
          variante_id: string
        }
        Insert: {
          valor_atributo_id: string
          variante_id: string
        }
        Update: {
          valor_atributo_id?: string
          variante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variante_valores_valor_atributo_id_fkey"
            columns: ["valor_atributo_id"]
            isOneToOne: false
            referencedRelation: "valores_atributo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variante_valores_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "variante_valores_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      variantes_producto: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          precio_adicional: number
          producto_id: string
          sku: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          precio_adicional?: number
          producto_id: string
          sku?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          precio_adicional?: number
          producto_id?: string
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "inventario_detallado"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventario_detallado: {
        Row: {
          id: string | null
          producto: string | null
          producto_id: string | null
          sede: string | null
          sede_id: string | null
          stock: number | null
          stock_minimo: number | null
          variante_id: string | null
          variante_sku: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      actualizar_estado_factura: {
        Args: { p_estado: string; p_factura_id: string }
        Returns: undefined
      }
      buscar_clientes: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          apellido: string
          documento: string
          email: string
          id: string
          nombre: string
          telefono: string
        }[]
      }
      claim_push_notification: {
        Args: { p_notification_id: string }
        Returns: {
          appointment_id: string | null
          attempts: number
          created_at: string
          data: Json
          error_message: string | null
          event_id: string
          failed_at: string | null
          id: string
          message: string
          processing_started_at: string | null
          provider_message_ids: Json
          read_at: string | null
          sent_at: string | null
          service_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      configurar_garantia_producto: {
        Args: { p_duracion: number; p_producto_id: string; p_unidad: string }
        Returns: undefined
      }
      crear_factura: {
        Args: {
          p_cliente_direccion: string
          p_cliente_documento: string
          p_cliente_email: string
          p_cliente_id: string
          p_cliente_nombre: string
          p_cliente_telefono: string
          p_estado: string
          p_fecha_vencimiento: string
          p_items: Json
          p_metodo_pago: string
          p_moto_modelo: string
          p_moto_placa: string
          p_notas: string
          p_sede_id: string
          p_tasa_impuesto: number
        }
        Returns: {
          id: string
          numero_factura: string
        }[]
      }
      crear_producto_inventario: {
        Args: {
          p_activo?: boolean
          p_costo: number
          p_descripcion: string
          p_imagen_url: string
          p_marca_id: string
          p_nombre: string
          p_precio: number
          p_sede_id: string
          p_sku: string
          p_stock_inicial: number
          p_stock_minimo: number
          p_tipo_id: string
        }
        Returns: Json
      }
      fecha_fin_garantia: {
        Args: { p_duracion: number; p_fecha: string; p_unidad: string }
        Returns: string
      }
      mover_producto_sede: {
        Args: { p_producto_id: string; p_sede_destino_id: string }
        Returns: Json
      }
      registrar_garantia_manual: {
        Args: {
          p_cantidad: number
          p_duracion: number
          p_factura_id: string
          p_item_nombre: string
          p_item_precio: number
          p_notas: string
          p_sku: string
          p_tipo: string
          p_unidad: string
        }
        Returns: string
      }
      rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      sede_actual: { Args: never; Returns: string }
      verify_push_webhook_secret: {
        Args: { p_secret: string }
        Returns: boolean
      }
    }
    Enums: {
      estado_cita:
        | "pendiente"
        | "confirmada"
        | "en_proceso"
        | "completada"
        | "cancelada"
      rol_usuario: "admin" | "empleado" | "cliente"
      tipo_movimiento: "entrada" | "salida"
      tipo_servicio:
        | "mantenimiento"
        | "instalacion"
        | "reparacion"
        | "diagnostico"
        | "otro"
      tipo_ubicacion: "Sede" | "bodega"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_cita: [
        "pendiente",
        "confirmada",
        "en_proceso",
        "completada",
        "cancelada",
      ],
      rol_usuario: ["admin", "empleado", "cliente"],
      tipo_movimiento: ["entrada", "salida"],
      tipo_servicio: [
        "mantenimiento",
        "instalacion",
        "reparacion",
        "diagnostico",
        "otro",
      ],
      tipo_ubicacion: ["Sede", "bodega"],
    },
  },
} as const

