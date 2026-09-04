import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Crown,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wrench,
  DollarSign,
  Bike,
  FileText,
  Save,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Edit3,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Motorcycle } from '../../types';
import { formatCOP } from '../../utils/formatters';

export const CustomersView: React.FC = () => {
  const {
    customers,
    selectedCustomer,
    setSelectedCustomer,
    createCustomer,
    updateCustomer,
    toggleCustomerStatus,
    addMotorcycleToCustomer,
    updateCustomerNotes,
    navigateTo,
    invoices,
    appointments,
    currentUserRole,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'motos' | 'services' | 'invoices'>('info');
  const [notesDraft, setNotesDraft] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [showAddMotoModal, setShowAddMotoModal] = useState(false);

  // New customer form
  const [newCust, setNewCust] = useState<Partial<Customer> & { password?: string }>({
    firstName: '',
    lastName: '',
    cedula: '',
    email: '',
    phone: '',
    password: '',
  });

  // New motorcycle form
  const [newMoto, setNewMoto] = useState<Omit<Motorcycle, 'id'>>({
    brand: 'Yamaha',
    model: '',
    year: 2023,
    licensePlate: '',
    vin: '',
    mileage: 10000,
    color: 'Negro',
    cylinderCapacity: '600 cc',
  });

  const activeCustomer = selectedCustomer || customers[0];

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.cedula || '').includes(searchQuery) ||
    c.phone.includes(searchQuery) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.motorcycles.some((m) => m.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const customerInvoices = invoices.filter((i) => i.customerId === activeCustomer?.id);
  const customerAppointments = appointments.filter((a) => a.customerId === activeCustomer?.id);

  const handleSaveNotes = () => {
    if (activeCustomer) {
      updateCustomerNotes(activeCustomer.id, notesDraft);
      setIsEditingNotes(false);
    }
  };

  const resetCustomerForm = () => {
    setNewCust({ firstName: '', lastName: '', cedula: '', email: '', phone: '', password: '' });
    setEditingCustomerId(null);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = editingCustomerId
      ? await updateCustomer(editingCustomerId, newCust)
      : await createCustomer(newCust);
    if (success) {
      setShowAddCustomerModal(false);
      resetCustomerForm();
    }
  };

  const handleAddMoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMoto.model || !newMoto.licensePlate || !activeCustomer) return;
    const created = await addMotorcycleToCustomer(activeCustomer.id, newMoto);
    if (!created) return;
    setShowAddMotoModal(false);
    setNewMoto({
      brand: 'Yamaha',
      model: '',
      year: 2023,
      licensePlate: '',
      vin: '',
      mileage: 10000,
      color: 'Negro',
      cylinderCapacity: '600 cc',
    });
  };

  return (
    <div id="customers-view" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Fichas de Clientes & Vehículos</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Base de datos integral de propietarios, historial de revisiones y garaje de motocicletas.
          </p>
        </div>
        <button
          onClick={() => { resetCustomerForm(); setShowAddCustomerModal(true); }}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Main Grid: Customer Sidebar List + Customer Detail Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Customer Selector list (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, placa, cédula, tlf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredCustomers.map((cust) => {
              const isSelected = activeCustomer?.id === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => {
                    setSelectedCustomer(cust);
                    setNotesDraft(cust.notes);
                    setIsEditingNotes(false);
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-200 shadow-xs'
                      : 'bg-white hover:bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <img
                      src={
                        cust.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                      }
                      alt={cust.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-900 truncate">{cust.name}</p>
                        {cust.isVIP && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                            <Crown className="w-2.5 h-2.5" /> VIP
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 truncate mt-0.5">{cust.phone}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-600">
                        <span className="font-semibold text-gray-700">{cust.motorcycles.length} motos</span>
                        <span>•</span>
                        <span>{formatCOP(cust.totalSpent)} facturado</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Detailed Profile (8 cols) */}
        {activeCustomer ? (
          <div className="lg:col-span-8 space-y-5">
            
            {/* Customer Header Banner */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <img
                    src={
                      activeCustomer.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={activeCustomer.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-sm shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-gray-900">{activeCustomer.name}</h2>
                      {activeCustomer.isVIP && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Crown className="w-3 h-3 text-amber-600" />
                          Cliente VIP
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-600" />
                        <span>{activeCustomer.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-600" />
                        <span>{activeCustomer.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        <span>Documento: {activeCustomer.cedula || 'Sin registrar'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-600" />
                        <span>{activeCustomer.address}, {activeCustomer.city}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick actions for this customer */}
                <div className="flex items-center gap-2 self-start">
                  {currentUserRole === 'admin' && (
                    <>
                      <button
                        onClick={() => {
                          setEditingCustomerId(activeCustomer.id);
                          setNewCust({
                            firstName: activeCustomer.firstName || activeCustomer.name.split(' ')[0],
                            lastName: activeCustomer.lastName || activeCustomer.name.split(' ').slice(1).join(' '),
                            cedula: activeCustomer.cedula || '',
                            email: activeCustomer.email,
                            phone: activeCustomer.phone,
                          });
                          setShowAddCustomerModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
                      >Editar</button>
                      <button
                        onClick={() => void toggleCustomerStatus(activeCustomer.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs"
                      >{activeCustomer.isActive === false ? 'Reactivar' : 'Desactivar'}</button>
                    </>
                  )}
                  <button
                    onClick={() => setShowAddMotoModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Moto</span>
                  </button>
                  <button
                    onClick={() => {
                      navigateTo('appointments', { customerId: activeCustomer.id });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Agendar Cita</span>
                  </button>
                </div>
              </div>

              {/* 4 Metric Badges matching the design */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <span className="text-[11px] font-semibold text-gray-600">Motos Registradas</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">{activeCustomer.motorcycles.length}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <span className="text-[11px] font-semibold text-gray-600">Servicios Realizados</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">{activeCustomer.completedServicesCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <span className="text-[11px] font-semibold text-gray-600">Total Facturado</span>
                  <p className="text-lg font-black text-indigo-700 mt-0.5">{formatCOP(activeCustomer.totalSpent)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <span className="text-[11px] font-semibold text-gray-600">Próxima Revisión</span>
                  <p className="text-sm font-bold text-amber-700 mt-1">{activeCustomer.nextRevisionDate || 'No programada'}</p>
                </div>
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="flex border-b border-gray-200 text-xs font-bold px-4 gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-3.5 px-3 border-b-2 transition-all ${
                    activeTab === 'info'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Información & Notas
                </button>
                <button
                  onClick={() => setActiveTab('motos')}
                  className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'motos'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Motocicletas ({activeCustomer.motorcycles.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'services'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Historial de Citas ({customerAppointments.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'invoices'
                      ? 'border-indigo-600 text-indigo-600 font-extrabold'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Facturas Emitidas ({customerInvoices.length})</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                
                {/* TAB 1: Información & Notas */}
                {activeTab === 'info' && (
                  <div className="space-y-6 text-xs">
                    {/* Internal workshop notes */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <Edit3 className="w-4 h-4 text-amber-700" />
                          <span>Notas Internas del Taller & Preferencias</span>
                        </div>
                        {isEditingNotes ? (
                          <button
                            onClick={handleSaveNotes}
                            className="px-3 py-1 bg-amber-700 text-white rounded-lg font-bold hover:bg-amber-800 transition-colors flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setNotesDraft(activeCustomer.notes);
                              setIsEditingNotes(true);
                            }}
                            className="text-amber-800 font-bold hover:underline"
                          >
                            Editar notas
                          </button>
                        )}
                      </div>

                      {isEditingNotes ? (
                        <textarea
                          rows={3}
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          className="w-full mt-3 p-3 bg-white rounded-xl border border-amber-300 text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          placeholder="Escribe observaciones de servicio, preferencias de lubricante, historial especial..."
                        />
                      ) : (
                        <p className="mt-3 text-amber-950 leading-relaxed font-medium">
                          {activeCustomer.notes || 'Sin notas internas registradas.'}
                        </p>
                      )}
                    </div>

                    {/* Customer Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">Datos de Facturación</h4>
                        <div className="space-y-1.5 text-gray-600">
                          <p><span className="font-semibold text-gray-700">Nombre fiscal:</span> {activeCustomer.name}</p>
                          <p><span className="font-semibold text-gray-700">Email:</span> {activeCustomer.email}</p>
                          <p><span className="font-semibold text-gray-700">Dirección:</span> {activeCustomer.address}</p>
                          <p><span className="font-semibold text-gray-700">Ciudad/CP:</span> {activeCustomer.city}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">Fidelización & Métricas</h4>
                        <div className="space-y-1.5 text-gray-600">
                          <p><span className="font-semibold text-gray-700">Fecha de Alta:</span> {activeCustomer.registrationDate}</p>
                          <p><span className="font-semibold text-gray-700">Categoría:</span> {activeCustomer.isVIP ? 'VIP Oro' : 'Estándar'}</p>
                          <p><span className="font-semibold text-gray-700">Ticket Promedio:</span> {formatCOP(activeCustomer.totalSpent / (activeCustomer.completedServicesCount || 1))}</p>
                          <p><span className="font-semibold text-gray-700">Nivel de Satisfacción:</span> 98% (Excelente)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Motocicletas Registradas */}
                {activeTab === 'motos' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeCustomer.motorcycles.map((moto) => (
                        <div
                          key={moto.id}
                          className="p-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-xs hover:border-indigo-300 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-gray-900 text-sm">
                                  {moto.brand} {moto.model}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-800">
                                  {moto.year}
                                </span>
                              </div>
                              <div className="text-xs font-mono font-bold text-indigo-600 mt-1">
                                {moto.licensePlate}
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <Bike className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 pt-2 border-t border-gray-100">
                            <div>
                              <span className="text-gray-600">Kilometraje:</span>
                              <p className="font-bold text-gray-800">{moto.mileage.toLocaleString()} km</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Cilindrada:</span>
                              <p className="font-bold text-gray-800">{moto.cylinderCapacity}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Color:</span>
                              <p className="font-bold text-gray-800">{moto.color}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Nº Bastidor (VIN):</span>
                              <p className="font-mono text-[10px] font-semibold text-gray-700 truncate">{moto.vin}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              navigateTo('appointments', { customerId: activeCustomer.id });
                            }}
                            className="w-full py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                          >
                            <span>Crear Cita para este vehículo</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowAddMotoModal(true)}
                      className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Registrar Otra Moto en el Garaje de {activeCustomer.name}</span>
                    </button>
                  </div>
                )}

                {/* TAB 3: Historial de Servicios */}
                {activeTab === 'services' && (
                  <div className="space-y-3">
                    {customerAppointments.map((apt) => (
                      <div key={apt.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{apt.serviceName}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                              {apt.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-1">
                            Moto: {apt.motorcycleModel} ({apt.motorcyclePlate}) • Técnico: {apt.technicianName} • Fecha: {apt.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-gray-900 text-sm">{formatCOP(apt.price)}</span>
                        </div>
                      </div>
                    ))}
                    {customerAppointments.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-6">No hay citas activas registradas para este cliente.</p>
                    )}
                  </div>
                )}

                {/* TAB 4: Facturas */}
                {activeTab === 'invoices' && (
                  <div className="space-y-3">
                    {customerInvoices.map((inv) => (
                      <div key={inv.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900">{inv.invoiceNumber}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {inv.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-1">
                            Emisión: {inv.issueDate} • {inv.items.length} conceptos • Pago: {inv.paymentMethod}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-indigo-700 text-sm">{formatCOP(inv.total)}</span>
                          <button
                            onClick={() => navigateTo('invoices', { invoiceId: inv.id })}
                            className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100"
                          >
                            Ver Factura
                          </button>
                        </div>
                      </div>
                    ))}
                    {customerInvoices.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-6">No hay facturas emitidas aún para este cliente.</p>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        ) : null}

      </div>

      {/* Modal: Nuevo Cliente */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{editingCustomerId ? 'Editar Cliente' : 'Dar de Alta Nuevo Cliente'}</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-gray-600 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nombre *</label>
                  <input type="text" required value={newCust.firstName || ''} onChange={(e) => setNewCust({ ...newCust, firstName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-300" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Apellido *</label>
                  <input type="text" required value={newCust.lastName || ''} onChange={(e) => setNewCust({ ...newCust, lastName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Teléfono móvil *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+57 300 000 0000"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="cliente@email.com"
                    value={newCust.email}
                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Número de documento / cédula *</label>
                <input type="text" required value={newCust.cedula || ''} onChange={(e) => setNewCust({ ...newCust, cedula: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-300" />
              </div>

              {!editingCustomerId && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Contraseña inicial *</label>
                  <input type="password" minLength={8} required value={newCust.password || ''} onChange={(e) => setNewCust({ ...newCust, password: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-300" />
                  <p className="mt-1 text-[10px] text-gray-500">Mínimo 8 caracteres. El backend asigna siempre el rol cliente.</p>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
                >
                  {editingCustomerId ? 'Guardar cambios' : 'Crear Ficha de Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Añadir Moto */}
      {showAddMotoModal && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                Registrar Moto para {activeCustomer.name}
              </h3>
              <button onClick={() => setShowAddMotoModal(false)} className="text-gray-600 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleAddMoto} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Yamaha, Honda, BMW"
                    value={newMoto.brand}
                    onChange={(e) => setNewMoto({ ...newMoto, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. MT-07, CBR650R, GS 1250"
                    value={newMoto.model}
                    onChange={(e) => setNewMoto({ ...newMoto, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Placa de la Moto *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. UWE-48E"
                    value={newMoto.licensePlate}
                    onChange={(e) => setNewMoto({ ...newMoto, licensePlate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Año</label>
                  <input
                    type="number"
                    value={newMoto.year}
                    onChange={(e) => setNewMoto({ ...newMoto, year: parseInt(e.target.value) || 2023 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kilómetros</label>
                  <input
                    type="number"
                    value={newMoto.mileage}
                    onChange={(e) => setNewMoto({ ...newMoto, mileage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cilindrada</label>
                  <input
                    type="text"
                    placeholder="689 cc"
                    value={newMoto.cylinderCapacity}
                    onChange={(e) => setNewMoto({ ...newMoto, cylinderCapacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="Azul / Negro"
                    value={newMoto.color}
                    onChange={(e) => setNewMoto({ ...newMoto, color: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nº de Bastidor (VIN)</label>
                <input
                  type="text"
                  placeholder="ej. JYARN04100012984"
                  value={newMoto.vin}
                  onChange={(e) => setNewMoto({ ...newMoto, vin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddMotoModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
                >
                  Guardar Motocicleta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
