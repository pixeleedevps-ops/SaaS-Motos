import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Bike,
  User,
  Wrench,
  X,
  FileCheck2,
  ChevronRight,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Appointment } from '../../types';
import { formatCOP } from '../../utils/formatters';

export const AppointmentsView: React.FC = () => {
  const {
    appointments,
    selectedAppointment,
    setSelectedAppointment,
    updateAppointmentStatus,
    createAppointment,
    customers,
    services,
    navigateTo,
    selectedBranch,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todas');
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(!!selectedAppointment);

  // New appointment form state
  const [newCustomerId, setNewCustomerId] = useState(customers[0]?.id || '');
  const [newServiceId, setNewServiceId] = useState(services[0]?.id || '');
  const [newDate, setNewDate] = useState('Hoy');
  const [newTime, setNewTime] = useState('11:00');
  const [newTech, setNewTech] = useState('Carlos Rodríguez');
  const [newNotes, setNewNotes] = useState('');

  const activeApt = selectedAppointment;

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.motorcyclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.motorcycleModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'Todas' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDrawer = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleCreateAptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === newCustomerId) || customers[0];
    const srv = services.find((s) => s.id === newServiceId) || services[0];
    const moto = cust.motorcycles[0] || { licensePlate: 'UWE-48E', model: 'Moto Estándar' };

    createAppointment({
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerAvatar: cust.avatar,
      motorcyclePlate: moto.licensePlate,
      motorcycleModel: `${moto.brand || 'Moto'} ${moto.model}`,
      serviceId: srv.id,
      serviceName: srv.name,
      technicianName: newTech,
      branch: selectedBranch,
      date: `${newDate}, ${newTime}`,
      time: newTime,
      estimatedDurationMin: srv.durationMin,
      price: srv.price,
      notes: newNotes,
    });

    setShowNewAptModal(false);
    setNewNotes('');
  };

  return (
    <div id="appointments-view" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Agendamiento de Citas & Elevadores</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Control de citas mecánicas, asignación de técnicos y recepción de motocicletas.
          </p>
        </div>
        <button
          onClick={() => setShowNewAptModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Nueva Cita</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cita por cliente, placa (ej. UWE-48E), código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['Todas', 'Confirmada', 'En Proceso', 'Pendiente', 'Completada'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-200/80 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Cita / Horario</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Motocicleta</th>
                <th className="py-3.5 px-4">Servicio Requerido</th>
                <th className="py-3.5 px-4">Técnico Asignado</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAppointments.map((apt) => {
                const statusStyles = {
                  Confirmada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  'En Proceso': 'bg-blue-50 text-blue-700 border-blue-200',
                  Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
                  Completada: 'bg-gray-100 text-gray-700 border-gray-200',
                  Cancelada: 'bg-rose-50 text-rose-700 border-rose-200',
                };

                return (
                  <tr key={apt.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{apt.date}</div>
                      <div className="text-[11px] font-mono text-gray-600">{apt.code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            apt.customerAvatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={apt.customerName}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200"
                        />
                        <div>
                          <div className="font-bold text-gray-900">{apt.customerName}</div>
                          <div className="text-[11px] text-gray-600">{apt.customerPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-800">{apt.motorcycleModel}</div>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 font-mono text-[10px] font-bold text-gray-700 mt-0.5">
                        {apt.motorcyclePlate}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900 max-w-[200px] truncate">{apt.serviceName}</div>
                      <div className="text-[11px] text-indigo-600 font-bold">{formatCOP(apt.price)} • {apt.estimatedDurationMin} min</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">
                      {apt.technicianName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          statusStyles[apt.status]
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDrawer(apt)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalles</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer: Detalles de Cita (Matching Screenshot) */}
      {isDrawerOpen && activeApt && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={handleCloseDrawer}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="p-5 border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-gray-900">{activeApt.code}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {activeApt.status}
                    </span>
                  </div>
                  <button
                    onClick={handleCloseDrawer}
                    className="p-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-black text-gray-900 mt-2">{activeApt.serviceName}</h3>
                <p className="text-xs text-gray-600 mt-0.5">Programada para {activeApt.date} • {activeApt.branch}</p>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                
                {/* Customer card */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                    Cliente & Contacto
                  </span>
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        activeApt.customerAvatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                      }
                      alt={activeApt.customerName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-200"
                    />
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{activeApt.customerName}</h4>
                      <p className="text-gray-600">{activeApt.customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60">
                    <a
                      href={`tel:${activeApt.customerPhone}`}
                      className="flex-1 py-1.5 rounded-lg bg-white border border-gray-200 font-bold text-center text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-gray-600" />
                      <span>Llamar</span>
                    </a>
                    <button
                      onClick={() => navigateTo('customers', { customerId: activeApt.customerId })}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 flex items-center justify-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Ver Ficha</span>
                    </button>
                  </div>
                </div>

                {/* Motorcycle details */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2.5">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                    Vehículo en Taller
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">{activeApt.motorcycleModel}</span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-900 text-white font-mono font-bold text-xs">
                      {activeApt.motorcyclePlate}
                    </span>
                  </div>
                </div>

                {/* Technician assignment & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
                    <span className="text-[10px] font-semibold text-gray-600 uppercase">Mecánico Asignado</span>
                    <p className="font-bold text-gray-900 mt-1">{activeApt.technicianName}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
                    <span className="text-[10px] font-semibold text-gray-600 uppercase">Presupuesto Estimado</span>
                    <p className="font-black text-indigo-700 text-base mt-0.5">{formatCOP(activeApt.price)}</p>
                  </div>
                </div>

                {/* Customer Notes */}
                {activeApt.notes && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-bold block mb-1">Observaciones del Cliente:</span>
                    <p className="leading-relaxed">{activeApt.notes}</p>
                  </div>
                )}

                {/* Status Transition Control */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">Cambiar Estado de la Cita:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Confirmada', 'En Proceso', 'Completada', 'Cancelada'] as Appointment['status'][]).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => updateAppointmentStatus(activeApt.id, st)}
                          className={`py-2 px-3 rounded-xl font-bold transition-all ${
                            activeApt.status === st
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-5 border-t border-gray-200 bg-gray-50 space-y-2">
                <button
                  onClick={() => {
                    handleCloseDrawer();
                    navigateTo('actas', { appointmentId: activeApt.id });
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-extrabold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Crear Acta de Recepción / Entrega</span>
                </button>
                <button
                  onClick={() => {
                    handleCloseDrawer();
                    navigateTo('new-invoice');
                  }}
                  className="w-full py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold text-xs hover:bg-gray-100 transition-colors"
                >
                  Facturar este Servicio
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal: Agendar Nueva Cita */}
      {showNewAptModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Agendar Nueva Cita de Taller</h3>
              <button onClick={() => setShowNewAptModal(false)} className="text-gray-600 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateAptSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Seleccionar Cliente *</label>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.phone} ({c.motorcycles.map((m) => m.licensePlate).join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Servicio a Realizar *</label>
                <select
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatCOP(s.price)} - {s.durationMin} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Día</label>
                  <input
                    type="text"
                    defaultValue="Hoy"
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hora (HH:MM)</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Técnico Mecánico Asignado</label>
                <select
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Carlos Rodríguez">Carlos Rodríguez (Mecánico Jefe)</option>
                  <option value="Andrés Gómez">Andrés Gómez (Especialista Motores)</option>
                  <option value="Jhon Fredy Osorio">Jhon Fredy Osorio (Técnico Eléctrico)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Observaciones o Síntomas declarados</label>
                <textarea
                  rows={2}
                  placeholder="ej. Ruido al frenar, testigo motor encendido en tablero..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewAptModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
                >
                  Confirmar y Agendar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
