import React, { useState } from 'react';
import {
  Wrench,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Tag,
  DollarSign,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ServiceItem } from '../../types';
import { formatCOP } from '../../utils/formatters';

export const ServicesCatalogView: React.FC = () => {
  const { services, toggleServiceStatus, navigateTo } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [showAddModal, setShowAddModal] = useState(false);

  const categories = [
    'Todas',
    'Mantenimiento',
    'Instalación',
    'Reparación',
    'Diagnóstico',
    ...Array.from(new Set(services.map((service) => service.category))).filter(
      (category: string) => !['Mantenimiento', 'Instalación', 'Reparación', 'Diagnóstico'].includes(category),
    ),
  ];

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = selectedCategory === 'Todas' || s.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div id="services-catalog-view" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Catálogo de Servicios & Tarifas</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Tarifario oficial de mano de obra, tiempos baremados y paquetes de mantenimiento preventivo.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Servicio</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre de servicio, código o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((srv) => (
          <div
            key={srv.id}
            className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 hover:border-indigo-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {srv.category}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 mt-2 line-clamp-2">{srv.name}</h3>
                </div>
                <button
                  onClick={() => toggleServiceStatus(srv.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    srv.isActive ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 bg-gray-100'
                  }`}
                  title={srv.isActive ? 'Servicio Activo' : 'Servicio Inactivo'}
                >
                  {srv.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">
                {srv.description}
              </p>

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs">
                <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{srv.durationMin} min</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="font-mono text-[11px]">{srv.code}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-gray-600 uppercase">Tarifa Taller</span>
                <p className="text-xl font-black text-gray-900">{formatCOP(srv.price)}</p>
              </div>
              <button
                onClick={() => navigateTo('appointments')}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1"
              >
                <span>Agendar</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {filteredServices.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Wrench className="mx-auto h-8 w-8 text-gray-400" />
          <h3 className="mt-3 text-sm font-bold text-gray-900">No hay servicios para mostrar</h3>
          <p className="mt-1 text-xs text-gray-500">
            Verifica que existan registros en <code>public.servicios</code> y que el filtro seleccionado coincida con la columna <code>tipo</code>.
          </p>
        </div>
      )}

      {/* Modal: Nuevo Servicio */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Añadir Nuevo Servicio al Catálogo</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-600 hover:text-gray-600">✕</button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  placeholder="ej. Cambio de Kit de Transmisión Reforzada"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoría</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden">
                    {categories.filter((c) => c !== 'Todas').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Duración Baremada (min)</label>
                  <input
                    type="number"
                    defaultValue={60}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Precio Base ($ COP) *</label>
                <input
                  type="number"
                  step="5000"
                  defaultValue={120000}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descripción de las operaciones</label>
                <textarea
                  rows={3}
                  placeholder="Detalla qué incluye la mano de obra, puntos de verificación..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Guardar Servicio
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
