import React, { useMemo, useState } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Wrench,
  ChevronRight,
  CheckCircle2,
  Package,
  Plus,
  Eye,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Appointment } from '../../types';
import { formatCOP } from '../../utils/formatters';

export const DashboardView: React.FC = () => {
  const {
    appointments,
    invoices,
    attendance,
    employees,
    products,
    activityLogs,
    navigateTo,
    restockProduct,
    updateAppointmentStatus,
    setSelectedAppointment,
    currentUserRole,
  } = useApp();

  const [selectedPeriod, setSelectedPeriod] = useState<'semana' | 'mes' | 'año'>('semana');
  const [restockModalItem, setRestockModalItem] = useState<{ id: string; name: string } | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);

  // Computed metrics
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayApts = appointments.filter((appointment) => appointment.scheduledAt?.slice(0, 10) === todayKey);
  const todayRevenue = invoices.reduce((acc, inv) => acc + inv.total, 0);
  const activeEmployees = attendance.filter((a) => a.status === 'En Turno').length;
  const lowStockItems = products.filter((p) => p.currentStock <= p.minStock);

  const canCreateOperationalRecords = ['admin', 'empleado', 'vendedor'].includes(currentUserRole || '');
  const weeklyData = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return {
        day: day.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''),
        count: appointments.filter((appointment) => appointment.scheduledAt?.slice(0, 10) === key).length,
        isToday: key === todayKey,
      };
    });
  }, [appointments, todayKey]);

  const maxWeeklyCount = Math.max(1, ...weeklyData.map((d) => d.count));
  const weeklyAverage = weeklyData.reduce((total, day) => total + day.count, 0) / weeklyData.length;

  const handleQuickRestock = () => {
    if (restockModalItem) {
      restockProduct(restockModalItem.id, restockAmount);
      setRestockModalItem(null);
    }
  };

  return (
    <div id="dashboard-view" className="space-y-6">
      
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg shadow-indigo-950/10">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Taller Operativo en Tiempo Real
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Panel de Control & Taller</h1>
          <p className="text-indigo-200 text-xs sm:text-sm mt-1">
            Monitorea el flujo de elevadores, recambios críticos, citas y facturación diaria.
          </p>
        </div>
        {canCreateOperationalRecords && <div className="flex items-center gap-3">
          <button
            id="dash-new-apt-btn"
            onClick={() => navigateTo('appointments')}
            className="px-4 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-indigo-50 shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            Nueva Cita
          </button>
          <button
            id="dash-new-inv-btn"
            onClick={() => navigateTo('new-invoice')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600/80 border border-indigo-400/30 text-white font-bold text-xs hover:bg-indigo-600 transition-all flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Facturar TPV
          </button>
        </div>}
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Citas Hoy */}
        <div
          onClick={() => navigateTo('appointments')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Agendamientos Hoy</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{todayApts.length}</span>
            <span className="text-xs text-slate-500 font-medium">citas programadas</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+15% vs ayer</span>
          </div>
        </div>

        {/* Card 2: Ventas del día */}
        <div
          onClick={() => navigateTo('invoices')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ventas Facturadas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{formatCOP(todayRevenue)}</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8.4% vs semana ant.</span>
          </div>
        </div>

        {/* Card 3: Empleados activos */}
        <div
          onClick={() => navigateTo('attendance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mecánicos en Turno</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{activeEmployees}</span>
            <span className="text-xs text-slate-500 font-medium">de {employees.length} plantilla</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Turno activo</span>
          </div>
        </div>

        {/* Card 4: Stock bajo */}
        <div
          onClick={() => navigateTo('inventory')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stock Crítico</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{lowStockItems.length}</span>
            <span className="text-xs text-slate-500 font-medium">a reponer</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
            <span>Requiere pedido almacén</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Chart & Low Stock alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Agendamientos Semanales interactive chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Agendamientos & Ocupación Semanal</h2>
              <p className="text-xs text-slate-500">Distribución de citas y servicios atendidos en taller</p>
            </div>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
              <button
                onClick={() => setSelectedPeriod('semana')}
                className={`px-3 py-1 rounded-md transition-all text-xs ${
                  selectedPeriod === 'semana' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Esta Semana
              </button>
              <button
                onClick={() => setSelectedPeriod('mes')}
                className={`px-3 py-1 rounded-md transition-all text-xs ${
                  selectedPeriod === 'mes' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Mes
              </button>
            </div>
          </div>

          {/* Visual Chart Bars with Hover Tooltips */}
          <div className="mt-6 pt-2">
            <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 px-2">
              {weeklyData.map((item, idx) => {
                const heightPercent = Math.round((item.count / maxWeeklyCount) * 100);
                const isToday = item.isToday;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                      {item.count} citas
                    </div>

                    <div className="w-full bg-slate-100 rounded-t-lg h-full flex items-end p-1">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-md transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white ${
                          isToday
                            ? 'bg-indigo-600 shadow-md shadow-indigo-200'
                            : 'bg-indigo-400 hover:bg-indigo-500'
                        }`}
                      >
                        {item.count}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        isToday ? 'text-indigo-600 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" />
                <span>Día en curso</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-300" />
                <span>Otros días</span>
              </div>
            </div>
            <span className="font-semibold text-slate-700">Media: {weeklyAverage.toFixed(1)} citas/día</span>
          </div>
        </div>

        {/* Right 1 Col: Stock Bajo Panel */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-rose-50 text-rose-600">
                  <Package className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Alerta de Stock Bajo</h2>
              </div>
              <button
                onClick={() => navigateTo('inventory')}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Ver todo
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {lowStockItems.slice(0, 4).map((prod) => {
                const stockPercent = Math.round((prod.currentStock / prod.maxStock) * 100);
                return (
                  <div key={prod.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{prod.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {prod.brand} • SKU: {prod.sku}
                        </p>
                      </div>
                      <button
                        onClick={() => setRestockModalItem({ id: prod.id, name: prod.name })}
                        className="px-2 py-1 rounded bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition-colors shrink-0"
                      >
                        Reponer
                      </button>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                        <span className="text-rose-600 font-bold">
                          {prod.currentStock} uds (Mín: {prod.minStock})
                        </span>
                        <span className="text-slate-400">Cap: {prod.maxStock}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          style={{ width: `${stockPercent}%` }}
                          className="bg-rose-500 h-1.5 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigateTo('inventory')}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Gestionar Almacén & Proveedores</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Row: Próximos Agendamientos & Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Próximos Agendamientos Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Próximos Agendamientos</h2>
              <p className="text-xs text-slate-500">Citas programadas para atención en elevadores</p>
            </div>
            <button
              onClick={() => navigateTo('appointments')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <span>Ver agenda completa</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Motocicleta</th>
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3">Técnico</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {appointments.slice(0, 5).map((apt) => {
                  const statusBadges = {
                    Confirmada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'En Proceso': 'bg-blue-50 text-blue-700 border-blue-200',
                    Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
                    Completada: 'bg-slate-100 text-slate-700 border-slate-200',
                    Cancelada: 'bg-rose-50 text-rose-700 border-rose-200',
                  };

                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{apt.time}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{apt.customerName}</div>
                        <div className="text-[10px] text-slate-500">{apt.customerPhone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{apt.motorcycleModel}</div>
                        <div className="text-[10px] font-mono text-slate-500">{apt.motorcyclePlate}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-[140px] truncate">{apt.serviceName}</td>
                      <td className="py-3 px-3 text-slate-600">{apt.technicianName}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            statusBadges[apt.status]
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedAppointment(apt);
                              navigateTo('appointments', { appointmentId: apt.id });
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {apt.status === 'Confirmada' && (
                            <button
                              onClick={() => updateAppointmentStatus(apt.id, 'En Proceso')}
                              className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] hover:bg-indigo-100 transition-colors"
                            >
                              Iniciar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Actividad Reciente */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Actividad Reciente</h2>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Eventos</span>
          </div>

          <div className="mt-3.5 space-y-3.5">
            {activityLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{log.title}</span>
                    <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{log.description}</p>
                </div>
              </div>
            ))}
            {activityLogs.length === 0 && <p className="py-6 text-center text-xs text-slate-500">Sin actividad reciente registrada.</p>}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigateTo('actas')}
              className="w-full py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Ver Actas e Inspecciones Técnicas</span>
            </button>
          </div>
        </div>

      </div>

      {/* Quick Restock Modal */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Reponer Stock de Recambio</h3>
              <button
                onClick={() => setRestockModalItem(null)}
                className="text-gray-600 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-600">Artículo:</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{restockModalItem.name}</p>

              <label className="block text-xs font-bold text-gray-700 mt-4 mb-1">
                Cantidad de unidades a ingresar al almacén:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(parseInt(e.target.value) || 1)}
                  className="w-32 px-3 py-2 rounded-xl border border-gray-300 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="text-xs text-gray-600 font-medium">unidades recibidas</span>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setRestockModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleQuickRestock}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
              >
                Confirmar Entrada a Stock
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
