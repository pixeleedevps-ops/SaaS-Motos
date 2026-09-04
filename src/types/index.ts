export type ViewMode =
  | 'dashboard'
  | 'inventory'
  | 'attendance'
  | 'customers'
  | 'services'
  | 'appointments'
  | 'actas'
  | 'invoices'
  | 'new-invoice'
  | 'warranties'
  | 'analytics'
  | 'settings';

export interface Motorcycle {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  mileage: number;
  color: string;
  cylinderCapacity: string;
}

export interface Customer {
  id: string;
  name: string;
  cedula?: string; // Número de Cédula de Ciudadanía / NIT
  email: string;
  phone: string;
  avatar?: string;
  address: string;
  city: string;
  isVIP: boolean;
  registrationDate: string;
  notes: string;
  motorcycles: Motorcycle[];
  totalSpent: number;
  completedServicesCount: number;
  nextRevisionDate?: string;
}

export interface Appointment {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string;
  motorcyclePlate: string;
  motorcycleModel: string;
  serviceId: string;
  serviceName: string;
  technicianName: string;
  branch: string;
  date: string;
  time: string;
  status: 'Pendiente' | 'Confirmada' | 'En Proceso' | 'Completada' | 'Cancelada';
  estimatedDurationMin: number;
  notes?: string;
  price: number;
}

export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: 'Aceites y Lubricantes' | 'Frenos y Neumáticos' | 'Transmisión' | 'Motor y Filtros' | 'Accesorios' | 'Eléctrico';
  branch: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  costPrice: number;
  salePrice: number;
  location: string;
  lastRestocked: string;
}

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  /** Display label derived from servicios.tipo; unknown future types are valid. */
  category: string;
  durationMin: number;
  price: number;
  isActive: boolean;
  description: string;
  requiredParts?: string[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  avatar?: string;
  branch: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'En Turno' | 'Retraso' | 'Fuera' | 'Pausa';
  totalHoursWorked?: number;
  shift: 'Mañana (08:00 - 16:00)' | 'Tarde (14:00 - 22:00)' | 'Completo (09:00 - 18:00)' | 'Mañana (08:00 - 17:00)' | 'Completo (08:30 - 18:00)' | 'Tarde (13:00 - 21:00)';
}

export interface InspectionCheckItem {
  id: string;
  name: string;
  category: 'Luces y Eléctrico' | 'Frenos y Neumáticos' | 'Motor y Fluidos' | 'Carrocería y Mandos';
  status: 'OK' | 'Regular' | 'Dañado' | 'No Aplica';
  notes?: string;
}

export interface ReplacedPartItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ActaTecnica {
  id: string;
  actaNumber: string;
  type: 'recepcion' | 'entrega';
  date: string;
  time: string;
  appointmentId?: string;
  customerName: string;
  customerPhone: string;
  motorcycle: string;
  plate: string;
  mileage: number;
  fuelLevel: 'Reserva' | '1/4' | '1/2' | '3/4' | 'Lleno';
  technicianName: string;
  branch: string;
  observations: string;
  checklist: InspectionCheckItem[];
  replacedParts?: ReplacedPartItem[];
  photos: string[];
  clientSignature?: string;
  technicianSignature?: string;
  status: 'Borrador' | 'Firmada' | 'Entregada';
}

export interface InvoiceItem {
  id: string;
  description: string;
  sku?: string;
  type: 'product' | 'service';
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerNIF: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  motorcyclePlate?: string;
  motorcycleModel?: string;
  branch: string;
  issueDate: string;
  dueDate: string;
  employeeName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number; // e.g. 21%
  taxAmount: number;
  discountTotal: number;
  total: number;
  paymentMethod: 'Tarjeta' | 'Transferencia' | 'Efectivo' | 'Financiación' | 'Nequi / Daviplata' | 'Transferencia Bancolombia / QR' | 'Tarjeta Crédito' | 'Nequi / QR';
  status: 'Pagada' | 'Pendiente' | 'Anulada' | 'Borrador';
  notes?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'appointment' | 'stock' | 'invoice' | 'service' | 'attendance' | 'warranty';
  title: string;
  description: string;
  user: string;
  badgeColor?: string;
}

export interface WarrantyClaim {
  id: string;
  claimCode: string;
  date: string;
  reason: string;
  description: string;
  mechanicAssigned?: string;
  status: 'En Revisión' | 'Aprobada' | 'En Reparación' | 'Finalizada' | 'Rechazada';
  resolution?: string;
  costCovered: number;
}

export interface WarrantyRecord {
  id: string;
  code: string; // e.g. "GAR-2025-0841-A"
  type: 'service' | 'product';
  itemName: string;
  category: string;
  sku?: string; // Product SKU (e.g. "MICH-R6-1805517", "DID-525VX3-120")
  brand?: string;
  
  // Billing info
  invoiceId: string;
  invoiceNumber: string;
  itemPrice: number;
  quantity: number;
  paymentMethod: string;
  
  // Customer info
  customerId: string;
  customerName: string;
  customerCedula: string; // Cédula de ciudadanía / NIT (e.g. "1.020.456.789", "79.845.120")
  customerPhone: string;
  customerEmail: string;
  
  // Vehicle info
  motorcyclePlate: string;
  motorcycleModel: string;
  
  // Sede / Branch
  branch: string;
  
  // Dates & Duration
  purchaseDate: string; // Fecha de compra
  warrantyMonths: number; // Duración en meses
  expirationDate: string; // Fecha de finalización de garantía
  
  // Mechanic info (especialmente para servicios)
  mechanicName?: string;
  mechanicRole?: string;
  mechanicAvatar?: string;
  
  // Coverage & Status
  coverageDetails: string;
  termsAndConditions?: string;
  status: 'Activa' | 'Por Vencer' | 'Vencida' | 'En Reclamación';
  daysRemaining: number;
  
  // Claims
  claims: WarrantyClaim[];
}
