import React, { useState } from 'react';
import {
  Wrench,
  Building2,
  Bell,
  Plus,
  Search,
  Calendar,
  FileText,
  Clock,
  Package,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Menu,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    currentView,
    selectedBranch,
    setSelectedBranch,
    branches,
    navigateTo,
    activityLogs,
    products,
    appointments,
    recordAttendance,
  } = useApp();

  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBranchSelect, setShowBranchSelect] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;
  const todayAppointments = appointments.filter((a) => a.date.includes('Hoy')).length;
  const totalNotifications = lowStockCount + (todayAppointments > 0 ? 1 : 0);

  const viewTitles: Record<string, string> = {
    dashboard: 'Panel General',
    inventory: 'Inventario & Recambios',
    attendance: 'Control de Asistencia',
    customers: 'Clientes & Flota',
    appointments: 'Agendamiento de Citas',
    services: 'Catálogo de Servicios',
    invoices: 'Historial de Facturación',
    'new-invoice': 'Nueva Factura / TPV',
    warranties: 'Módulo de Garantías',
    actas: 'Actas de Inspección',
    analytics: 'Reportes y Analítica',
    settings: 'Configuración de Sede',
  };

  return (
    <header id="main-header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-30">
      
      {/* Left: Mobile menu trigger & View title/badge */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-hidden"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            {viewTitles[currentView] || 'Panel de Taller'}
          </h1>
          <span className="hidden sm:inline-flex bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
            {selectedBranch.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Center/Right controls */}
      <div className="flex items-center gap-3">
        
        {/* Search bar */}
        <div className="hidden md:flex relative items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-60 lg:w-72 focus-within:border-indigo-500 focus-within:bg-white transition-all">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar placa, cliente, SKU..."
            className="bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden w-full font-medium"
          />
          <kbd className="hidden lg:inline-block bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 border border-slate-300">
            ⌘K
          </kbd>
        </div>

        {/* Branch Selector Pill */}
        <div className="relative">
          <button
            id="branch-selector-btn"
            onClick={() => {
              setShowBranchSelect(!showBranchSelect);
              setShowQuickMenu(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline max-w-[120px] truncate">{selectedBranch}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showBranchSelect && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sede Activa del Taller
              </div>
              {branches.map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setSelectedBranch(b);
                    setShowBranchSelect(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                    selectedBranch === b ? 'text-indigo-600 font-bold bg-indigo-50/60' : 'text-slate-700'
                  }`}
                >
                  <span>{b}</span>
                  {selectedBranch === b && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Action Button */}
        <div className="relative">
          <button
            id="header-quick-action-btn"
            onClick={() => {
              setShowQuickMenu(!showQuickMenu);
              setShowNotifications(false);
              setShowBranchSelect(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Acción</span>
          </button>

          {showQuickMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Acceso Rápido
              </div>
              <button
                onClick={() => {
                  navigateTo('appointments');
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-left transition-colors"
              >
                <div className="p-1 rounded bg-indigo-50 text-indigo-600">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span>Agendar Cita</span>
              </button>
              <button
                onClick={() => {
                  navigateTo('new-invoice');
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-left transition-colors"
              >
                <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span>Crear Factura TPV</span>
              </button>
              <button
                onClick={() => {
                  recordAttendance('checkIn');
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-left transition-colors"
              >
                <div className="p-1 rounded bg-blue-50 text-blue-600">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span>Fichar Turno Entrada</span>
              </button>
              <button
                onClick={() => {
                  navigateTo('inventory');
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-left transition-colors"
              >
                <div className="p-1 rounded bg-amber-50 text-amber-600">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <span>Añadir Producto / Stock</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Button & Popover */}
        <div className="relative">
          <button
            id="header-notifications-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowQuickMenu(false);
              setShowBranchSelect(false);
            }}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Notificaciones"
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Notificaciones del Taller</span>
                <span className="text-[10px] text-indigo-600 font-bold cursor-pointer hover:underline">
                  Marcar leídas
                </span>
              </div>

              <div className="space-y-2 mt-2 max-h-72 overflow-y-auto">
                {lowStockCount > 0 && (
                  <div
                    onClick={() => {
                      navigateTo('inventory');
                      setShowNotifications(false);
                    }}
                    className="p-2.5 rounded-lg bg-rose-50/80 border border-rose-100 flex items-start gap-2.5 cursor-pointer hover:bg-rose-100/70 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-900">
                        {lowStockCount} recambios con stock crítico
                      </p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Requiere reposición inmediata en almacén.
                      </p>
                    </div>
                  </div>
                )}

                <div
                  onClick={() => {
                    navigateTo('appointments');
                    setShowNotifications(false);
                  }}
                  className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-100 flex items-start gap-2.5 cursor-pointer hover:bg-amber-100/70 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      {todayAppointments} citas programadas hoy
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Próxima entrada en elevador #02 a las 09:30.
                    </p>
                  </div>
                </div>

                {activityLogs.slice(0, 2).map((log) => (
                  <div key={log.id} className="p-2 rounded-lg hover:bg-slate-50 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-800">{log.title}</span>
                      <span className="text-[10px]">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{log.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill / Avatar */}
        <div
          id="header-user-profile"
          onClick={() => navigateTo('settings')}
          className="flex items-center gap-2 pl-2 cursor-pointer hover:opacity-80 transition-opacity border-l border-slate-200"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shadow-xs">
            CM
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">Carlos Mendoza</p>
            <p className="text-[10px] font-medium text-slate-500">Jefe de Taller</p>
          </div>
        </div>

      </div>
    </header>
  );
};

