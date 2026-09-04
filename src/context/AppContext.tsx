import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ViewMode,
  Customer,
  ProductItem,
  ServiceItem,
  Appointment,
  AttendanceRecord,
  Employee,
  ActaTecnica,
  Invoice,
  ActivityLog,
  Motorcycle,
  WarrantyRecord,
  WarrantyClaim,
} from '../types';
import {
  INITIAL_BRANCHES,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_SERVICES,
  INITIAL_APPOINTMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_EMPLOYEES,
  INITIAL_ACTAS,
  INITIAL_INVOICES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_WARRANTIES,
} from '../data/mockData';
import { formatCOP } from '../utils/formatters';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Enums } from '../types/database';
import {
  createCustomerAccount,
  setCustomerAccountActive,
  updateCustomerAccount,
  type CustomerFormData,
} from '../services/customers';

const toProductCategory = (value?: string): ProductItem['category'] => {
  const normalized = value?.toLowerCase() ?? '';
  if (normalized.includes('aceite') || normalized.includes('lubric')) return 'Aceites y Lubricantes';
  if (normalized.includes('freno') || normalized.includes('neum')) return 'Frenos y Neumáticos';
  if (normalized.includes('transmi')) return 'Transmisión';
  if (normalized.includes('motor') || normalized.includes('filtro')) return 'Motor y Filtros';
  if (normalized.includes('eléctric') || normalized.includes('electric')) return 'Eléctrico';
  return 'Accesorios';
};

export type AppUserRole = 'admin' | 'empleado' | 'cliente' | null;

export interface CatalogOption {
  id: string;
  name: string;
}

const UNKNOWN_BRANCH = 'Sin ubicación';

const isKnownBranchName = (value?: string) => Boolean(value?.trim() && value.trim() !== UNKNOWN_BRANCH);

const normalizeProductBranch = (product: ProductItem): ProductItem => {
  const branch = isKnownBranchName(product.branch)
    ? product.branch.trim()
    : isKnownBranchName(product.location)
      ? product.location.trim()
      : UNKNOWN_BRANCH;

  return { ...product, branch, location: branch };
};

const toServiceCategory = (value?: string): ServiceItem['category'] => {
  const categories: Record<string, ServiceItem['category']> = {
    mantenimiento: 'Mantenimiento', instalacion: 'Instalación', reparacion: 'Reparación', diagnostico: 'Diagnóstico', otro: 'Otro',
  };
  const normalized = (value || 'otro').trim().toLowerCase();
  if (categories[normalized]) return categories[normalized];
  return normalized.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const toAppointmentStatus = (value: string): Appointment['status'] => ({
  pendiente: 'Pendiente', confirmada: 'Confirmada', en_proceso: 'En Proceso', completada: 'Completada', cancelada: 'Cancelada',
}[value] || 'Pendiente') as Appointment['status'];

const toDatabaseAppointmentStatus = (value: Appointment['status']): Enums<'estado_cita'> => ({
  Pendiente: 'pendiente', Confirmada: 'confirmada', 'En Proceso': 'en_proceso', Completada: 'completada', Cancelada: 'cancelada',
}[value]) as Enums<'estado_cita'>;

const toDatabaseServiceType = (value: ServiceItem['category']): Enums<'tipo_servicio'> => {
  const normalized = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('manten')) return 'mantenimiento';
  if (normalized.includes('instal')) return 'instalacion';
  if (normalized.includes('repara')) return 'reparacion';
  if (normalized.includes('diagn')) return 'diagnostico';
  return 'otro';
};

const toInvoiceStatus = (value?: string): Invoice['status'] => ({
  pagada: 'Pagada', pendiente: 'Pendiente', anulada: 'Anulada', borrador: 'Borrador',
}[value || ''] || 'Borrador') as Invoice['status'];

const toDatabaseInvoiceStatus = (value: Invoice['status']) => ({
  Pagada: 'pagada', Pendiente: 'pendiente', Anulada: 'anulada', Borrador: 'borrador',
}[value]);

interface ToastInfo {
  id: string;
  text: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  branches: string[];
  currentUserRole: AppUserRole;
  canManageInventory: boolean;
  productBrands: CatalogOption[];
  productCategories: CatalogOption[];
  
  // Data
  customers: Customer[];
  products: ProductItem[];
  services: ServiceItem[];
  appointments: Appointment[];
  attendance: AttendanceRecord[];
  employees: Employee[];
  actas: ActaTecnica[];
  invoices: Invoice[];
  warranties: WarrantyRecord[];
  activityLogs: ActivityLog[];

  // Selected Entities
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  selectedAppointment: Appointment | null;
  setSelectedAppointment: (apt: Appointment | null) => void;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: (inv: Invoice | null) => void;
  selectedActa: ActaTecnica | null;
  setSelectedActa: (acta: ActaTecnica | null) => void;
  selectedWarranty: WarrantyRecord | null;
  setSelectedWarranty: (warranty: WarrantyRecord | null) => void;

