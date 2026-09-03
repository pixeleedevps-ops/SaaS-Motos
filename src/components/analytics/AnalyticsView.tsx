import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Wrench,
  Package,
  Calendar,
  Building2,
  PieChart,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCOP } from '../../utils/formatters';

export const AnalyticsView: React.FC = () => {
  const { invoices, products, services, appointments } = useApp();
  const [timeRange, setTimeRange] = useState<'mes' | 'trimestre' | 'año'>('mes');

  const topProducts = [
    { name: 'Aceite Motul 7100 4T 10W-40', units: 142, revenue: 34080000, percent: 85 },
    { name: 'Pastillas Freno Brembo Delanteras', units: 98, revenue: 17640000, percent: 65 },
    { name: 'Neumático Trasero Michelin Road 6', units: 42, revenue: 35700000, percent: 90 },
    { name: 'Kit Arrastre D.I.D 525VX3 Gold', units: 36, revenue: 23400000, percent: 55 },
    { name: 'Bujía Láser Iridium NGK', units: 180, revenue: 11700000, percent: 45 },
  ];

  const topServices = [
    { name: 'Sincronización Electrónica & Inyección', count: 68, revenue: 12240000 },
    { name: 'Mantenimiento de Suspensión Delantera', count: 24, revenue: 4320000 },
    { name: 'Instalación Kit de Arrastre', count: 32, revenue: 2880000 },
    { name: 'Calibración & Cambio de Frenos ABS', count: 48, revenue: 3600000 },
  ];

  const branchDistribution = [
    { name: 'Sede Principal (Bogotá - Chapinero)', share: '52%', revenue: '$ 78.450.000', color: 'bg-indigo-600' },
    { name: 'Sede Medellín (El Poblado)', share: '28%', revenue: '$ 42.200.000', color: 'bg-emerald-500' },
    { name: 'Sede Cali (Granada)', share: '12%', revenue: '$ 18.100.000', color: 'bg-amber-500' },
    { name: 'Sede Barranquilla (Alto Prado)', share: '8%', revenue: '$ 12.050.000', color: 'bg-blue-500' },
  ];

  return (
    <div id="analytics-view" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Reportes & Analítica de Rendimiento</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Métricas clave de facturación, rotación de recambios y rentabilidad por sede.
          </p>
        </div>

        {/* Time selector */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold text-gray-600">
          {(['mes', 'trimestre', 'año'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                timeRange === r ? 'bg-white text-gray-900 shadow-xs font-bold' : 'hover:text-gray-900'
              }`}
            >
              {r === 'mes' ? 'Este Mes' : r === 'trimestre' ? 'Trimestre' : 'Este Año'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-bold text-gray-600">Ingresos Totales</span>
          <p className="text-2xl font-black text-gray-900 mt-2">{formatCOP(150800000)}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.2% vs periodo anterior</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-bold text-gray-600">Ticket Promedio Taller</span>
          <p className="text-2xl font-black text-indigo-700 mt-2">{formatCOP(385000)}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+5.8% en repuestos premium</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-bold text-gray-600">Servicios Realizados</span>
          <p className="text-2xl font-black text-gray-900 mt-2">172 motos</p>
          <div className="mt-2 text-xs text-gray-600 font-medium">96% entregadas en plazo</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-bold text-gray-600">Margen Bruto de Ganancia</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">64.5%</p>
          <div className="mt-2 text-xs text-gray-600 font-medium">Mano de obra + Recambios</div>
        </div>
      </div>

      {/* Analytics Grid: Products Ranking & Service Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 Recambios con más ventas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Package className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Top Recambios más Vendidos</h2>
            </div>
            <span className="text-xs text-gray-600">Por facturación total</span>
          </div>

          <div className="space-y-3.5">
            {topProducts.map((p, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between items-baseline font-semibold">
                  <span className="text-gray-900 font-bold">{p.name}</span>
                  <span className="text-indigo-700 font-black">{formatCOP(p.revenue)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>{p.units} unidades despachadas</span>
                  <span>{p.percent}% de rotación</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div style={{ width: `${p.percent}%` }} className="bg-indigo-600 h-2 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución por Sede & Servicios más rentables */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Facturación por Sede de Taller</h2>
            </div>
          </div>

          <div className="space-y-3">
            {branchDistribution.map((b, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${b.color}`} />
                  <span className="font-bold text-gray-900">{b.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-gray-900">{b.revenue}</span>
                  <span className="text-[11px] text-gray-600 ml-2">({b.share})</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Servicios con Mayor Demanda</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {topServices.map((s, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="font-bold text-gray-900 line-clamp-1">{s.name}</p>
                  <p className="text-[11px] text-indigo-700 font-extrabold mt-0.5">
                    {s.count} veces • {formatCOP(s.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
