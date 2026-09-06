import React, { useEffect, useMemo, useState } from 'react';
import {
  Bike,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileCheck2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  Search,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { Appointment, Motorcycle } from '../../types';
import { formatCOP } from '../../utils/formatters';
import { searchCustomers } from '../../services/customers';

type RangeMode = 'day' | 'week' | 'month';

const statusStyles: Record<Appointment['status'], { badge: string; dot: string }> = {
  Pendiente: { badge: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  Confirmada: { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  'En Proceso': { badge: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  Completada: { badge: 'border-slate-200 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  Cancelada: { badge: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
};

const pad = (value: number) => String(value).padStart(2, '0');
const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const appointmentDate = (appointment: Appointment) => {
  if (appointment.scheduledAt) {
    const parsed = new Date(appointment.scheduledAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  // Compatibilidad con los datos demo anteriores a fecha_hora.
  const fallback = new Date();
  if (appointment.date.toLowerCase().includes('mañana')) fallback.setDate(fallback.getDate() + 1);
  const [hours, minutes] = appointment.time.split(':').map(Number);
  fallback.setHours(hours || 0, minutes || 0, 0, 0);
  return fallback;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
};

const longDate = (date: Date) => new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(date);

export const AppointmentsView: React.FC = () => {
  const {
    appointments,
    selectedAppointment,
    setSelectedAppointment,
    updateAppointmentStatus,
    updateAppointmentDetails,
    createAppointment,
    loadAppointmentsRange,
    customers,
    services,
    employees,
    showToast,
    navigateTo,
    selectedBranch,
    branchOptions,
    currentUserRole,
  } = useApp();

  const initialDate = selectedAppointment ? appointmentDate(selectedAppointment) : new Date();
  const [rangeMode, setRangeMode] = useState<RangeMode>('day');
  const [selectedDate, setSelectedDate] = useState(toDateKey(initialDate));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todas');
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editTechId, setEditTechId] = useState('');

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState(customers.slice(0, 15));
  const [newCustomerId, setNewCustomerId] = useState('');
  const [sellerMotorcycles, setSellerMotorcycles] = useState<Motorcycle[]>([]);
  const [newMotorcycleId, setNewMotorcycleId] = useState('');
  const [newServiceId, setNewServiceId] = useState(services[0]?.id || '');
  const [newDate, setNewDate] = useState(toDateKey(new Date()));
  const [newTime, setNewTime] = useState('11:00');
  const [newTechId, setNewTechId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const workshopBranches = useMemo(() => branchOptions.filter((branch) => branch.type === 'Sede'), [branchOptions]);
  const [newBranch, setNewBranch] = useState('');

  const activeLocation = branchOptions.find((branch) => branch.name === selectedBranch);
  const canCreateAppointment = ['admin', 'empleado', 'vendedor'].includes(currentUserRole || '')
    && (selectedBranch === 'Todas las sedes' || activeLocation?.type === 'Sede');
  const canEditSchedule = ['admin', 'empleado', 'vendedor'].includes(currentUserRole || '');
  const canChangeStatus = ['admin', 'empleado', 'vendedor', 'mecanico'].includes(currentUserRole || '');
  const canSeeVehicle = currentUserRole !== 'vendedor';

  const selectedCustomerForAppointment = customerResults.find((customer) => customer.id === newCustomerId)
    || customers.find((customer) => customer.id === newCustomerId);
  const availableMotorcycles = useMemo(() => currentUserRole === 'vendedor'
    ? sellerMotorcycles
    : selectedCustomerForAppointment?.motorcycles.filter((motorcycle) => motorcycle.isActive !== false) || [],
  [currentUserRole, selectedCustomerForAppointment, sellerMotorcycles]);
  const technicians = useMemo(() => employees.filter((employee) =>
    employee.isActive
    && employee.branch === newBranch
    && /técnic|tecnic|mecánic|mecanic|electric|especialista/i.test(`${employee.role} ${employee.name}`)
  ), [employees, newBranch]);

  useEffect(() => {
    const selectedWorkshop = workshopBranches.find((branch) => branch.name === selectedBranch);
    setNewBranch((current) => workshopBranches.some((branch) => branch.name === current)
      ? current
      : selectedWorkshop?.name || workshopBranches[0]?.name || '');
  }, [selectedBranch, workshopBranches]);

  useEffect(() => {
    if (!technicians.some((technician) => technician.id === newTechId)) setNewTechId('');
  }, [technicians, newTechId]);

  useEffect(() => {
    if (!showNewAptModal) return;
    const timer = window.setTimeout(() => {
      void searchCustomers(customerQuery).then(setCustomerResults).catch((error) => {
        console.error('No fue posible buscar clientes', error);
        showToast('No fue posible buscar clientes.', 'error');
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [customerQuery, showNewAptModal, showToast]);

  useEffect(() => {
    let active = true;
    if (currentUserRole !== 'vendedor' || !newCustomerId || !supabase) {
      setSellerMotorcycles([]);
      return () => { active = false; };
    }

    void supabase.rpc('motos_cliente_para_agendamiento', {
      p_cliente_id: newCustomerId,
    }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('No fue posible cargar las placas autorizadas', error);
        setSellerMotorcycles([]);
        showToast('No fue posible consultar los vehículos autorizados para esta sede.', 'error');
        return;
      }
      setSellerMotorcycles((data || []).map((vehicle) => ({
        id: vehicle.id,
        brand: '',
        model: '',
        year: 0,
        licensePlate: vehicle.placa || 'Sin placa',
        vin: '',
        mileage: 0,
        color: '',
        cylinderCapacity: '',
        isActive: true,
      })));
    });

    return () => { active = false; };
  }, [currentUserRole, newCustomerId, showToast]);

  useEffect(() => {
    setNewMotorcycleId(availableMotorcycles.length === 1 ? availableMotorcycles[0].id : '');
  }, [availableMotorcycles, newCustomerId]);

  const referenceDate = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate]);

  useEffect(() => {
    const from = new Date(referenceDate);
    const to = new Date(referenceDate);
    if (rangeMode === 'day') {
      to.setDate(to.getDate() + 1);
    } else if (rangeMode === 'week') {
      const weekStart = startOfWeek(referenceDate);
      from.setTime(weekStart.getTime());
      to.setTime(weekStart.getTime());
      to.setDate(to.getDate() + 7);
    } else {
      from.setDate(1);
      to.setDate(1);
      to.setMonth(to.getMonth() + 1);
    }
    void loadAppointmentsRange(from.toISOString(), to.toISOString());
  }, [loadAppointmentsRange, rangeMode, referenceDate]);

  const activeApt = selectedAppointment
    ? appointments.find((appointment) => appointment.id === selectedAppointment.id) || selectedAppointment
    : null;

  const visibleAppointments = useMemo(() => {
    const weekStart = startOfWeek(referenceDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase('es');

    return appointments
      .filter((appointment) => {
        const date = appointmentDate(appointment);
        const inRange = rangeMode === 'day'
          ? toDateKey(date) === selectedDate
          : rangeMode === 'week'
            ? date >= weekStart && date < weekEnd
            : date.getFullYear() === referenceDate.getFullYear() && date.getMonth() === referenceDate.getMonth();
        const searchable = [
          appointment.code,
          appointment.customerName,
          appointment.serviceName,
          currentUserRole === 'vendedor' ? '' : appointment.motorcyclePlate,
        ].join(' ').toLocaleLowerCase('es');
        const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
        const matchesStatus = statusFilter === 'Todas' || appointment.status === statusFilter;
        return inRange && matchesSearch && matchesStatus;
      })
      .sort((left, right) => appointmentDate(left).getTime() - appointmentDate(right).getTime());
  }, [appointments, currentUserRole, rangeMode, referenceDate, searchQuery, selectedDate, statusFilter]);

  useEffect(() => {
    if (selectedAppointment && !visibleAppointments.some((appointment) => appointment.id === selectedAppointment.id)) {
      setSelectedAppointment(null);
      setEditingSchedule(false);
    }
  }, [selectedAppointment?.id, visibleAppointments, setSelectedAppointment]);

  useEffect(() => {
    if (!activeApt) {
      setEditingSchedule(false);
      return;
    }
    const date = appointmentDate(activeApt);
    setEditDate(toDateKey(date));
    setEditTime(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
    setEditTechId(activeApt.technicianId || '');
  }, [activeApt?.id]);

  const groupedAppointments = useMemo(() => visibleAppointments.reduce<Record<string, Appointment[]>>((groups, appointment) => {
    const key = toDateKey(appointmentDate(appointment));
    groups[key] = [...(groups[key] || []), appointment];
    return groups;
  }, {}), [visibleAppointments]);

  const monthDays = useMemo(() => {
    const first = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const last = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    const leading = (first.getDay() + 6) % 7;
    const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= last.getDate(); day += 1) cells.push(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [referenceDate]);

  const activeCustomer = activeApt ? customers.find((customer) => customer.id === activeApt.customerId) : undefined;
  const activeMotorcycle = activeCustomer?.motorcycles.find((motorcycle) => motorcycle.id === activeApt?.motorcycleId);
  const customerHistory = activeApt
    ? appointments
      .filter((appointment) => appointment.customerId === activeApt.customerId && appointment.id !== activeApt.id)
      .sort((left, right) => appointmentDate(right).getTime() - appointmentDate(left).getTime())
      .slice(0, 3)
    : [];
  const appointmentTechnicians = activeApt ? employees.filter((employee) =>
    employee.isActive
    && (employee.branchId === activeApt.branchId || employee.branch === activeApt.branch)
    && /técnic|tecnic|mecánic|mecanic|electric|especialista/i.test(`${employee.role} ${employee.name}`)
  ) : [];

  const periodLabel = rangeMode === 'day'
    ? longDate(referenceDate)
    : rangeMode === 'week'
      ? `Semana del ${new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(startOfWeek(referenceDate))}`
      : new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(referenceDate);

  const movePeriod = (direction: -1 | 1) => {
    const next = new Date(referenceDate);
    if (rangeMode === 'day') next.setDate(next.getDate() + direction);
    if (rangeMode === 'week') next.setDate(next.getDate() + (7 * direction));
    if (rangeMode === 'month') next.setMonth(next.getMonth() + direction);
    setSelectedDate(toDateKey(next));
  };

  const handleCreateAptSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const customer = selectedCustomerForAppointment;
    const service = services.find((item) => item.id === newServiceId) || services[0];
    const motorcycle = availableMotorcycles.find((item) => item.id === newMotorcycleId);
    const technician = technicians.find((employee) => employee.id === newTechId);
    if (!customer || !service || !motorcycle || !technician) {
      showToast('Selecciona cliente, vehículo, servicio y técnico.', 'error');
      return;
    }

    const created = await createAppointment({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerDocument: customer.cedula,
      customerAvatar: customer.avatar,
      motorcycleId: motorcycle.id,
      motorcyclePlate: motorcycle.licensePlate,
      motorcycleModel: `${motorcycle.brand || 'Moto'} ${motorcycle.model}`,
      motorcycleBrand: motorcycle.brand,
      motorcycleYear: motorcycle.year,
      serviceId: service.id,
      serviceName: service.name,
      technicianId: technician.id,
      technicianName: `${technician.name} ${technician.lastName}`.trim(),
      branchId: workshopBranches.find((branch) => branch.name === newBranch)?.id,
      branch: newBranch,
      date: newDate,
      time: newTime,
      scheduledAt: new Date(`${newDate}T${newTime}:00`).toISOString(),
      estimatedDurationMin: service.durationMin,
      price: service.price,
      notes: newNotes,
    });

    if (created) {
      setShowNewAptModal(false);
      setNewNotes('');
      setCustomerQuery('');
      setNewCustomerId('');
      setNewMotorcycleId('');
      setRangeMode('day');
      setSelectedDate(newDate);
    }
  };

  const saveSchedule = async () => {
    if (!activeApt || !editDate || !editTime || !editTechId) {
      showToast('Fecha, hora y técnico son obligatorios.', 'error');
      return;
    }
    const technician = appointmentTechnicians.find((employee) => employee.id === editTechId);
    if (!technician) {
      showToast('Selecciona un técnico activo de la sede.', 'error');
      return;
    }
    const saved = await updateAppointmentDetails(activeApt.id, {
      scheduledAt: new Date(`${editDate}T${editTime}:00`).toISOString(),
      technicianId: technician.id,
      technicianName: `${technician.name} ${technician.lastName}`.trim(),
    });
    if (saved) {
      setEditingSchedule(false);
      setSelectedDate(editDate);
    }
  };

  const appointmentCard = (appointment: Appointment) => {
    const style = statusStyles[appointment.status];
    const date = appointmentDate(appointment);
    const isSelected = activeApt?.id === appointment.id;
    return (
      <button
        key={appointment.id}
        type="button"
        onClick={() => setSelectedAppointment(appointment)}
        className={`w-full rounded-xl border p-3 text-left transition-all ${isSelected
          ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-100'
          : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-14 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
            <span className="block text-sm font-black text-slate-900">{date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="mt-0.5 block text-[9px] font-bold uppercase text-slate-400">{appointment.estimatedDurationMin} min</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-xs font-extrabold text-slate-900">{appointment.customerName}</p>
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${style.dot}`} title={appointment.status} />
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600">{appointment.serviceName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${style.badge}`}>{appointment.status}</span>
              {selectedBranch === 'Todas las sedes' && <span className="max-w-full truncate rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-700">{appointment.branch}</span>}
            </div>
          </div>
        </div>
      </button>
    );
  };

  if (currentUserRole === 'cliente') {
    return (
      <div id="appointments-view" className="space-y-5">
        <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Mis citas</h1><p className="text-sm text-slate-600">Consulta el estado de tus servicios agendados.</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          {appointments.map((appointment) => <div key={appointment.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{appointment.serviceName}</p><p className="mt-1 text-xs text-slate-500">{longDate(appointmentDate(appointment))} · {appointment.time}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusStyles[appointment.status].badge}`}>{appointment.status}</span></div><p className="mt-3 text-xs text-slate-600">{appointment.branch}</p></div>)}
          {appointments.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No tienes citas registradas.</p>}
        </div>
      </div>
    );
  }

  return (
    <div id="appointments-view" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Agendamiento de citas</h1><p className="text-xs text-slate-600 sm:text-sm">{currentUserRole === 'mecanico' ? 'Tus servicios asignados y su información operativa.' : 'Agenda y detalle operativo en una sola pantalla.'}</p></div>
        {canCreateAppointment && <button type="button" onClick={() => setShowNewAptModal(true)} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 transition-colors hover:bg-indigo-700"><Plus className="h-4 w-4" />Agendar nueva cita</button>}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-3">
        <div className="grid min-w-0 grid-cols-[92px_minmax(0,1fr)] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
          <select value={rangeMode} onChange={(event) => setRangeMode(event.target.value as RangeMode)} className="min-w-0 border-0 border-r border-slate-200 bg-transparent px-2 py-2.5 text-xs font-bold text-slate-700 outline-none" aria-label="Periodo de fecha">
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
          </select>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-w-0 border-0 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none" aria-label="Fecha de la agenda" />
        </div>
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar cliente, servicio o código" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" aria-label="Filtrar por estado">
          {['Todas', 'Pendiente', 'Confirmada', 'En Proceso', 'Completada', 'Cancelada'].map((status) => <option key={status}>{status}</option>)}
        </select>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(320px,0.38fr)_minmax(0,0.62fr)] lg:items-start">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Horarios agendados">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-extrabold text-slate-900">Horarios</h2></div><p className="mt-1 capitalize text-[11px] text-slate-500">{periodLabel}</p></div>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"><button type="button" onClick={() => movePeriod(-1)} className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Periodo anterior"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => movePeriod(1)} className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Periodo siguiente"><ChevronRight className="h-4 w-4" /></button></div>
            </div>
          </div>

          {rangeMode === 'month' ? <div className="p-4"><div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-slate-400">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => <span key={day} className="py-1">{day}</span>)}</div><div className="mt-1 grid grid-cols-7 gap-1">{monthDays.map((date, index) => { if (!date) return <span key={`empty-${index}`} className="aspect-square" />; const key = toDateKey(date); const count = groupedAppointments[key]?.length || 0; const isToday = key === toDateKey(new Date()); return <button key={key} type="button" onClick={() => { setSelectedDate(key); setRangeMode('day'); }} className={`aspect-square min-w-0 rounded-lg border p-1 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50 ${isToday ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}><span className={`block text-[11px] font-bold ${isToday ? 'text-indigo-700' : 'text-slate-700'}`}>{date.getDate()}</span>{count > 0 && <span className="mt-0.5 block truncate text-[8px] font-bold text-indigo-600">{count} cita{count === 1 ? '' : 's'}</span>}</button>; })}</div>{visibleAppointments.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">No hay citas en este mes.</p>}</div> : <div className="max-h-[660px] space-y-4 overflow-y-auto p-3 sm:p-4">{(Object.entries(groupedAppointments) as Array<[string, Appointment[]]>).map(([dateKey, items]) => <div key={dateKey}>{rangeMode === 'week' && <p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{longDate(new Date(`${dateKey}T00:00:00`))}</p>}<div className="space-y-2">{items.map(appointmentCard)}</div></div>)}{visibleAppointments.length === 0 && <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><div><CalendarClock className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-xs font-bold text-slate-600">No hay citas en este periodo</p><p className="mt-1 text-[11px] text-slate-400">Prueba otra fecha o cambia los filtros.</p></div></div>}</div>}
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Detalle de la cita">
          {!activeApt ? <div className="grid min-h-[520px] place-items-center p-8 text-center"><div className="max-w-xs"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50"><ClipboardList className="h-7 w-7 text-indigo-400" /></div><h2 className="mt-4 text-base font-extrabold text-slate-800">Selecciona una cita para ver el detalle</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">La información del cliente, servicio y operación aparecerá aquí sin abandonar la agenda.</p></div></div> : <>
            <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-slate-600">{activeApt.code}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[activeApt.status].badge}`}>{activeApt.status}</span></div><h2 className="mt-2 text-lg font-black text-slate-900 sm:text-xl">{activeApt.serviceName}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 text-indigo-500" />{activeApt.branch || 'Sin sede'}</p></div><div className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-right shadow-sm"><p className="text-[10px] font-bold uppercase text-slate-400">Fecha y hora</p><p className="mt-0.5 text-xs font-extrabold capitalize text-slate-800">{new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(appointmentDate(activeApt))} · {activeApt.time}</p></div></div></div>
            <div className="space-y-5 p-4 text-xs sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center gap-2"><User className="h-4 w-4 text-indigo-600" /><h3 className="font-extrabold text-slate-900">Cliente</h3></div><p className="text-sm font-bold text-slate-900">{activeApt.customerName}</p><div className="mt-2 space-y-1.5 text-[11px] text-slate-600"><p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" />{activeApt.customerPhone || activeCustomer?.phone || 'Sin teléfono'}</p><p className="flex items-center gap-2 break-all"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />{activeApt.customerEmail || activeCustomer?.email || 'Sin correo'}</p><p className="flex items-center gap-2"><ClipboardList className="h-3.5 w-3.5 text-slate-400" />Documento: {activeApt.customerDocument || activeCustomer?.cedula || '—'}</p></div><button type="button" onClick={() => navigateTo('customers', { customerId: activeApt.customerId })} className="mt-3 text-[11px] font-bold text-indigo-600 hover:underline">Abrir ficha del cliente</button></div>
                {canSeeVehicle ? <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center gap-2"><Bike className="h-4 w-4 text-indigo-600" /><h3 className="font-extrabold text-slate-900">Motocicleta</h3></div><p className="text-sm font-bold text-slate-900">{activeApt.motorcycleModel || 'Sin información'}</p><div className="mt-2 grid grid-cols-2 gap-2 text-[11px]"><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-400">Marca</span><strong className="text-slate-700">{activeApt.motorcycleBrand || activeMotorcycle?.brand || '—'}</strong></div><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-400">Modelo</span><strong className="text-slate-700">{activeMotorcycle?.model || activeApt.motorcycleModel || '—'}</strong></div><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-400">Año</span><strong className="text-slate-700">{activeApt.motorcycleYear || activeMotorcycle?.year || '—'}</strong></div><div className="rounded-lg bg-slate-50 p-2"><span className="block text-slate-400">Placa</span><strong className="font-mono text-slate-700">{activeApt.motorcyclePlate || activeMotorcycle?.licensePlate || '—'}</strong></div></div></div> : <div className="grid place-items-center rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-500"><div><Bike className="mx-auto h-5 w-5 text-slate-300" /><p className="mt-2 font-semibold">La información del vehículo está restringida para el rol vendedor.</p></div></div>}
              </div>
              <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-[9px] font-bold uppercase text-slate-400">Duración</span><p className="mt-1 flex items-center gap-1.5 font-bold text-slate-800"><Clock className="h-3.5 w-3.5" />{activeApt.estimatedDurationMin} min</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-[9px] font-bold uppercase text-slate-400">Precio</span><p className="mt-1 font-black text-indigo-700">{formatCOP(activeApt.price)}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-[9px] font-bold uppercase text-slate-400">Técnico</span><p className="mt-1 flex items-center gap-1.5 font-bold text-slate-800"><Wrench className="h-3.5 w-3.5" />{activeApt.technicianName || 'Sin asignar'}</p></div></div>
              {activeApt.notes && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900"><p className="font-bold">Notas del agendamiento</p><p className="mt-1 leading-relaxed">{activeApt.notes}</p></div>}
              {canChangeStatus && <div><h3 className="mb-2 font-extrabold text-slate-800">Cambiar estado</h3><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{(['Pendiente', 'Confirmada', 'En Proceso', 'Completada', 'Cancelada'] as Appointment['status'][]).map((status) => <button key={status} type="button" onClick={() => void updateAppointmentStatus(activeApt.id, status)} className={`rounded-xl border px-2 py-2 text-[10px] font-bold transition-colors ${activeApt.status === status ? 'border-indigo-600 bg-indigo-600 text-white' : `${statusStyles[status].badge} hover:brightness-95`}`}>{status}</button>)}</div></div>}
              {canEditSchedule && <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">Programación operativa</h3><p className="mt-0.5 text-[10px] text-slate-500">Reagenda o reasigna dentro de la misma sede.</p></div><button type="button" onClick={() => setEditingSchedule((current) => !current)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100">{editingSchedule ? 'Cerrar' : 'Modificar'}</button></div>{editingSchedule && <div className="mt-3 grid gap-2 sm:grid-cols-2"><input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" aria-label="Nueva fecha" /><input type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" aria-label="Nueva hora" /><select value={editTechId} onChange={(event) => setEditTechId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:col-span-2" aria-label="Nuevo técnico"><option value="">Seleccionar técnico</option>{appointmentTechnicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name} {technician.lastName}</option>)}</select><button type="button" onClick={() => void saveSchedule()} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white sm:col-span-2">Guardar programación</button></div>}</div>}
              {customerHistory.length > 0 && <div><h3 className="mb-2 font-extrabold text-slate-800">Historial reciente del cliente</h3><div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{customerHistory.map((appointment) => <div key={appointment.id} className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate font-bold text-slate-800">{appointment.serviceName}</p><p className="mt-0.5 text-[10px] text-slate-500">{new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(appointmentDate(appointment))}</p></div><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusStyles[appointment.status].badge}`}>{appointment.status}</span></div>)}</div></div>}
            </div>
            <div className="grid gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 sm:p-5">{currentUserRole !== 'vendedor' && <button type="button" onClick={() => navigateTo('actas', { appointmentId: activeApt.id })} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"><FileCheck2 className="h-4 w-4" />Crear acta</button>}{canEditSchedule && <button type="button" disabled={activeApt.status !== 'Completada'} onClick={() => navigateTo('new-invoice', { appointmentId: activeApt.id })} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"><Receipt className="h-4 w-4" />{activeApt.status === 'Completada' ? 'Generar factura' : 'Factura al completar'}</button>}</div>
          </>}
        </section>
      </div>

      {showNewAptModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h3 className="text-base font-bold text-slate-900">Agendar nueva cita de taller</h3><button type="button" onClick={() => setShowNewAptModal(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X className="h-4 w-4" /></button></div><form onSubmit={handleCreateAptSubmit} className="mt-4 space-y-3 text-xs">
        <div><label className="mb-1 block font-bold text-slate-700">Sede del taller *</label><select value={newBranch} onChange={(event) => setNewBranch(event.target.value)} required disabled={currentUserRole !== 'admin' || selectedBranch !== 'Todas las sedes'} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold disabled:bg-slate-100"><option value="" disabled>Seleccionar sede</option>{workshopBranches.map((branch) => <option key={branch.id} value={branch.name}>{branch.name}</option>)}</select>{workshopBranches.length === 0 && <p className="mt-1 text-rose-600">No hay sedes de taller activas disponibles.</p>}</div>
        <div><label className="mb-1 block font-bold text-slate-700">Buscar cliente *</label><input type="search" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Cédula, teléfono, nombre, apellido o correo" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" /><div className="mt-2 max-h-36 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">{customerResults.map((customer) => <button key={customer.id} type="button" onClick={() => setNewCustomerId(customer.id)} className={`w-full p-2.5 text-left ${newCustomerId === customer.id ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50'}`}><span className="block font-bold">{customer.name}</span><span className="text-[10px] text-slate-500">Documento: {customer.cedula || '—'} · Tel: {customer.phone || '—'}</span></button>)}{customerResults.length === 0 && <p className="p-3 text-center text-slate-500">No se encontraron clientes.</p>}</div></div>
        {selectedCustomerForAppointment && <div><label className="mb-1 block font-bold text-slate-700">Vehículo del cliente *</label>{availableMotorcycles.length ? <select value={newMotorcycleId} onChange={(event) => setNewMotorcycleId(event.target.value)} required className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar vehículo</option>{availableMotorcycles.map((motorcycle) => <option key={motorcycle.id} value={motorcycle.id}>{currentUserRole === 'vendedor' ? motorcycle.licensePlate : `${motorcycle.brand} ${motorcycle.model} — ${motorcycle.licensePlate}`}</option>)}</select> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">Este cliente no tiene vehículos registrados. {currentUserRole !== 'vendedor' && <button type="button" onClick={() => navigateTo('customers', { customerId: selectedCustomerForAppointment.id })} className="font-bold underline">+ Registrar vehículo</button>}</div>}</div>}
        <div><label className="mb-1 block font-bold text-slate-700">Servicio a realizar *</label><select value={newServiceId} onChange={(event) => setNewServiceId(event.target.value)} required className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold">{services.map((service) => <option key={service.id} value={service.id}>{service.name} ({formatCOP(service.price)} · {service.durationMin} min)</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block font-bold text-slate-700">Día *</label><input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} required className="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold" /></div><div><label className="mb-1 block font-bold text-slate-700">Hora *</label><input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} required className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold" /></div></div>
        <div><label className="mb-1 block font-bold text-slate-700">Técnico asignado *</label><select value={newTechId} onChange={(event) => setNewTechId(event.target.value)} required className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar técnico activo</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name} {technician.lastName} ({technician.role})</option>)}</select>{newBranch && technicians.length === 0 && <p className="mt-1 text-amber-700">No hay técnicos activos en esta sede.</p>}</div>
        <div><label className="mb-1 block font-bold text-slate-700">Observaciones</label><textarea rows={3} value={newNotes} onChange={(event) => setNewNotes(event.target.value)} placeholder="Síntomas, instrucciones o comentarios del cliente" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setShowNewAptModal(false)} className="rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-100">Cancelar</button><button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700">Confirmar y agendar</button></div>
      </form></div></div>}
    </div>
  );
};