  // Modals & Navigation
  navigateTo: (view: ViewMode, meta?: { customerId?: string; appointmentId?: string; invoiceId?: string; actaId?: string; warrantyId?: string }) => void;
  toasts: ToastInfo[];
  showToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // Actions
  recordAttendance: (type: 'checkIn' | 'checkOut', employeeName?: string) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  createAppointment: (apt: Partial<Appointment>) => Promise<boolean>;
  restockProduct: (id: string, amount: number) => void;
  createProduct: (product: Omit<ProductItem, 'id'>) => Promise<boolean>;
  moveProductToBranch: (productId: string, branch: string) => Promise<boolean>;
  createCustomer: (cust: Partial<Customer> & { password?: string }) => Promise<boolean>;
  updateCustomer: (id: string, cust: Partial<Customer>) => Promise<boolean>;
  toggleCustomerStatus: (id: string) => Promise<boolean>;
  addMotorcycleToCustomer: (customerId: string, moto: Omit<Motorcycle, 'id'>) => Promise<boolean>;
  updateMotorcycle: (customerId: string, motorcycleId: string, moto: Partial<Motorcycle>) => Promise<void>;
  deleteMotorcycle: (customerId: string, motorcycleId: string) => Promise<void>;
  updateCustomerNotes: (customerId: string, notes: string) => void;
  createInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => Promise<string | null>;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<boolean>;
  createEmployee: (employee: Omit<Employee, 'id' | 'userId'>) => Promise<boolean>;
  updateEmployee: (id: string, employee: Partial<Omit<Employee, 'id' | 'userId'>>) => Promise<boolean>;
  toggleEmployeeStatus: (id: string) => Promise<boolean>;
  createActa: (acta: Omit<ActaTecnica, 'id' | 'actaNumber'>) => string;
  createWarranty: (warranty: Omit<WarrantyRecord, 'id' | 'code' | 'daysRemaining' | 'claims'>) => Promise<string | null>;
  addWarrantyClaim: (warrantyId: string, claim: Omit<WarrantyClaim, 'id' | 'claimCode'>) => Promise<boolean>;
  updateWarrantyStatus: (warrantyId: string, status: WarrantyRecord['status']) => Promise<void>;
  toggleServiceStatus: (serviceId: string) => void;
  createService: (service: Omit<ServiceItem, 'id' | 'code' | 'isActive'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedBranch, setSelectedBranch] = useState<string>('Sede Bogotá (Calle 80 - Principal)');
  const [branches, setBranches] = useState<string[]>(INITIAL_BRANCHES);
  const [branchOptions, setBranchOptions] = useState<CatalogOption[]>(() => INITIAL_BRANCHES.map((name) => ({ id: name, name })));
  const [currentUserRole, setCurrentUserRole] = useState<AppUserRole>(isSupabaseConfigured ? null : 'admin');
  const [productBrands, setProductBrands] = useState<CatalogOption[]>(() => [...new Set(INITIAL_PRODUCTS.map((product) => product.brand))].map((name) => ({ id: name, name })));
  const [productCategories, setProductCategories] = useState<CatalogOption[]>(() => [...new Set(INITIAL_PRODUCTS.map((product) => product.category))].map((name) => ({ id: name, name })));

  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (isSupabaseConfigured) return [];
    const saved = localStorage.getItem('motopro_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    if (isSupabaseConfigured) return [];
    const saved = localStorage.getItem('motopro_products');
    return saved
      ? (JSON.parse(saved) as ProductItem[]).map(normalizeProductBranch)
      : INITIAL_PRODUCTS.map(normalizeProductBranch);
  });

  const [services, setServices] = useState<ServiceItem[]>(() => {
    if (isSupabaseConfigured) return [];
    const saved = localStorage.getItem('motopro_services');
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (isSupabaseConfigured) return [];
    const saved = localStorage.getItem('motopro_appointments');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('motopro_attendance');
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (isSupabaseConfigured) return [];
    const saved = localStorage.getItem('motopro_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [actas, setActas] = useState<ActaTecnica[]>(() => {
    const saved = localStorage.getItem('motopro_actas');
    return saved ? JSON.parse(saved) : INITIAL_ACTAS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    if (isSupabaseConfigured) return [];
    const saved = localStorage.getItem('motopro_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [warranties, setWarranties] = useState<WarrantyRecord[]>(() => {
    if (isSupabaseConfigured) return [];
    const saved = localStorage.getItem('motopro_warranties');
    return saved ? JSON.parse(saved) : INITIAL_WARRANTIES;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('motopro_activity');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITY_LOGS;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedActa, setSelectedActa] = useState<ActaTecnica | null>(null);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // This runs only after AuthGate has established a Supabase session. Every
  // request therefore carries the JWT needed for the RLS policies in the
  // existing Spanish-schema database.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    const loadRemoteData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [customersResult, productsResult, productCostsResult, appointmentsResult, branchesResult, servicesResult, attendanceResult, employeesResult, invoicesResult, warrantiesResult, profileResult, brandsResult, categoriesResult] = await Promise.all([
        supabase.from('usuarios').select('id, nombre, apellido, email, telefono, documento, activo, created_at, motos_clientes(*)').eq('rol', 'cliente').order('created_at', { ascending: false }).limit(100),
        supabase.from('productos').select('id, nombre, descripcion, imagen_url, sku_base, precio, activo, sede_id, garantia_duracion, garantia_unidad, sede:sedes!productos_sede_id_fkey(id, nombre), marcas(nombre), tipos_producto(nombre), variantes_producto(id, sku, precio_adicional, inventario_sede(stock, stock_minimo, sedes(nombre)))').order('nombre'),
        // `costo` is introduced by the companion SQL patch. Keeping it in a
        // separate request lets existing databases continue loading products
        // until that patch is applied.
        supabase.from('productos').select('id, costo'),
        supabase.from('citas').select('id, cliente_id, empleado_id, servicio_id, sede_id, moto_id, fecha_hora, estado, estado_version, notas, usuarios!citas_cliente_id_fkey(nombre, apellido, telefono, documento), servicios(nombre, precio, duracion_estimada_min), sedes(nombre), motos_clientes(marca, modelo, placa), empleados(nombre, apellido, usuarios(nombre, apellido))').order('fecha_hora', { ascending: false }),
        // Load every branch so an existing product assigned to an inactive
        // branch still shows its name. Only active branches become options for
        // new products and transfers below.
        supabase.from('sedes').select('id, nombre, activo').order('nombre'),
        // Explicit columns keep the client independent of future additions to
        // the table and make the mapping from `tipo` deterministic.
        supabase.from('servicios').select('id, nombre, descripcion, tipo, duracion_estimada_min, precio, activo, garantia_duracion, garantia_unidad').order('nombre'),
        supabase.from('asistencia_empleados').select('id, fecha, hora_entrada, hora_salida, empleados(id, nombre, apellido, cargo, usuarios(nombre, apellido), sedes(nombre))').order('fecha', { ascending: false }),
        supabase.from('empleados').select('id, usuario_id, nombre, apellido, email, telefono, documento, cargo, sede_id, fecha_contratacion, activo, usuarios(nombre, apellido, email, telefono, documento), sedes(id, nombre)').order('nombre'),
        supabase.from('facturas').select('id, numero_factura, cliente_id, sede_id, fecha, fecha_vencimiento, subtotal, impuestos, total, descuento_total, metodo_pago, estado, notas, cliente_nombre, cliente_documento, cliente_email, cliente_telefono, cliente_direccion, moto_placa, moto_modelo, empleado_nombre, sedes(nombre), factura_items(id, variante_id, nombre_producto, cantidad, precio_unitario, subtotal, sku, descuento_porcentaje), factura_servicios(id, servicio_id, nombre_servicio, cantidad, precio_unitario, subtotal, descuento_porcentaje)').order('fecha', { ascending: false }),
        supabase.from('garantias').select('id, codigo, factura_id, cliente_id, tipo, item_nombre, sku, item_precio, cantidad, duracion, unidad, fecha_inicio, fecha_fin, utilizada_at, notas, facturas(numero_factura, metodo_pago, cliente_nombre, cliente_documento, cliente_email, cliente_telefono, moto_placa, moto_modelo, sedes(nombre)), usuarios(nombre, apellido, email, telefono, documento), productos(marcas(nombre)), servicios(nombre), reclamaciones_garantia(id, codigo, motivo, descripcion, estado, resolucion, costo_cubierto, created_at, empleados(nombre, apellido))').order('fecha_fin', { ascending: false }),
        user ? supabase.from('usuarios').select('rol, activo').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from('marcas').select('id, nombre').order('nombre'),
        supabase.from('tipos_producto').select('id, nombre').order('nombre'),
      ]);
      if (!active) return;
      [
        ['clientes', customersResult.error], ['inventario', productsResult.error], ['citas', appointmentsResult.error],
        ['sedes', branchesResult.error], ['servicios', servicesResult.error], ['asistencia', attendanceResult.error],
        ['empleados', employeesResult.error], ['facturas', invoicesResult.error], ['garantías', warrantiesResult.error],
        ['perfil', profileResult.error], ['marcas', brandsResult.error], ['categorías', categoriesResult.error],
      ].forEach(([module, error]) => { if (error) console.error(`No fue posible cargar ${module} desde Supabase`, error); });
      if (profileResult.data?.rol && profileResult.data.activo !== false) setCurrentUserRole(profileResult.data.rol as AppUserRole);
      if (brandsResult.data) setProductBrands(brandsResult.data.map((brand) => ({ id: brand.id, name: brand.nombre })));
      if (categoriesResult.data) setProductCategories(categoriesResult.data.map((category) => ({ id: category.id, name: category.nombre })));
      if (branchesResult.data) {
        const locations = branchesResult.data
          .filter((branch) => branch.activo !== false)
          .map((branch) => ({ id: branch.id, name: branch.nombre }));
        setBranchOptions(locations);
        setBranches(locations.map((branch) => branch.name));
      }
      const activeBranches = branchesResult.data?.filter((branch) => branch.activo !== false) || [];
      if (activeBranches.length && !activeBranches.some((branch) => branch.nombre === selectedBranch)) {
        setSelectedBranch(activeBranches[0].nombre);
      }
      if (customersResult.data) setCustomers(customersResult.data.map((customer: any) => ({
        id: customer.id, name: [customer.nombre, customer.apellido].filter(Boolean).join(' '), firstName: customer.nombre, lastName: customer.apellido || '', cedula: customer.documento || undefined, email: customer.email || '', phone: customer.telefono || '', isActive: customer.activo !== false,
        address: '', city: '', isVIP: false, registrationDate: new Date(customer.created_at).toLocaleDateString('es-CO'), notes: '', totalSpent: 0, completedServicesCount: 0,
        motorcycles: (customer.motos_clientes || []).filter((motorcycle: any) => motorcycle.activo !== false).map((motorcycle: any) => ({
          id: motorcycle.id, brand: motorcycle.marca || '', model: motorcycle.modelo || '', year: motorcycle.anio || 0,
          licensePlate: motorcycle.placa || '', vin: motorcycle.vin || '', mileage: motorcycle.kilometraje || 0, color: motorcycle.color || '', cylinderCapacity: motorcycle.cilindraje || '', isActive: motorcycle.activo !== false,
        })),
      })));
      if (productsResult.data) setProducts(productsResult.data.flatMap((product: any) => {
        const productCost = (productCostsResult.data as Array<{ id: string; costo: number }> | null)?.find((item) => item.id === product.id)?.costo;
        const branchFromId = branchesResult.data?.find((branch) => branch.id === product.sede_id)?.nombre;
        const variants = product.variantes_producto?.length
          ? product.variantes_producto
          : [{ id: product.id, sku: product.sku_base, precio_adicional: 0, inventario_sede: [] }];
        return variants.flatMap((variant: any) => {
        // A variant without stock is still shown as zero. Hiding it made a
        // populated catalogue look empty whenever inventario_sede was pending.
        const balances = variant.inventario_sede?.length ? variant.inventario_sede : [null];
        return balances.map((inventory: any) => {
          const stock = inventory?.stock || 0;
          const minStock = inventory?.stock_minimo || 0;
          // productos.sede_id is the canonical location. Resolve its display
          // name from the separately loaded branch catalogue first, then use
          // embedded relations only as fallbacks.
          const branchName = branchFromId
            || product.sede?.nombre
            || inventory?.sedes?.nombre
            || UNKNOWN_BRANCH;
          return {
            id: variant.id, productId: product.id, sku: variant.sku || product.sku_base || '', name: product.nombre,
            description: product.descripcion || '', imageUrl: product.imagen_url || '', brand: product.marcas?.nombre || '', category: product.tipos_producto?.nombre || toProductCategory(),
            branchId: product.sede_id, branch: branchName, isActive: product.activo !== false,
            currentStock: stock, minStock, maxStock: Math.max(stock, minStock * 2, 1), costPrice: Number(productCost || 0),
            salePrice: Number(product.precio) + Number(variant.precio_adicional), location: branchName, lastRestocked: '',
            warrantyDuration: product.garantia_duracion || undefined, warrantyUnit: product.garantia_unidad || undefined,
          };
        });
        });
      }));
      if (appointmentsResult.data) setAppointments(appointmentsResult.data.map((appointment: any) => ({
        id: appointment.id, code: `CIT-${appointment.id.slice(0, 8).toUpperCase()}`, customerId: appointment.cliente_id,
        customerName: [appointment.usuarios?.nombre, appointment.usuarios?.apellido].filter(Boolean).join(' ') || 'Cliente', customerPhone: appointment.usuarios?.telefono || '',
        customerDocument: appointment.usuarios?.documento || undefined,
        motorcycleId: appointment.moto_id || undefined, motorcyclePlate: appointment.motos_clientes?.placa || '', motorcycleModel: [appointment.motos_clientes?.marca, appointment.motos_clientes?.modelo].filter(Boolean).join(' '),
        serviceId: appointment.servicio_id, serviceName: appointment.servicios?.nombre || 'Servicio', technicianId: appointment.empleado_id || undefined, technicianName: [appointment.empleados?.nombre || appointment.empleados?.usuarios?.nombre, appointment.empleados?.apellido || appointment.empleados?.usuarios?.apellido].filter(Boolean).join(' '),
        branchId: appointment.sede_id,
        branch: appointment.sedes?.nombre || '', date: new Date(appointment.fecha_hora).toLocaleDateString('es-CO'),
        time: new Date(appointment.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        status: toAppointmentStatus(appointment.estado), estimatedDurationMin: appointment.servicios?.duracion_estimada_min || 0, notes: appointment.notas || undefined,
        price: Number(appointment.servicios?.precio || 0), scheduledAt: appointment.fecha_hora,
      })));
      if (servicesResult.data) setServices(servicesResult.data.map((service: any) => ({
        id: service.id, code: `SER-${service.id.slice(0, 8).toUpperCase()}`, name: service.nombre, category: toServiceCategory(service.tipo),
        durationMin: Number(service.duracion_estimada_min || 0), price: Number(service.precio || 0), isActive: service.activo !== false, description: service.descripcion || '',
        warrantyDuration: service.garantia_duracion || undefined, warrantyUnit: service.garantia_unidad || undefined,
      })));
      if (attendanceResult.data) setAttendance(attendanceResult.data.map((record: any) => {
        const checkIn = record.hora_entrada ? new Date(record.hora_entrada) : null;
        const checkOut = record.hora_salida ? new Date(record.hora_salida) : null;
        const workedHours = checkIn && checkOut ? Number(((checkOut.getTime() - checkIn.getTime()) / 3_600_000).toFixed(2)) : undefined;
        return {
          id: record.id, employeeId: record.empleados?.id || '', employeeName: [record.empleados?.nombre || record.empleados?.usuarios?.nombre, record.empleados?.apellido || record.empleados?.usuarios?.apellido].filter(Boolean).join(' ') || 'Empleado',
          employeeRole: record.empleados?.cargo || 'Empleado', branch: record.empleados?.sedes?.nombre || '', date: record.fecha,
          checkIn: checkIn ? checkIn.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—',
          checkOut: checkOut ? checkOut.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : undefined,
          status: checkOut ? 'Fuera' : 'En Turno', totalHoursWorked: workedHours, shift: 'Completo (09:00 - 18:00)',
        };
      }));
      if (employeesResult.data) setEmployees(employeesResult.data.map((employee: any) => ({
        id: employee.id, userId: employee.usuario_id || undefined,
        name: employee.nombre || employee.usuarios?.nombre || '', lastName: employee.apellido || employee.usuarios?.apellido || '',
        email: employee.email || employee.usuarios?.email || '', phone: employee.telefono || employee.usuarios?.telefono || '',
        document: employee.documento || employee.usuarios?.documento || '', role: employee.cargo,
        branchId: employee.sede_id, branch: employee.sedes?.nombre || UNKNOWN_BRANCH,
        hireDate: employee.fecha_contratacion, isActive: employee.activo !== false,
      })));
      if (invoicesResult.data) setInvoices(invoicesResult.data.map((invoice: any) => {
        const productItems = (invoice.factura_items || []).map((item: any) => ({
          id: item.id, referenceId: item.variante_id || undefined, description: item.nombre_producto,
          sku: item.sku || undefined, type: 'product' as const, quantity: item.cantidad,
          unitPrice: Number(item.precio_unitario), discountPercent: Number(item.descuento_porcentaje || 0), total: Number(item.subtotal),
        }));
        const serviceItems = (invoice.factura_servicios || []).map((item: any) => ({
          id: item.id, referenceId: item.servicio_id || undefined, description: item.nombre_servicio,
          type: 'service' as const, quantity: item.cantidad, unitPrice: Number(item.precio_unitario),
          discountPercent: Number(item.descuento_porcentaje || 0), total: Number(item.subtotal),
        }));
        const issueDate = new Date(`${invoice.fecha}T00:00:00`).toLocaleDateString('es-CO');
        const dueDate = invoice.fecha_vencimiento ? new Date(`${invoice.fecha_vencimiento}T00:00:00`).toLocaleDateString('es-CO') : issueDate;
        const subtotal = Number(invoice.subtotal || 0);
        return {
          id: invoice.id, invoiceNumber: invoice.numero_factura, customerId: invoice.cliente_id,
          customerName: invoice.cliente_nombre || 'Cliente', customerNIF: invoice.cliente_documento || '',
          customerEmail: invoice.cliente_email || '', customerPhone: invoice.cliente_telefono || '',
          customerAddress: invoice.cliente_direccion || '', motorcyclePlate: invoice.moto_placa || undefined,
          motorcycleModel: invoice.moto_modelo || undefined, branch: invoice.sedes?.nombre || UNKNOWN_BRANCH,
          issueDate, dueDate, employeeName: invoice.empleado_nombre || 'Equipo MotoPro',
          items: [...productItems, ...serviceItems], subtotal,
          taxRate: subtotal > 0 ? Number(((Number(invoice.impuestos || 0) / subtotal) * 100).toFixed(2)) : 0,
          taxAmount: Number(invoice.impuestos || 0), discountTotal: Number(invoice.descuento_total || 0),
          total: Number(invoice.total || 0), paymentMethod: invoice.metodo_pago as Invoice['paymentMethod'],
          status: toInvoiceStatus(invoice.estado), notes: invoice.notas || undefined,
        };
      }));
      if (warrantiesResult.data) setWarranties(warrantiesResult.data.map((warranty: any) => {
        const start = new Date(`${warranty.fecha_inicio}T00:00:00`);
        const end = new Date(`${warranty.fecha_fin}T23:59:59`);
        const daysRemaining = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
        const hasOpenClaim = (warranty.reclamaciones_garantia || []).some((claim: any) => !['finalizada', 'rechazada'].includes(claim.estado));
        const status: WarrantyRecord['status'] = hasOpenClaim || warranty.utilizada_at
          ? 'En Reclamación'
          : end.getTime() < Date.now()
            ? 'Vencida'
            : daysRemaining <= 30 ? 'Por Vencer' : 'Activa';
        const invoice = warranty.facturas || {};
        const customer = warranty.usuarios || {};
        return {
          id: warranty.id, code: warranty.codigo, type: warranty.tipo, itemName: warranty.item_nombre,
          category: warranty.tipo === 'service' ? 'Servicio Mecánico' : 'Repuesto / Producto', sku: warranty.sku || undefined,
          brand: warranty.productos?.marcas?.nombre || undefined, invoiceId: warranty.factura_id,
          invoiceNumber: invoice.numero_factura || '', itemPrice: Number(warranty.item_precio || 0), quantity: warranty.cantidad,
          paymentMethod: invoice.metodo_pago || '', customerId: warranty.cliente_id,
          customerName: invoice.cliente_nombre || [customer.nombre, customer.apellido].filter(Boolean).join(' '),
          customerCedula: invoice.cliente_documento || customer.documento || '', customerPhone: invoice.cliente_telefono || customer.telefono || '',
          customerEmail: invoice.cliente_email || customer.email || '', motorcyclePlate: invoice.moto_placa || '',
          motorcycleModel: invoice.moto_modelo || '', branch: invoice.sedes?.nombre || UNKNOWN_BRANCH,
          purchaseDate: start.toLocaleDateString('es-CO'),
          warrantyMonths: warranty.unidad === 'meses' ? warranty.duracion : warranty.unidad === 'anios' ? warranty.duracion * 12 : Math.ceil(warranty.duracion / 30),
          expirationDate: end.toLocaleDateString('es-CO'), coverageDetails: warranty.notas || 'Cobertura según condiciones de la factura.',
          status, daysRemaining,
          claims: (warranty.reclamaciones_garantia || []).map((claim: any) => ({
            id: claim.id, claimCode: claim.codigo, date: new Date(claim.created_at).toLocaleDateString('es-CO'),
            reason: claim.motivo, description: claim.descripcion,
            mechanicAssigned: [claim.empleados?.nombre, claim.empleados?.apellido].filter(Boolean).join(' ') || undefined,
            status: ({ en_revision: 'En Revisión', aprobada: 'Aprobada', en_reparacion: 'En Reparación', finalizada: 'Finalizada', rechazada: 'Rechazada' }[claim.estado] || 'En Revisión') as WarrantyClaim['status'],
            resolution: claim.resolucion || undefined, costCovered: Number(claim.costo_cubierto || 0),
          })),
        };
      }));
    };
    void loadRemoteData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedCustomer || !customers.some((customer) => customer.id === selectedCustomer.id)) {
      setSelectedCustomer(customers[0] || null);
    }
  }, [customers, selectedCustomer]);

  // Sync to local storage
  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('motopro_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('motopro_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('motopro_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('motopro_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('motopro_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('motopro_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('motopro_warranties', JSON.stringify(warranties));
  }, [warranties]);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const navigateTo = (
    view: ViewMode,
    meta?: { customerId?: string; appointmentId?: string; invoiceId?: string; actaId?: string; warrantyId?: string }
  ) => {
    if (meta?.customerId) {
      const found = customers.find((c) => c.id === meta.customerId);
      if (found) setSelectedCustomer(found);
    }
    if (meta?.appointmentId) {
      const found = appointments.find((a) => a.id === meta.appointmentId);
      if (found) setSelectedAppointment(found);
    }
    if (meta?.invoiceId) {
      const found = invoices.find((i) => i.id === meta.invoiceId);
      if (found) setSelectedInvoice(found);
    }
    if (meta?.actaId) {
      const found = actas.find((a) => a.id === meta.actaId);
      if (found) setSelectedActa(found);
    }
    if (meta?.warrantyId) {
      const found = warranties.find((w) => w.id === meta.warrantyId);
      if (found) setSelectedWarranty(found);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const logActivity = (title: string, description: string, type: ActivityLog['type'], user = 'Carlos Mendoza') => {
    const newLog: ActivityLog = {
      id: 'ACT-' + Date.now(),
      timestamp: 'Justo ahora',
      title,
      description,
      type,
      user,
      badgeColor:
        type === 'appointment'
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : type === 'invoice'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
          : type === 'stock'
          ? 'bg-rose-100 text-rose-800 border-rose-200'
          : 'bg-blue-100 text-blue-800 border-blue-200',
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 20)]);
  };

  const recordAttendance = (type: 'checkIn' | 'checkOut', employeeName = 'Carlos Mendoza (Jefe Taller)') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = `Hoy, ${now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    if (type === 'checkIn') {
      const existing = attendance.find((a) => a.employeeName.includes('Carlos') && a.date.includes('Hoy'));
      if (existing && existing.status === 'En Turno') {
        showToast('Ya tienes una entrada registrada para el turno actual', 'info');
        return;
      }
      const newRec: AttendanceRecord = {
        id: 'ATT-' + Date.now(),
        employeeId: 'EMP-01',
        employeeName,
        employeeRole: 'Mecánico Jefe',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        branch: selectedBranch,
        date: dateStr,
        checkIn: timeStr,
        status: 'En Turno',
        shift: 'Mañana (08:00 - 16:00)',
      };
      setAttendance((prev) => [newRec, ...prev]);
      logActivity('Entrada Registrada', `${employeeName} registró entrada a las ${timeStr}`, 'attendance', employeeName);
      showToast(`¡Entrada registrada correctamente a las ${timeStr}!`, 'success');
    } else {
      setAttendance((prev) =>
        prev.map((rec) => {
          if (rec.employeeName.includes('Carlos') && (!rec.checkOut || rec.checkOut === '—')) {
            return {
              ...rec,
              checkOut: timeStr,
              status: 'Fuera',
              totalHoursWorked: 8.2,
            };
          }
          return rec;
        })
      );
      logActivity('Salida Registrada', `${employeeName} registró salida a las ${timeStr}`, 'attendance', employeeName);
      showToast(`Salida registrada con éxito a las ${timeStr}. ¡Buen descanso!`, 'success');
    }
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    const currentAppointment = appointments.find((appointment) => appointment.id === id);
    if (currentAppointment?.status === status) {
      showToast('La cita ya se encuentra en ese estado.', 'info');
      return;
    }
    if (supabase) {
      if (currentUserRole !== 'admin' && currentUserRole !== 'empleado') {
        showToast('Solo administración y empleados pueden actualizar una cita.', 'error');
        return;
      }
      const { error } = await supabase
        .from('citas')
        .update({ estado: toDatabaseAppointmentStatus(status) })
        .eq('id', id)
        .select('id')
        .single();
      if (error) {
        console.error('No fue posible actualizar la cita en Supabase', error);
        showToast(`No se pudo actualizar la cita: ${error.message}`, 'error');
        return;
      }
    }
    setAppointments((prev) =>
      prev.map((apt) => {
        if (apt.id === id) {
          const updated = { ...apt, status };
          logActivity(
            `Estado Cita: ${status}`,
            `Cita ${apt.code} (${apt.motorcycleModel}) cambió a ${status}`,
            'appointment'
          );
          return updated;
        }
        return apt;
      })
    );
    showToast(`Cita actualizada a estado: ${status}`, 'success');
  };

  const createAppointment = async (aptData: Partial<Appointment>): Promise<boolean> => {
    const code = `CIT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    if (!aptData.customerId || !aptData.serviceId || !aptData.motorcycleId || !aptData.technicianId) {
      showToast('Cliente, vehículo, servicio y técnico son obligatorios.', 'error');
      return false;
    }
    const branch = branchOptions.find((item) => item.id === aptData.branchId || item.name === aptData.branch);
    if (!branch) {
      showToast('Selecciona una sede válida.', 'error');
      return false;
    }
    const scheduledAt = aptData.scheduledAt
      || new Date(`${aptData.date || new Date().toISOString().slice(0, 10)}T${aptData.time || '10:00'}:00`).toISOString();
    let appointmentId = `APT-${Date.now()}`;
    if (supabase) {
      const { data, error } = await supabase.from('citas').insert({
        cliente_id: aptData.customerId,
        moto_id: aptData.motorcycleId,
        empleado_id: aptData.technicianId,
        servicio_id: aptData.serviceId,
        sede_id: branch.id,
        fecha_hora: scheduledAt,
        estado: 'confirmada',
        notas: aptData.notes?.trim() || null,
      }).select('id').single();
      if (error || !data) {
        console.error('No fue posible guardar la cita en Supabase', error);
        showToast(`No se pudo guardar la cita: ${error?.message || 'error desconocido'}`, 'error');
        return false;
      }
      appointmentId = data.id;
    }
    const newApt: Appointment = {
      id: appointmentId,
      code,
      customerId: aptData.customerId || 'CUST-001',
      customerName: aptData.customerName || 'Cliente General',
      customerPhone: aptData.customerPhone || '+57 310 456 7890',
      customerAvatar: aptData.customerAvatar,
      customerDocument: aptData.customerDocument,
      motorcycleId: aptData.motorcycleId,
      motorcyclePlate: aptData.motorcyclePlate || '',
      motorcycleModel: aptData.motorcycleModel || '',
      serviceId: aptData.serviceId || 'SERV-001',
      serviceName: aptData.serviceName || 'Revisión General',
      technicianId: aptData.technicianId,
      technicianName: aptData.technicianName || '',
      branchId: branch.id,
      branch: branch.name,
      date: new Date(scheduledAt).toLocaleDateString('es-CO'),
      time: aptData.time || '10:00',
      status: 'Confirmada',
      estimatedDurationMin: aptData.estimatedDurationMin || 60,
      notes: aptData.notes,
      price: aptData.price || 0,
      scheduledAt,
    };
    setAppointments((prev) => [newApt, ...prev]);
    logActivity('Nueva Cita Creada', `Cita ${code} para ${newApt.customerName} (${newApt.motorcycleModel})`, 'appointment');
    showToast(`Cita ${code} agendada con éxito para ${newApt.date}`, 'success');
    return true;
  };

  const restockProduct = (id: string, amount: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, currentStock: Math.min(p.maxStock, p.currentStock + amount), lastRestocked: 'Hoy' };
          logActivity(
            'Stock Repuesto',
            `Se añadieron +${amount} uds a ${p.name} (Nuevo stock: ${updated.currentStock})`,
            'stock'
          );
          return updated;
        }
        return p;
      })
    );
    if (supabase) {
      void (async () => {
        const { data: row } = await supabase.from('inventario_sede').select('id, stock, sede_id, variante_id').eq('variante_id', id).order('stock', { ascending: false }).limit(1).maybeSingle();
        if (!row) return;
        const { error } = await supabase.from('inventario_sede').update({ stock: row.stock + amount }).eq('id', row.id);
        if (!error) await supabase.from('movimientos_inventario').insert({ variante_id: row.variante_id, sede_id: row.sede_id, tipo: 'entrada', cantidad: amount, motivo: 'Reposición desde plataforma' });
        if (error) { console.error('No fue posible actualizar inventario en Supabase', error); showToast(`No se pudo actualizar inventario: ${error.message}`, 'error'); }
      })();
    }
    showToast(`Stock repuesto (+${amount} unidades) correctamente`, 'success');
  };

  const createProduct = async (prodData: Omit<ProductItem, 'id'>): Promise<boolean> => {
    if (!canManageInventory) {
      showToast('Solo administradores y empleados pueden añadir productos', 'error');
      return false;
    }

    const branch = branchOptions.find((item) => item.name === prodData.branch);
    const brand = productBrands.find((item) => item.name === prodData.brand);
    const category = productCategories.find((item) => item.name === prodData.category);
    if (!branch || !brand || !category) {
      showToast('Selecciona una sede, marca y categoría válidas', 'error');
      return false;
    }

    if (supabase) {
      const { data, error } = await supabase.rpc('crear_producto_inventario', {
        p_nombre: prodData.name.trim(),
        p_descripcion: prodData.description?.trim() || null,
        p_sku: prodData.sku.trim(),
        p_marca_id: brand.id,
        p_tipo_id: category.id,
        p_sede_id: branch.id,
        p_costo: prodData.costPrice,
        p_precio: prodData.salePrice,
        p_imagen_url: prodData.imageUrl?.trim() || null,
        p_stock_inicial: prodData.currentStock,
        p_stock_minimo: prodData.minStock,
        p_activo: prodData.isActive !== false,
      });
      if (error || !data) {
        console.error('No fue posible crear producto en Supabase', error);
        showToast(`No se pudo guardar el producto: ${error?.message || 'error desconocido'}`, 'error');
        return false;
      }
      const result = data as { producto_id: string; variante_id: string };
      if (prodData.warrantyDuration && prodData.warrantyUnit) {
        const { error: warrantyError } = await supabase.rpc('configurar_garantia_producto', {
          p_producto_id: result.producto_id,
          p_duracion: prodData.warrantyDuration,
          p_unidad: prodData.warrantyUnit,
        });
        if (warrantyError) {
          showToast('El producto se creó, pero no fue posible configurar su garantía.', 'warning');
        }
      }
      const newProd: ProductItem = { ...prodData, id: result.variante_id, productId: result.producto_id, branchId: branch.id };
      setProducts((prev) => [newProd, ...prev]);
    } else {
      setProducts((prev) => [{ ...prodData, id: `PROD-${Date.now()}`, productId: `PROD-${Date.now()}`, branchId: branch.id }, ...prev]);
    }
    logActivity('Nuevo Producto', `Se agregó ${prodData.name} (${prodData.sku}) en ${prodData.branch}`, 'stock');
    showToast(`Producto ${prodData.name} agregado al inventario`, 'success');
    return true;
  };

  const canManageInventory = currentUserRole === 'admin' || currentUserRole === 'empleado';

  const moveProductToBranch = async (productId: string, branchName: string): Promise<boolean> => {
    if (!canManageInventory) {
      showToast('Tu perfil no tiene permiso para mover inventario', 'error');
      return false;
    }
    const destination = branchOptions.find((branch) => branch.name === branchName);
    const product = products.find((item) => (item.productId || item.id) === productId);
    if (!destination || !product) {
      showToast('No se encontró el producto o la sede de destino', 'error');
      return false;
    }
    if (product.branchId === destination.id) return true;

    if (supabase) {
      const { error } = await supabase.rpc('mover_producto_sede', {
        p_producto_id: productId,
        p_sede_destino_id: destination.id,
      });
      if (error) {
        console.error('No fue posible mover el producto en Supabase', error);
        showToast(`No se pudo mover el producto: ${error.message}`, 'error');
        return false;
      }
    }

    const previousBranch = product.branch;
    setProducts((prev) => prev.map((item) => (item.productId || item.id) === productId
      ? { ...item, branchId: destination.id, branch: destination.name, location: destination.name }
      : item));
    logActivity('Inventario trasladado', `${product.name}: ${previousBranch} → ${destination.name}`, 'stock');
    showToast(`${product.name} fue trasladado a ${destination.name}`, 'success');
    return true;
  };

  const toCustomerFormData = (customer: Partial<Customer> & { password?: string }): CustomerFormData => {
    const [fallbackFirst = '', ...fallbackLast] = (customer.name || '').trim().split(/\s+/);
    return {
      firstName: (customer.firstName || fallbackFirst).trim(),
      lastName: (customer.lastName || fallbackLast.join(' ')).trim(),
      email: (customer.email || '').trim(),
      phone: (customer.phone || '').trim(),
      document: (customer.cedula || '').trim(),
      password: customer.password,
    };
  };

  const createCustomer = async (custData: Partial<Customer> & { password?: string }): Promise<boolean> => {
    const fields = toCustomerFormData(custData);
    if (!fields.firstName || !fields.lastName || !fields.email || !fields.phone || !fields.document || !fields.password) {
      showToast('Nombre, apellido, correo, teléfono, documento y contraseña son obligatorios.', 'error');
      return false;
    }
    let id = `CUST-${Date.now()}`;
    if (supabase) {
      if (currentUserRole !== 'admin') {
        showToast('Solo administración puede crear cuentas de clientes.', 'error');
        return false;
      }
      try {
        const result = await createCustomerAccount(fields);
        id = result.id;
      } catch (error) {
        showToast(`No se pudo crear el cliente: ${error instanceof Error ? error.message : 'error desconocido'}`, 'error');
        return false;
      }
    }
    const newCust: Customer = {
      id,
      name: `${fields.firstName} ${fields.lastName}`.trim(),
      firstName: fields.firstName,
      lastName: fields.lastName,
      cedula: fields.document,
      email: fields.email,
      phone: fields.phone,
      address: custData.address || '',
      city: custData.city || 'Bogotá D.C.',
      isVIP: !!custData.isVIP,
      registrationDate: 'Hoy',
      notes: custData.notes || '',
      totalSpent: 0,
      completedServicesCount: 0,
      motorcycles: custData.motorcycles || [],
      isActive: true,
    };
    setCustomers((prev) => [newCust, ...prev]);
    setSelectedCustomer(newCust);
    logActivity('Cliente Registrado', `Se dio de alta la ficha de ${newCust.name}`, 'appointment');
    showToast(`Cliente ${newCust.name} creado correctamente`, 'success');
    return true;
  };

  const updateCustomer = async (id: string, changes: Partial<Customer>): Promise<boolean> => {
    const current = customers.find((customer) => customer.id === id);
    if (!current) return false;
    const merged = { ...current, ...changes };
    const fields = toCustomerFormData(merged);
    if (supabase) {
      try {
        await updateCustomerAccount(id, fields);
      } catch (error) {
        showToast(`No se pudo actualizar el cliente: ${error instanceof Error ? error.message : 'error desconocido'}`, 'error');
        return false;
      }
    }
    const updated = { ...merged, name: `${fields.firstName} ${fields.lastName}`.trim(), firstName: fields.firstName, lastName: fields.lastName, cedula: fields.document };
    setCustomers((list) => list.map((customer) => customer.id === id ? updated : customer));
    setSelectedCustomer((customer) => customer?.id === id ? updated : customer);
    showToast('Cliente actualizado.', 'success');
    return true;
  };

  const toggleCustomerStatus = async (id: string): Promise<boolean> => {
    const customer = customers.find((item) => item.id === id);
    if (!customer) return false;
    const active = customer.isActive === false;
    if (supabase) {
      try {
        await setCustomerAccountActive(id, active);
      } catch (error) {
        showToast(`No se pudo cambiar el estado: ${error instanceof Error ? error.message : 'error desconocido'}`, 'error');
        return false;
      }
    }
    setCustomers((list) => list.map((item) => item.id === id ? { ...item, isActive: active } : item));
    setSelectedCustomer((item) => item?.id === id ? { ...item, isActive: active } : item);
    showToast(active ? 'Cliente reactivado.' : 'Cliente desactivado sin eliminar su historial.', 'success');
    return true;
  };

  const addMotorcycleToCustomer = async (customerId: string, moto: Omit<Motorcycle, 'id'>): Promise<boolean> => {
    let newMoto: Motorcycle = { ...moto, id: 'MOTO-' + Date.now(), isActive: true };
    if (supabase) {
      const { data, error } = await supabase.from('motos_clientes').insert({
        cliente_id: customerId,
        marca: moto.brand,
        modelo: moto.model,
        anio: moto.year,
        placa: moto.licensePlate,
        cilindraje: moto.cylinderCapacity,
        vin: moto.vin || null,
        kilometraje: moto.mileage,
        color: moto.color || null,
        activo: true,
      }).select('id').single();
      if (error || !data) {
        showToast(`No se pudo guardar la moto: ${error?.message || 'respuesta vacía'}`, 'error');
        return false;
      }
      newMoto = { ...newMoto, id: data.id };
    }
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            motorcycles: [...c.motorcycles, newMoto],
          };
        }
        return c;
      })
    );
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer((prev) => (prev ? { ...prev, motorcycles: [...prev.motorcycles, newMoto] } : null));
    }
    showToast(`Vehículo ${moto.brand} ${moto.model} (${moto.licensePlate}) añadido`, 'success');
    return true;
  };

  const updateMotorcycle = async (customerId: string, motorcycleId: string, moto: Partial<Motorcycle>) => {
    setCustomers((prev) => prev.map((c) => c.id === customerId ? { ...c, motorcycles: c.motorcycles.map((m) => m.id === motorcycleId ? { ...m, ...moto } : m) } : c));
    if (supabase) { const { error } = await supabase.from('motos_clientes').update({ marca: moto.brand, modelo: moto.model, anio: moto.year, placa: moto.licensePlate, cilindraje: moto.cylinderCapacity, vin: moto.vin, kilometraje: moto.mileage, color: moto.color }).eq('id', motorcycleId); if (error) { showToast(`No se pudo actualizar la moto: ${error.message}`, 'error'); return; } }
    showToast('Motocicleta actualizada', 'success');
  };

  const deleteMotorcycle = async (customerId: string, motorcycleId: string) => {
    if (supabase) { const { error } = await supabase.from('motos_clientes').update({ activo: false }).eq('id', motorcycleId); if (error) { showToast(`No se pudo desactivar la moto: ${error.message}`, 'error'); return; } }
    setCustomers((prev) => prev.map((c) => c.id === customerId ? { ...c, motorcycles: c.motorcycles.filter((m) => m.id !== motorcycleId) } : c));
    showToast('Motocicleta desactivada; su historial se conserva.', 'success');
  };

  const updateCustomerNotes = (customerId: string, notes: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, notes } : c))
    );
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer((prev) => (prev ? { ...prev, notes } : null));
    }
    showToast('Notas del cliente guardadas', 'info');
  };

  const createInvoice = async (invData: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<string | null> => {
    let invoiceNumber = `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    let invoiceId = 'INV-' + Date.now();
    if (supabase) {
      const branch = branchOptions.find((item) => item.name === invData.branch);
      if (!branch) {
        showToast('Selecciona una sede válida antes de emitir la factura.', 'error');
        return null;
      }
      const dueDate = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase.rpc('crear_factura', {
        p_cliente_id: invData.customerId,
        p_sede_id: branch.id,
        p_fecha_vencimiento: dueDate,
        p_metodo_pago: invData.paymentMethod,
        p_estado: toDatabaseInvoiceStatus(invData.status),
        p_notas: invData.notes || '',
        p_cliente_nombre: invData.customerName,
        p_cliente_documento: invData.customerNIF,
        p_cliente_email: invData.customerEmail,
        p_cliente_telefono: invData.customerPhone,
        p_cliente_direccion: invData.customerAddress,
        p_moto_placa: invData.motorcyclePlate || '',
        p_moto_modelo: invData.motorcycleModel || '',
        p_tasa_impuesto: invData.taxRate,
        p_items: invData.items.map((item) => ({
          referenceId: item.referenceId || null, description: item.description, sku: item.sku || null,
          type: item.type, quantity: item.quantity, unitPrice: item.unitPrice,
          discountPercent: item.discountPercent, total: item.total,
        })),
      });
      if (error || !data?.[0]) {
        console.error('No fue posible emitir la factura en Supabase', error);
        showToast(`No se pudo emitir la factura: ${error?.message || 'respuesta vacía'}`, 'error');
        return null;
      }
      invoiceId = data[0].id;
      invoiceNumber = data[0].numero_factura;
    }
    const newInvoice: Invoice = {
      ...invData,
      id: invoiceId,
      invoiceNumber,
    };
    setInvoices((prev) => [newInvoice, ...prev]);

    logActivity(
      'Factura Generada',
      `Factura ${invoiceNumber} por ${formatCOP(newInvoice.total)} (${newInvoice.customerName})`,
      'invoice'
    );
    showToast(`Factura ${invoiceNumber} emitida. Las garantías configuradas se registraron en Supabase.`, 'success');
    return newInvoice.id;
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']): Promise<boolean> => {
    if (supabase) {
      const { error } = await supabase.rpc('actualizar_estado_factura', {
        p_factura_id: id,
        p_estado: toDatabaseInvoiceStatus(status),
      });
      if (error) {
        showToast(`No se pudo actualizar la factura: ${error.message}`, 'error');
        return false;
      }
    }
    setInvoices((prev) => prev.map((invoice) => invoice.id === id ? { ...invoice, status } : invoice));
    setSelectedInvoice((prev) => prev?.id === id ? { ...prev, status } : prev);
    showToast(`Factura actualizada a ${status}.`, status === 'Anulada' ? 'warning' : 'success');
    return true;
  };

  const createEmployee = async (employee: Omit<Employee, 'id' | 'userId'>): Promise<boolean> => {
    if (currentUserRole !== 'admin') {
      showToast('Solo administración puede crear empleados.', 'error');
      return false;
    }
    const branch = branchOptions.find((item) => item.name === employee.branch);
    if (!branch) return false;
    let id = `EMP-${Date.now()}`;
    if (supabase) {
      const { data, error } = await supabase.from('empleados').insert({
        nombre: employee.name, apellido: employee.lastName || null, email: employee.email || null,
        telefono: employee.phone || null, documento: employee.document || null, cargo: employee.role,
        sede_id: branch.id, fecha_contratacion: employee.hireDate, activo: employee.isActive,
      }).select('id').single();
      if (error || !data) {
        showToast(`No se pudo crear el empleado: ${error?.message || 'error desconocido'}`, 'error');
        return false;
      }
      id = data.id;
    }
    setEmployees((prev) => [{ ...employee, id, branchId: branch.id }, ...prev]);
    showToast(`Empleado ${employee.name} creado correctamente.`, 'success');
    return true;
  };

  const updateEmployee = async (id: string, changes: Partial<Omit<Employee, 'id' | 'userId'>>): Promise<boolean> => {
    if (currentUserRole !== 'admin') {
      showToast('Solo administración puede editar empleados.', 'error');
      return false;
    }
    const current = employees.find((employee) => employee.id === id);
    if (!current) return false;
    const branch = branchOptions.find((item) => item.name === (changes.branch || current.branch));
    if (!branch) return false;
    if (supabase) {
      const { error } = await supabase.from('empleados').update({
        nombre: changes.name ?? current.name, apellido: (changes.lastName ?? current.lastName) || null,
        email: (changes.email ?? current.email) || null, telefono: (changes.phone ?? current.phone) || null,
        documento: (changes.document ?? current.document) || null, cargo: changes.role ?? current.role,
        sede_id: branch.id, fecha_contratacion: changes.hireDate ?? current.hireDate,
        activo: changes.isActive ?? current.isActive,
      }).eq('id', id);
      if (error) {
        showToast(`No se pudo editar el empleado: ${error.message}`, 'error');
        return false;
      }
    }
    setEmployees((prev) => prev.map((employee) => employee.id === id ? { ...employee, ...changes, branchId: branch.id, branch: branch.name } : employee));
    showToast('Empleado actualizado.', 'success');
    return true;
  };

  const toggleEmployeeStatus = async (id: string): Promise<boolean> => {
    const employee = employees.find((item) => item.id === id);
    if (!employee) return false;
    return updateEmployee(id, { isActive: !employee.isActive });
  };

  const createWarranty = async (warrantyData: Omit<WarrantyRecord, 'id' | 'code' | 'daysRemaining' | 'claims'>): Promise<string | null> => {
    let warId = `WAR-${Date.now()}`;
    let code = `GAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (supabase) {
      const { data, error } = await supabase.rpc('registrar_garantia_manual', {
        p_factura_id: warrantyData.invoiceId,
        p_tipo: warrantyData.type,
        p_item_nombre: warrantyData.itemName,
        p_sku: warrantyData.sku || '',
        p_item_precio: warrantyData.itemPrice,
        p_cantidad: warrantyData.quantity,
        p_duracion: warrantyData.warrantyMonths,
        p_unidad: 'meses',
        p_notas: warrantyData.coverageDetails,
      });
      if (error || !data) {
        showToast(`No se pudo registrar la garantía: ${error?.message || 'error desconocido'}`, 'error');
        return null;
      }
      warId = data as string;
      const { data: persisted } = await supabase.from('garantias').select('codigo').eq('id', warId).single();
      if (persisted?.codigo) code = persisted.codigo;
    }
    const newWarranty: WarrantyRecord = {
      ...warrantyData,
      id: warId,
      code,
      daysRemaining: warrantyData.warrantyMonths * 30,
      claims: [],
    };
    setWarranties((prev) => [newWarranty, ...prev]);
    logActivity(
      'Garantía Registrada',
      `Póliza ${code} para ${newWarranty.customerName} (${newWarranty.itemName})`,
      'warranty'
    );
    showToast(`Garantía ${code} registrada exitosamente`, 'success');
    return warId;
  };

  const addWarrantyClaim = async (warrantyId: string, claimData: Omit<WarrantyClaim, 'id' | 'claimCode'>): Promise<boolean> => {
    const claimCode = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
    let claimId = `CLM-${Date.now()}`;
    if (supabase) {
      const employee = employees.find((item) => `${item.name} ${item.lastName}`.trim() === claimData.mechanicAssigned);
      const databaseStatus = ({ 'En Revisión': 'en_revision', Aprobada: 'aprobada', 'En Reparación': 'en_reparacion', Finalizada: 'finalizada', Rechazada: 'rechazada' }[claimData.status]);
      const { data, error } = await supabase.from('reclamaciones_garantia').insert({
        garantia_id: warrantyId,
        codigo: claimCode,
        motivo: claimData.reason,
        descripcion: claimData.description,
        estado: databaseStatus,
        tecnico_id: employee?.id || null,
        resolucion: claimData.resolution || null,
        costo_cubierto: claimData.costCovered,
      }).select('id').single();
      if (error || !data) {
        showToast(`No se pudo registrar la reclamación: ${error?.message || 'error desconocido'}`, 'error');
        return false;
      }
      claimId = data.id;
    }
    const newClaim: WarrantyClaim = {
      ...claimData,
      id: claimId,
      claimCode,
    };

    setWarranties((prev) =>
      prev.map((w) => {
        if (w.id === warrantyId) {
          return {
            ...w,
            status: 'En Reclamación',
            claims: [newClaim, ...w.claims],
          };
        }
        return w;
      })
    );

    logActivity(
      'Reclamación de Garantía',
      `Reclamación ${claimCode} radicada: ${newClaim.reason}`,
      'warranty'
    );
    showToast(`Reclamación ${claimCode} registrada y asignada al taller`, 'warning');
    return true;
  };

  const updateWarrantyStatus = async (warrantyId: string, status: WarrantyRecord['status']) => {
    setWarranties((prev) =>
      prev.map((w) => (w.id === warrantyId ? { ...w, status } : w))
    );
    showToast(`Estado mostrado: ${status}. La vigencia se calcula desde las fechas persistidas.`, 'info');
  };

  const createActa = (actaData: Omit<ActaTecnica, 'id' | 'actaNumber'>): string => {
    const actaNumber = `ACT-2025-${Math.floor(1000 + Math.random() * 9000)}`;
    const newActa: ActaTecnica = {
      ...actaData,
      id: 'ACTA-' + Date.now(),
      actaNumber,
    };
    setActas((prev) => [newActa, ...prev]);
    logActivity(
      `Acta de ${newActa.type === 'recepcion' ? 'Recepción' : 'Entrega'}`,
      `Acta ${actaNumber} generada para ${newActa.motorcycle} (${newActa.plate})`,
      'appointment'
    );
    showToast(`Acta ${actaNumber} registrada y firmada correctamente`, 'success');
    return newActa.id;
  };

  const toggleServiceStatus = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, isActive: !s.isActive } : s))
    );
    if (supabase) {
      const service = services.find((item) => item.id === serviceId);
      if (service) void supabase.from('servicios').update({ activo: !service.isActive }).eq('id', serviceId).then(({ error }) => {
        if (error) console.error('No fue posible actualizar el servicio en Supabase', error);
      });
    }
    showToast('Estado del servicio actualizado', 'info');
  };

  const createService = async (serviceData: Omit<ServiceItem, 'id' | 'code' | 'isActive'>) => {
    const type = toDatabaseServiceType(serviceData.category);
    if (supabase) {
      const { data, error } = await supabase.from('servicios').insert({ nombre: serviceData.name, descripcion: serviceData.description || null, tipo: type, duracion_estimada_min: serviceData.durationMin, precio: serviceData.price, activo: true, garantia_duracion: serviceData.warrantyDuration || null, garantia_unidad: serviceData.warrantyUnit || null }).select('id').single();
      if (error || !data) { showToast(`No se pudo guardar el servicio: ${error?.message || 'error'}`, 'error'); return; }
      setServices((prev) => [{ ...serviceData, id: data.id, code: `SER-${data.id.slice(0, 8).toUpperCase()}`, isActive: true }, ...prev]);
    } else setServices((prev) => [{ ...serviceData, id: `SER-${Date.now()}`, code: `SER-${Date.now()}`, isActive: true }, ...prev]);
    showToast(`Servicio ${serviceData.name} creado correctamente`, 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedBranch,
        setSelectedBranch,
        branches,
        currentUserRole,
        canManageInventory,
        productBrands,
        productCategories,
        customers,
        products,
        services,
        appointments,
        attendance,
        employees,
        actas,
        invoices,
        warranties,
        activityLogs,
        selectedCustomer,
        setSelectedCustomer,
        selectedAppointment,
        setSelectedAppointment,
        selectedInvoice,
        setSelectedInvoice,
        selectedActa,
        setSelectedActa,
        selectedWarranty,
        setSelectedWarranty,
        navigateTo,
        toasts,
        showToast,
        removeToast,
        recordAttendance,
        updateAppointmentStatus,
        createAppointment,
        restockProduct,
        createProduct,
        moveProductToBranch,
        createCustomer,
        updateCustomer,
        toggleCustomerStatus,
        addMotorcycleToCustomer,
        updateMotorcycle,
        deleteMotorcycle,
        updateCustomerNotes,
        createInvoice,
        updateInvoiceStatus,
        createEmployee,
        updateEmployee,
        toggleEmployeeStatus,
        createActa,
        createWarranty,
        addWarrantyClaim,
        updateWarrantyStatus,
        toggleServiceStatus,
        createService,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
