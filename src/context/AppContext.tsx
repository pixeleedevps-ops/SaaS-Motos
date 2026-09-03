import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ViewMode,
  Customer,
  ProductItem,
  ServiceItem,
  Appointment,
  AttendanceRecord,
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
  INITIAL_ACTAS,
  INITIAL_INVOICES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_WARRANTIES,
} from '../data/mockData';
import { formatCOP } from '../utils/formatters';

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
  
  // Data
  customers: Customer[];
  products: ProductItem[];
  services: ServiceItem[];
  appointments: Appointment[];
  attendance: AttendanceRecord[];
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
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  createAppointment: (apt: Partial<Appointment>) => void;
  restockProduct: (id: string, amount: number) => void;
  createProduct: (product: Omit<ProductItem, 'id'>) => void;
  createCustomer: (cust: Partial<Customer>) => void;
  addMotorcycleToCustomer: (customerId: string, moto: Omit<Motorcycle, 'id'>) => void;
  updateCustomerNotes: (customerId: string, notes: string) => void;
  createInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => string;
  createActa: (acta: Omit<ActaTecnica, 'id' | 'actaNumber'>) => string;
  createWarranty: (warranty: Omit<WarrantyRecord, 'id' | 'code' | 'daysRemaining' | 'claims'>) => string;
  addWarrantyClaim: (warrantyId: string, claim: Omit<WarrantyClaim, 'id' | 'claimCode'>) => void;
  updateWarrantyStatus: (warrantyId: string, status: WarrantyRecord['status']) => void;
  toggleServiceStatus: (serviceId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedBranch, setSelectedBranch] = useState<string>('Sede Bogotá (Calle 80 - Principal)');
  const [branches] = useState<string[]>(INITIAL_BRANCHES);

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('motopro_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    const saved = localStorage.getItem('motopro_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [services, setServices] = useState<ServiceItem[]>(() => {
    const saved = localStorage.getItem('motopro_services');
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('motopro_appointments');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('motopro_attendance');
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
  });

  const [actas, setActas] = useState<ActaTecnica[]>(() => {
    const saved = localStorage.getItem('motopro_actas');
    return saved ? JSON.parse(saved) : INITIAL_ACTAS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('motopro_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [warranties, setWarranties] = useState<WarrantyRecord[]>(() => {
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

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('motopro_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('motopro_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('motopro_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('motopro_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('motopro_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
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

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
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

  const createAppointment = (aptData: Partial<Appointment>) => {
    const code = `CIT-2025-${Math.floor(100 + Math.random() * 900)}`;
    const newApt: Appointment = {
      id: 'APT-' + Date.now(),
      code,
      customerId: aptData.customerId || 'CUST-001',
      customerName: aptData.customerName || 'Cliente General',
      customerPhone: aptData.customerPhone || '+57 310 456 7890',
      customerAvatar: aptData.customerAvatar,
      motorcyclePlate: aptData.motorcyclePlate || 'UWE-48E',
      motorcycleModel: aptData.motorcycleModel || 'Moto genérica',
      serviceId: aptData.serviceId || 'SERV-001',
      serviceName: aptData.serviceName || 'Revisión General',
      technicianName: aptData.technicianName || 'Marcos Silva',
      branch: aptData.branch || selectedBranch,
      date: aptData.date || 'Hoy, 10:00',
      time: aptData.time || '10:00',
      status: 'Confirmada',
      estimatedDurationMin: aptData.estimatedDurationMin || 60,
      notes: aptData.notes,
      price: aptData.price || 180000,
    };
    setAppointments((prev) => [newApt, ...prev]);
    logActivity('Nueva Cita Creada', `Cita ${code} para ${newApt.customerName} (${newApt.motorcycleModel})`, 'appointment');
    showToast(`Cita ${code} agendada con éxito para ${newApt.date}`, 'success');
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
    showToast(`Stock repuesto (+${amount} unidades) correctamente`, 'success');
  };

  const createProduct = (prodData: Omit<ProductItem, 'id'>) => {
    const newProd: ProductItem = {
      ...prodData,
      id: 'PROD-' + Date.now(),
    };
    setProducts((prev) => [newProd, ...prev]);
    logActivity('Nuevo Producto', `Se agregó ${newProd.name} (${newProd.sku}) al catálogo`, 'stock');
    showToast(`Producto ${newProd.name} agregado al inventario`, 'success');
  };

  const createCustomer = (custData: Partial<Customer>) => {
    const newCust: Customer = {
      id: 'CUST-' + Math.floor(100 + Math.random() * 900),
      name: custData.name || 'Nuevo Cliente',
      email: custData.email || '',
      phone: custData.phone || '',
      address: custData.address || '',
      city: custData.city || 'Bogotá D.C.',
      isVIP: !!custData.isVIP,
      registrationDate: 'Hoy',
      notes: custData.notes || '',
      totalSpent: 0,
      completedServicesCount: 0,
      motorcycles: custData.motorcycles || [],
    };
    setCustomers((prev) => [newCust, ...prev]);
    setSelectedCustomer(newCust);
    logActivity('Cliente Registrado', `Se dio de alta la ficha de ${newCust.name}`, 'appointment');
    showToast(`Cliente ${newCust.name} creado correctamente`, 'success');
  };

  const addMotorcycleToCustomer = (customerId: string, moto: Omit<Motorcycle, 'id'>) => {
    const newMoto: Motorcycle = {
      ...moto,
      id: 'MOTO-' + Date.now(),
    };
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

  const createInvoice = (invData: Omit<Invoice, 'id' | 'invoiceNumber'>): string => {
    const invoiceNumber = `FAC-2025-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceId = 'INV-' + Date.now();
    const newInvoice: Invoice = {
      ...invData,
      id: invoiceId,
      invoiceNumber,
    };
    setInvoices((prev) => [newInvoice, ...prev]);

    // Find customer cédula or details
    const cust = customers.find((c) => c.id === invData.customerId);
    const customerCedula = cust?.cedula || invData.customerNIF || '1.020.456.789';

    // Auto-generate warranty records for each product/service item
    const newWarrantyRecords: WarrantyRecord[] = invData.items.map((item, idx) => {
      const isService = item.type === 'service';
      const months = isService ? 6 : 12; // 6 months for services, 12 months for parts
      
      const purchaseDate = invData.issueDate || '04 Mar 2025';
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + months);
      const expDateStr = expDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

      // Match mechanic info if service
      const mechanicList = [
        { name: 'Marcos Silva', role: 'Técnico Mecánico Principal', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
        { name: 'David Morales', role: 'Técnico Mecánico', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&auto=format&fit=crop&q=80' },
        { name: 'Carlos Arturo Ruiz', role: 'Técnico Electricista & Inyección', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
        { name: 'Roberto Gómez', role: 'Técnico Especialista Neumáticos', avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80' },
      ];
      const assignedMechanic = isService ? mechanicList[idx % mechanicList.length] : undefined;

      return {
        id: `WAR-${Date.now()}-${idx}`,
        code: `GAR-2025-${invoiceNumber.split('-')[2] || '0000'}-${isService ? 'S' : 'P'}${idx + 1}`,
        type: item.type,
        itemName: item.description,
        category: isService ? 'Servicio Oficial' : 'Repuesto / Producto',
        sku: item.sku || (item.type === 'product' ? `SKU-${item.id.slice(0, 6).toUpperCase()}` : undefined),
        invoiceId,
        invoiceNumber,
        itemPrice: item.unitPrice,
        quantity: item.quantity,
        paymentMethod: invData.paymentMethod,
        customerId: invData.customerId,
        customerName: invData.customerName,
        customerCedula,
        customerPhone: cust?.phone || '+57 310 456 7890',
        customerEmail: cust?.email || 'cliente@motopro.com.co',
        motorcyclePlate: invData.motorcyclePlate || 'UWE-48E',
        motorcycleModel: cust?.motorcycles[0]?.model || 'Motocicleta Cliente',
        branch: invData.branch || selectedBranch,
        purchaseDate,
        warrantyMonths: months,
        expirationDate: expDateStr,
        mechanicName: assignedMechanic?.name,
        mechanicRole: assignedMechanic?.role,
        mechanicAvatar: assignedMechanic?.avatar,
        coverageDetails: isService
          ? 'Garantía en mano de obra técnica certificada, ajuste de torques y sustitución de piezas defectuosas intervenidas.'
          : 'Garantía directa del fabricante ante defectos de manufactura o materiales.',
        termsAndConditions: 'Válida según el periodo estipulado. No cubre desgaste por uso negligente o manipulación ajena a MotoPro Colombia.',
        status: 'Activa',
        daysRemaining: months * 30,
        claims: [],
      };
    });

    if (newWarrantyRecords.length > 0) {
      setWarranties((prev) => [...newWarrantyRecords, ...prev]);
    }

    logActivity(
      'Factura Generada',
      `Factura ${invoiceNumber} por ${formatCOP(newInvoice.total)} (${newInvoice.customerName})`,
      'invoice'
    );
    showToast(`Factura ${invoiceNumber} emitida exitosamente y garantías registradas`, 'success');
    return newInvoice.id;
  };

  const createWarranty = (warrantyData: Omit<WarrantyRecord, 'id' | 'code' | 'daysRemaining' | 'claims'>): string => {
    const warId = 'WAR-' + Date.now();
    const code = `GAR-2025-${Math.floor(1000 + Math.random() * 9000)}`;
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

  const addWarrantyClaim = (warrantyId: string, claimData: Omit<WarrantyClaim, 'id' | 'claimCode'>) => {
    const claimCode = `REC-2025-${Math.floor(100 + Math.random() * 900)}`;
    const newClaim: WarrantyClaim = {
      ...claimData,
      id: 'CLM-' + Date.now(),
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
  };

  const updateWarrantyStatus = (warrantyId: string, status: WarrantyRecord['status']) => {
    setWarranties((prev) =>
      prev.map((w) => (w.id === warrantyId ? { ...w, status } : w))
    );
    showToast(`Estado de garantía actualizado a "${status}"`, 'info');
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
    showToast('Estado del servicio actualizado', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedBranch,
        setSelectedBranch,
        branches,
        customers,
        products,
        services,
        appointments,
        attendance,
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
        createCustomer,
        addMotorcycleToCustomer,
        updateCustomerNotes,
        createInvoice,
        createActa,
        createWarranty,
        addWarrantyClaim,
        updateWarrantyStatus,
        toggleServiceStatus,
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
