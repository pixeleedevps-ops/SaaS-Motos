import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Clock,
  Users,
  Wrench,
  CalendarDays,
  FileCheck2,
  Receipt,
  PlusCircle,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  X,
  Bike,
  ArrowRightLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ViewMode } from '../../types';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentView, navigateTo, appointments, products, warranties } = useApp();

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;
  const pendingAptsCount = appointments.filter((a) => a.status === 'Pendiente' || a.status === 'En Proceso').length;
  const activeClaimsCount = warranties.filter((w) => w.status === 'En Reclamación' || w.status === 'Por Vencer').length;

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) return console.error('No fue posible cerrar sesión', error);
    onClose();
  };

  interface NavItem {
    id: ViewMode;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
    badgeColor?: string;
  }

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'INICIO',
      items: [
        { id: 'dashboard', label: 'Dashboard General', icon: LayoutDashboard },
      ],
    },
    {
      title: 'GESTIÓN',
      items: [
        {
          id: 'inventory',
          label: 'Inventario & Recambios',
          icon: Boxes,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30',
        },
        { id: 'attendance', label: 'Control de Asistencia', icon: Clock },
        { id: 'employees', label: 'Catálogo de Empleados', icon: Users },
        { id: 'customers', label: 'Clientes & Vehículos', icon: Users },
        { id: 'vehicles', label: 'Ver todos los vehículos', icon: Bike },
        { id: 'move-inventory', label: 'Mover inventario', icon: ArrowRightLeft },
        { id: 'services', label: 'Catálogo de Servicios', icon: Wrench },
      ],
    },
    {
      title: 'OPERACIÓN DE TALLER',
      items: [
        {
          id: 'appointments',
          label: 'Agendamientos (Citas)',
          icon: CalendarDays,
          badge: pendingAptsCount > 0 ? pendingAptsCount : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30',
        },
        { id: 'actas', label: 'Actas de Inspección', icon: FileCheck2 },
      ],
    },
    {
      title: 'VENTAS & COBROS',
      items: [
        { id: 'invoices', label: 'Historial de Facturas', icon: Receipt },
        { id: 'new-invoice', label: 'Nueva Factura / TPV', icon: PlusCircle },
        {
          id: 'warranties',
          label: 'Garantías & Compras',
          icon: ShieldCheck,
          badge: activeClaimsCount > 0 ? activeClaimsCount : undefined,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30',
        },
      ],
    },
    {
      title: 'ANÁLISIS & AJUSTES',
      items: [
        { id: 'analytics', label: 'Reportes y Analítica', icon: BarChart3 },
        { id: 'settings', label: 'Configuración de Sede', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        id="main-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col shrink-0 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-screen`}
      >
        {/* Brand / Logo Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800/80">
          <div
            onClick={() => {
              navigateTo('dashboard');
              onClose();
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                MotoPro
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v2.4
                </span>
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold -mt-0.5">
                Taller & Concesionario
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                {sec.title}
              </p>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => {
                        navigateTo(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-300 border-l-4 border-indigo-500 rounded-r-lg'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span className="font-medium text-left">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Capacity & Status Widget */}
        <div className="p-4 border-t border-slate-800/90">
          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                  Elevadores Taller
                </span>
              </div>
              <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                80% Ocupación
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 w-[80%] rounded-full" />
            </div>
            <p className="text-[10px] text-slate-400">4 de 5 elevadores en servicio activo</p>
          </div>
          {isSupabaseConfigured && (
            <button
              onClick={() => void signOut()}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
