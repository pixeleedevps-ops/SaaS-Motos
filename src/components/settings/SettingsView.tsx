import React, { useState } from 'react';
import {
  Settings,
  Building2,
  ShieldCheck,
  Percent,
  Receipt,
  User,
  Save,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { branches, selectedBranch, showToast } = useApp();

  const [companyInfo, setCompanyInfo] = useState({
    name: 'MotoPro Motorsport Colombia S.A.S.',
    nif: 'NIT: 901.482.910-3',
    phone: '+57 (601) 745-8900',
    email: 'contacto@motopro.com.co',
    address: 'Cra 15 # 85-32, Chapinero, Bogotá D.C.',
    vatRate: 19,
    invoicePrefix: 'FAC-BOG-',
    laborHourlyRate: 75000,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Configuración del taller guardada correctamente', 'success');
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Configuración del Sistema & Taller</h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Parámetros fiscales, sedes autorizadas, tarifas de mano de obra y perfil de usuario.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Company profile & Fiscal data */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-900">Datos Fiscales de la Empresa</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Razón Social *</label>
              <input
                type="text"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">NIT / Cédula Tributaria *</label>
              <input
                type="text"
                value={companyInfo.nif}
                onChange={(e) => setCompanyInfo({ ...companyInfo, nif: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Teléfono Principal</label>
              <input
                type="text"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Email de Contacto</label>
              <input
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Dirección Fiscal / Sede Principal</label>
              <input
                type="text"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Rates & Invoicing settings */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Percent className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900">Tarifas, Impuestos & Numeración</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Tipo de IVA por defecto (%)</label>
              <input
                type="number"
                value={companyInfo.vatRate}
                onChange={(e) => setCompanyInfo({ ...companyInfo, vatRate: parseInt(e.target.value) || 19 })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Prefijo de Facturas</label>
              <input
                type="text"
                value={companyInfo.invoicePrefix}
                onChange={(e) => setCompanyInfo({ ...companyInfo, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Precio Hora Mano de Obra ($ COP/h)</label>
              <input
                type="number"
                step="1000"
                value={companyInfo.laborHourlyRate}
                onChange={(e) => setCompanyInfo({ ...companyInfo, laborHourlyRate: parseFloat(e.target.value) || 75000 })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* User profile card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">Perfil de Usuario Activo</h2>
          </div>

          <div className="flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Carlos Mendoza"
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/20"
            />
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm">Carlos Mendoza</h3>
              <p className="text-xs text-gray-600 font-medium">Jefe de Taller & Administrador Principal</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                Permisos de Administrador Totales
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>

      </form>

    </div>
  );
};
