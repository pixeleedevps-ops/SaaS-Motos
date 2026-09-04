import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  Building2,
  User,
  Wrench,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Printer,
  Download,
  Plus,
  ArrowUpDown,
  Car,
  CreditCard,
  Phone,
  Mail,
  HelpCircle,
  X,
  Sparkles,
  ExternalLink,
  RefreshCw,
  QrCode,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WarrantyRecord, WarrantyClaim } from '../../types';
import { formatCOP } from '../../utils/formatters';

export const GarantiasView: React.FC = () => {
  const {
    warranties,
    branches,
    selectedBranch,
    setSelectedBranch,
    customers,
    products,
    services,
    invoices,
    createWarranty,
    addWarrantyClaim,
    updateWarrantyStatus,
    navigateTo,
  } = useApp();

  // Primary filters
  const [filterCedula, setFilterCedula] = useState<string>('');
  const [filterPlate, setFilterPlate] = useState<string>('');
  const [filterSku, setFilterSku] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('Todas');
  const [typeFilter, setTypeFilter] = useState<'all' | 'service' | 'product'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Modals & Selected Items
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [showNewWarrantyModal, setShowNewWarrantyModal] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  // Claim Form State
  const [claimReason, setClaimReason] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [claimMechanic, setClaimMechanic] = useState('Marcos Silva');
  const [claimCostCovered, setClaimCostCovered] = useState('0');

  // New Warranty Form State
  const [newType, setNewType] = useState<'service' | 'product'>('service');
  const [newCustomerCedula, setNewCustomerCedula] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('80');
  const [newBranch, setNewBranch] = useState(selectedBranch);
  const [newWarrantyMonths, setNewWarrantyMonths] = useState('6');
  const [newMechanicName, setNewMechanicName] = useState('Marcos Silva');
  const [newCoverageDetails, setNewCoverageDetails] = useState('');

  // Filter Logic
  const filteredWarranties = useMemo(() => {
    return warranties.filter((item) => {
      // Filter by Cedula
      if (filterCedula.trim()) {
        const cleanFilter = filterCedula.toLowerCase().trim();
        const cedulaMatch = item.customerCedula.toLowerCase().includes(cleanFilter);
        if (!cedulaMatch) return false;
      }

      // Filter by Plate
      if (filterPlate.trim()) {
        const cleanFilter = filterPlate.toLowerCase().replace(/[\s-]/g, '');
        const plateClean = item.motorcyclePlate.toLowerCase().replace(/[\s-]/g, '');
        if (!plateClean.includes(cleanFilter)) return false;
      }

      // Filter by SKU
      if (filterSku.trim()) {
        const cleanFilter = filterSku.toLowerCase().trim();
        if (!item.sku || !item.sku.toLowerCase().includes(cleanFilter)) {
          return false;
        }
      }

      // Filter by Branch / Sede
      if (branchFilter !== 'Todas' && item.branch !== branchFilter) {
        return false;
      }

      // Filter by Type
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // Filter by Status
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // General Search Query
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase().trim();
        const matchesGlobal =
          item.code.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q) ||
          item.customerName.toLowerCase().includes(q) ||
          item.customerCedula.toLowerCase().includes(q) ||
          item.invoiceNumber.toLowerCase().includes(q) ||
          item.motorcyclePlate.toLowerCase().includes(q) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.mechanicName && item.mechanicName.toLowerCase().includes(q)) ||
          item.branch.toLowerCase().includes(q);

        if (!matchesGlobal) return false;
      }

      return true;
    });
  }, [warranties, filterCedula, filterPlate, filterSku, branchFilter, typeFilter, statusFilter, globalSearch]);

  // KPIs
  const totalWarranties = warranties.length;
  const activeWarranties = warranties.filter((w) => w.status === 'Activa').length;
  const expiringSoon = warranties.filter((w) => w.status === 'Por Vencer').length;
  const inClaimCount = warranties.filter((w) => w.status === 'En Reclamación').length;
  const totalCoveredValue = warranties.reduce((acc, w) => acc + (w.itemPrice * (w.quantity || 1)), 0);

  // Clear all filters
  const resetFilters = () => {
    setFilterCedula('');
    setFilterPlate('');
    setFilterSku('');
    setBranchFilter('Todas');
    setTypeFilter('all');
    setStatusFilter('all');
    setGlobalSearch('');
  };

  const hasActiveFilters =
    filterCedula ||
    filterPlate ||
    filterSku ||
    branchFilter !== 'Todas' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    globalSearch;

  // Handle claim submission
  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;

    const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const created = await addWarrantyClaim(selectedWarranty.id, {
      date: todayStr,
      reason: claimReason,
      description: claimDescription,
      mechanicAssigned: claimMechanic,
      status: 'En Revisión',
      resolution: 'En proceso de peritaje y revisión técnica por el taller oficial.',
      costCovered: parseFloat(claimCostCovered) || 0,
    });

    if (created) {
      setClaimReason('');
      setClaimDescription('');
      setShowClaimModal(false);
    }
  };

  // Handle new manual warranty creation
  const handleCreateWarrantyManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const invoice = invoices.find((item) => item.invoiceNumber === newInvoiceNumber);
    if (!invoice) return;

    const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const months = parseInt(newWarrantyMonths, 10) || 6;
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + months);
    const expDateStr = expDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

    const created = await createWarranty({
      type: newType,
      itemName: newItemName || (newType === 'service' ? 'Mantenimiento General' : 'Recambio Especializado'),
      category: newType === 'service' ? 'Servicio Mecánico' : 'Repuesto Original',
      sku: newType === 'product' ? (newSku || 'SKU-GEN-001') : undefined,
      brand: newBrand || 'MotoPro Oficial',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      itemPrice: parseFloat(newItemPrice) || 0,
      quantity: 1,
      paymentMethod: 'Tarjeta',
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerCedula: invoice.customerNIF,
      customerPhone: invoice.customerPhone,
      customerEmail: invoice.customerEmail,
      motorcyclePlate: invoice.motorcyclePlate || newPlate.toUpperCase(),
      motorcycleModel: invoice.motorcycleModel || newModel,
      branch: invoice.branch,
      purchaseDate: invoice.issueDate || todayStr,
      warrantyMonths: months,
      expirationDate: expDateStr,
      mechanicName: newType === 'service' ? newMechanicName : undefined,
      mechanicRole: newType === 'service' ? 'Técnico Especialista' : undefined,
      mechanicAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      coverageDetails:
        newCoverageDetails ||
        (newType === 'service'
          ? 'Cobertura 100% en mano de obra y piezas reemplazadas ante fallos de montaje.'
          : 'Garantía del fabricante contra defectos de fabricación o fallas prematuras.'),
      termsAndConditions: 'Válido durante el periodo estipulado. Requiere presentación de factura y acta de servicio.',
      status: 'Activa',
    });

    if (created) setShowNewWarrantyModal(false);
  };

  // Helper badge styles
  const getStatusBadge = (status: WarrantyRecord['status']) => {
    switch (status) {
      case 'Activa':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/10';
      case 'Por Vencer':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/10 animate-pulse';
      case 'Vencida':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-600/10';
      case 'En Reclamación':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-600/10';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div id="warranties-module" className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 border border-indigo-200/50">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Módulo de Garantías & Compras</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Registro unificado de compras de servicios y productos, control de vigencia, asignación de mecánicos y radicación de reclamaciones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="open-new-warranty-btn"
            onClick={() => setShowNewWarrantyModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Garantía Manual</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Compras</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1.5">{totalWarranties}</p>
          <span className="text-[10px] text-slate-500 font-medium">Servicios & Repuestos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vigentes / Activas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1.5">{activeWarranties}</p>
          <span className="text-[10px] text-emerald-600/80 font-medium">Bajo cobertura oficial</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Por Vencer (&lt;30d)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1.5">{expiringSoon}</p>
          <span className="text-[10px] text-amber-600 font-medium">Revisión recomendada</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Reclamaciones</span>
            <AlertTriangle className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-1.5">{inClaimCount}</p>
          <span className="text-[10px] text-indigo-600 font-medium">En proceso de taller</span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xs text-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Valor Garantizado</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1.5">{formatCOP(totalCoveredValue)}</p>
          <span className="text-[10px] text-slate-300 font-medium">Monto acumulado cubierto</span>
        </div>
      </div>

      {/* FILTER PANEL: Specific Filters Required (Cédula, Placa, SKU, Sede) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Filtros Avanzados de Búsqueda
            </h2>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
              {filteredWarranties.length} resultados
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>

        {/* 4 Core Specific Filters in Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* 1. Filter by Cédula del Cliente */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cédula del Cliente</span>
            </label>
            <div className="relative">
              <input
                id="filter-cedula-input"
                type="text"
                value={filterCedula}
                onChange={(e) => setFilterCedula(e.target.value)}
                placeholder="Ej. 1.020.456.789, 79.845.120..."
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden bg-slate-50/60 focus:bg-white transition-all"
              />
              {filterCedula && (
                <button
                  onClick={() => setFilterCedula('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Filter by Placa de la Moto */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-indigo-600" />
              <span>Placa de la Moto</span>
            </label>
            <div className="relative">
              <input
                id="filter-plate-input"
                type="text"
                value={filterPlate}
                onChange={(e) => setFilterPlate(e.target.value.toUpperCase())}
                placeholder="Ej. UWE-48E, BMW-77F, MBB-12F..."
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden bg-slate-50/60 focus:bg-white transition-all"
              />
              {filterPlate && (
                <button
                  onClick={() => setFilterPlate('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Filter by SKU del Producto */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>SKU del Producto</span>
            </label>
            <div className="relative">
              <input
                id="filter-sku-input"
                type="text"
                value={filterSku}
                onChange={(e) => setFilterSku(e.target.value.toUpperCase())}
                placeholder="Ej. MICH-R6, MOT-7100, YUA..."
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden bg-slate-50/60 focus:bg-white transition-all"
              />
              {filterSku && (
                <button
                  onClick={() => setFilterSku('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 4. Escoger Sede / Branch */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Escoger Sede</span>
            </label>
            <select
              id="filter-branch-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden bg-slate-50/60 focus:bg-white transition-all"
            >
              <option value="Todas">🏢 Todas las Sedes</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  📍 {b}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Secondary Filter Badges: Type, Status, & General Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Tipo:</span>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'service', label: '🛠️ Servicios' },
              { key: 'product', label: '📦 Productos / Piezas' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key as any)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  typeFilter === t.key
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <span className="text-[11px] font-bold text-slate-500 mr-1">Estado:</span>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'Activa', label: '🟢 Activa' },
              { key: 'Por Vencer', label: '🟡 Por Vencer' },
              { key: 'Vencida', label: '🔴 Vencida' },
              { key: 'En Reclamación', label: '🟣 En Reclamación' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  statusFilter === s.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Buscar por cliente, factura, mecánico..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-slate-50 focus:bg-white transition-all"
            />
          </div>

        </div>

      </div>

      {/* Main Table / Grid of Warranties */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Registro Detallado de Compras & Pólizas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Información de cliente, facturación, fechas de inicio y expiración, y mecánicos responsables.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Mostrando <strong className="text-slate-900">{filteredWarranties.length}</strong> de {warranties.length} registros
          </span>
        </div>

        {filteredWarranties.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800">No se encontraron garantías con los filtros aplicados</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Intenta cambiar los parámetros de búsqueda por Cédula, Placa, SKU o seleccionar "Todas las Sedes".
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                  <th className="py-3.5 px-4">Póliza / Item Comprado</th>
                  <th className="py-3.5 px-4">Cliente &amp; Cédula</th>
                  <th className="py-3.5 px-4">Factura &amp; Sede</th>
                  <th className="py-3.5 px-4">Fechas &amp; Vigencia</th>
                  <th className="py-3.5 px-4">Mecánico / SKU</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredWarranties.map((item) => {
                  const isService = item.type === 'service';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedWarranty(item)}
                    >
                      
                      {/* Póliza & Item Name */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 mt-0.5 border ${
                              isService
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            }`}
                          >
                            {isService ? <Wrench className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                {item.code}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">
                                {isService ? 'SERVICIO' : 'PRODUCTO'}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs mt-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {item.itemName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 font-bold border border-slate-200">
                                {item.motorcyclePlate}
                              </span>
                              <span className="truncate max-w-[140px]">{item.motorcycleModel}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cliente & Cédula */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{item.customerName}</p>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                            <span className="text-slate-600">C.C. / NIT:</span>
                            <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-900 border border-indigo-200/60">
                              {item.customerCedula}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">{item.customerPhone}</p>
                        </div>
                      </td>

                      {/* Factura & Sede */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              {item.invoiceNumber}
                            </span>
                            <span className="font-black text-emerald-600 text-xs">
                              {formatCOP(item.itemPrice)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[130px] font-medium">{item.branch}</span>
                          </div>
                        </div>
                      </td>

                      {/* Fechas & Vigencia */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="text-[11px] text-slate-600">
                            <span>Compra: </span>
                            <strong className="text-slate-800">{item.purchaseDate}</strong>
                          </div>
                          <div className="text-[11px]">
                            <span className="text-slate-600">Fin Garantía: </span>
                            <strong className="text-indigo-900 font-bold bg-indigo-50/80 px-1 py-0.5 rounded">
                              {item.expirationDate}
                            </strong>
                          </div>
                          <div className="text-[10px] text-slate-600 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {item.daysRemaining > 0
                                ? `${item.daysRemaining} días restantes (${item.warrantyMonths} meses)`
                                : `Expiró hace ${Math.abs(item.daysRemaining)} días`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Mecánico (Si es servicio) / SKU (Si es producto) */}
                      <td className="py-4 px-4">
                        {isService ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={item.mechanicAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={item.mechanicName || 'Mecánico'}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs truncate">
                                {item.mechanicName || 'Marcos Silva'}
                              </p>
                              <p className="text-[10px] text-slate-600 truncate">
                                {item.mechanicRole || 'Técnico Especialista'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-600 font-bold">SKU:</span>
                              <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {item.sku || 'N/A'}
                              </span>
                            </div>
                            {item.brand && (
                              <p className="text-[10px] font-bold text-indigo-600">{item.brand}</p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status === 'Activa' && <CheckCircle2 className="w-3 h-3" />}
                          {item.status === 'Por Vencer' && <Clock className="w-3 h-3" />}
                          {item.status === 'Vencida' && <X className="w-3 h-3" />}
                          {item.status === 'En Reclamación' && <AlertTriangle className="w-3 h-3" />}
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            title="Ver Certificado de Garantía"
                            onClick={() => {
                              setSelectedWarranty(item);
                              setShowCertificateModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Radicar Reclamación"
                            onClick={() => {
                              setSelectedWarranty(item);
                              setShowClaimModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-bold text-[11px] flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Reclamo</span>
                          </button>
                          <button
                            title="Ver detalles completos"
                            onClick={() => setSelectedWarranty(item)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MODAL 1: Warranty Detail & History Drawer / Modal */}
      {selectedWarranty && !showCertificateModal && !showClaimModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                      {selectedWarranty.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedWarranty.status === 'Activa'
                          ? 'bg-emerald-500 text-white'
                          : selectedWarranty.status === 'Por Vencer'
                          ? 'bg-amber-500 text-white'
                          : selectedWarranty.status === 'En Reclamación'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {selectedWarranty.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">{selectedWarranty.itemName}</h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedWarranty(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              
              {/* Client & Vehicle Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    Información del Cliente
                  </span>
                  <p className="font-black text-slate-900 text-sm">{selectedWarranty.customerName}</p>
                  <p className="text-xs text-indigo-700 font-bold">
                    Cédula de Ciudadanía: <span className="font-mono text-slate-900">{selectedWarranty.customerCedula}</span>
                  </p>
                  <p className="text-xs text-slate-600">{selectedWarranty.customerPhone}</p>
                  <p className="text-xs text-slate-600">{selectedWarranty.customerEmail}</p>
                </div>

                <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    Vehículo &amp; Facturación
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                      {selectedWarranty.motorcyclePlate}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{selectedWarranty.motorcycleModel}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Factura: <strong className="text-slate-900">{selectedWarranty.invoiceNumber}</strong> ({formatCOP(selectedWarranty.itemPrice)})
                  </p>
                  <p className="text-xs text-slate-600">
                    Sede: <strong className="text-slate-800">{selectedWarranty.branch}</strong>
                  </p>
                </div>
              </div>

              {/* Warranty Period & Mechanic/SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Dates */}
                <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Fechas de Cobertura</span>
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Fecha de Compra:</span>
                      <strong className="text-slate-900">{selectedWarranty.purchaseDate}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Fin de Garantía:</span>
                      <strong className="text-indigo-700 font-bold bg-indigo-50 px-1 rounded">
                        {selectedWarranty.expirationDate}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Duración:</span>
                      <strong className="text-slate-800">{selectedWarranty.warrantyMonths} meses</strong>
                    </div>
                  </div>
                </div>

                {/* Mechanic or SKU */}
                <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                    {selectedWarranty.type === 'service' ? (
                      <>
                        <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Mecánico Responsable</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Ficha del Producto</span>
                      </>
                    )}
                  </span>

                  {selectedWarranty.type === 'service' ? (
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={selectedWarranty.mechanicAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={selectedWarranty.mechanicName || 'Mecánico'}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-black text-slate-900 text-xs">
                          {selectedWarranty.mechanicName || 'Marcos Silva'}
                        </p>
                        <p className="text-[11px] text-indigo-600 font-bold">
                          {selectedWarranty.mechanicRole || 'Técnico Especialista'}
                        </p>
                        <p className="text-[10px] text-slate-600">Taller Autorizado MotoPro</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-600">SKU Código:</span>
                        <strong className="font-mono text-slate-900 bg-slate-100 px-1 rounded">
                          {selectedWarranty.sku || 'N/A'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Fabricante:</span>
                        <strong className="text-indigo-700">{selectedWarranty.brand || 'Original'}</strong>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Coverage Details & Terms */}
              <div className="space-y-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-xs">
                <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider">
                  Términos y Alcance de Cobertura
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedWarranty.coverageDetails}
                </p>
                {selectedWarranty.termsAndConditions && (
                  <p className="text-[11px] text-slate-600 italic mt-1">
                    Nota legal: {selectedWarranty.termsAndConditions}
                  </p>
                )}
              </div>

              {/* Claims History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-indigo-600" />
                    <span>Historial de Reclamaciones ({selectedWarranty.claims?.length || 0})</span>
                  </h4>
                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva Reclamación</span>
                  </button>
                </div>

                {selectedWarranty.claims && selectedWarranty.claims.length > 0 ? (
                  <div className="space-y-2">
                    {selectedWarranty.claims.map((cl) => (
                      <div key={cl.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-600">{cl.claimCode}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {cl.status}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900">{cl.reason}</p>
                        <p className="text-slate-600 text-[11px]">{cl.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-slate-200/60">
                          <span>Mecánico perito: <strong>{cl.mechanicAssigned}</strong></span>
                          <span>Fecha: {cl.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
                    No se han radicado reclamaciones para esta póliza.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowCertificateModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Certificado Oficial</span>
              </button>

              <button
                onClick={() => setSelectedWarranty(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Official Printable Certificate View */}
      {selectedWarranty && showCertificateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150">
            
            {/* Toolbar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">Certificado de Garantía Oficial MotoPro</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Paper */}
            <div className="p-8 overflow-y-auto space-y-6 bg-slate-50 flex-1">
              <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border-2 border-indigo-900/20 shadow-lg relative space-y-6 font-serif">
                
                {/* Watermark Logo Simulation */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                  <ShieldCheck className="w-96 h-96 text-slate-900" />
                </div>

                {/* Certificate Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-700 rounded-xl flex items-center justify-center text-white">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-slate-900 font-sans">
                        MOTOPRO WORKSHOP NETWORK
                      </h2>
                      <p className="text-xs text-slate-600 font-sans">
                        Certificación Técnica Oficial de Garantía y Respaldo
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-sans">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Póliza Nº</span>
                    <p className="text-sm font-mono font-black text-indigo-700">{selectedWarranty.code}</p>
                  </div>
                </div>

                {/* Certificate Title */}
                <div className="text-center py-2 space-y-1">
                  <h3 className="text-lg font-bold uppercase tracking-widest text-slate-900">
                    CERTIFICADO DE GARANTÍA VIGENTE
                  </h3>
                  <p className="text-xs text-slate-600 font-sans max-w-lg mx-auto">
                    Por medio del presente documento, MotoPro certifica la vigencia de garantía técnica aplicable al servicio o repuesto detallado.
                  </p>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-2 gap-4 font-sans text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">Beneficiario / Cliente</span>
                    <p className="font-bold text-slate-900">{selectedWarranty.customerName}</p>
                    <p className="text-slate-600">Cédula C.C.: <strong className="text-indigo-950 font-mono">{selectedWarranty.customerCedula}</strong></p>
                    <p className="text-slate-600">Tel: {selectedWarranty.customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">Vehículo Vinculado</span>
                    <p className="font-bold text-slate-900">{selectedWarranty.motorcycleModel}</p>
                    <p className="text-slate-600">Placa: <strong className="font-mono text-slate-950 font-black">{selectedWarranty.motorcyclePlate}</strong></p>
                    <p className="text-slate-600">Factura: {selectedWarranty.invoiceNumber}</p>
                  </div>
                </div>

                {/* Item & Coverage */}
                <div className="font-sans text-xs space-y-2 border border-slate-200 p-4 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500">Ítem Cubierto</span>
                      <h4 className="font-black text-slate-900 text-sm">{selectedWarranty.itemName}</h4>
                      {selectedWarranty.sku && (
                        <p className="text-[11px] font-mono text-slate-600">SKU: {selectedWarranty.sku} | Marca: {selectedWarranty.brand}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Duración Oficial</span>
                      <p className="font-black text-indigo-700 text-sm">{selectedWarranty.warrantyMonths} Meses</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Vigencia Temporal</span>
                    <p className="text-slate-800 text-xs">
                      Desde el <strong>{selectedWarranty.purchaseDate}</strong> hasta el <strong>{selectedWarranty.expirationDate}</strong>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-slate-700 text-[11px] leading-relaxed">
                    <strong>Alcance: </strong>{selectedWarranty.coverageDetails}
                  </div>
                </div>

                {/* Signatures & Stamps */}
                <div className="font-sans grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-[10px]">
                  <div className="space-y-1">
                    <div className="h-10 flex items-center justify-center">
                      <span className="font-serif italic text-indigo-900 text-sm font-black">
                        {selectedWarranty.mechanicName || 'Mecánico MotoPro'}
                      </span>
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-800">{selectedWarranty.mechanicName || 'Técnico Responsable'}</p>
                      <p className="text-slate-500">Firma Técnico / Taller</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-indigo-600 flex flex-col items-center justify-center text-indigo-700 text-[8px] font-bold uppercase p-1">
                      <span>SELLO OFICIAL</span>
                      <span className="text-[7px]">MOTOPRO RED</span>
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1">{selectedWarranty.branch}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-10 flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-slate-700" />
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-800">Verificación Digital</p>
                      <p className="text-slate-500">Código QR de Autenticidad</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Cerrar Vista
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Radicar Reclamación de Garantía */}
      {selectedWarranty && showClaimModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Radicar Reclamación de Garantía</h3>
                  <p className="text-xs text-indigo-300 font-mono">{selectedWarranty.code} - {selectedWarranty.customerName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowClaimModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="p-6 space-y-4 text-xs font-medium text-slate-700">
              
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 space-y-1">
                <p className="font-bold text-indigo-900">Ítem objeto del reclamo:</p>
                <p className="text-slate-800">{selectedWarranty.itemName} ({selectedWarranty.motorcyclePlate})</p>
                <p className="text-[11px] text-slate-500">Cédula: {selectedWarranty.customerCedula} | Sede: {selectedWarranty.branch}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-800">
                  Motivo Principal de la Reclamación *
                </label>
                <input
                  type="text"
                  required
                  value={claimReason}
                  onChange={(e) => setClaimReason(e.target.value)}
                  placeholder="Ej. Ruido anormal en transmisión, pérdida de compresión..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-800">
                  Descripción Detallada del Fallo Reportado *
                </label>
                <textarea
                  required
                  rows={3}
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                  placeholder="Explique las condiciones en que ocurre el fallo, kilometraje actual y observaciones del cliente..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">
                    Mecánico Asignado a Peritaje
                  </label>
                  <select
                    value={claimMechanic}
                    onChange={(e) => setClaimMechanic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Marcos Silva">Marcos Silva (Técnico Principal)</option>
                    <option value="David Morales">David Morales (Mecánico)</option>
                    <option value="Carlos Ruiz">Carlos Ruiz (Electricista)</option>
                    <option value="Roberto Gómez">Roberto Gómez (Neumáticos)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">
                    Costo Estimado Cubierto ($ COP)
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={claimCostCovered}
                    onChange={(e) => setClaimCostCovered(e.target.value)}
                    placeholder="120000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Radicar Reclamación</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: Registrar Garantía Manual / Externa */}
      {showNewWarrantyModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Registrar Nueva Garantía de Compra</h3>
                  <p className="text-xs text-slate-400">Vincule servicios o productos a clientes, vehículos y mecánicos</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewWarrantyModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarrantyManual} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-medium text-slate-700">
              
              {/* Type Switcher */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-800">Tipo de Adquisición *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('service')}
                    className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      newType === 'service'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-600/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Servicio Mecánico Oficial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('product')}
                    className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      newType === 'product'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700 ring-2 ring-emerald-600/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Repuesto o Producto Físico</span>
                  </button>
                </div>
              </div>

              {/* La garantía siempre se vincula a una compra persistente. */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
                  1. Compra / Factura de origen
                </span>
                <select
                  required
                  value={newInvoiceNumber}
                  onChange={(e) => {
                    const selected = invoices.find((invoice) => invoice.invoiceNumber === e.target.value);
                    setNewInvoiceNumber(e.target.value);
                    if (selected) {
                      setNewCustomerName(selected.customerName);
                      setNewCustomerCedula(selected.customerNIF);
                      setNewCustomerPhone(selected.customerPhone);
                      setNewCustomerEmail(selected.customerEmail);
                      setNewPlate(selected.motorcyclePlate || '');
                      setNewModel(selected.motorcycleModel || '');
                      setNewBranch(selected.branch);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                >
                  <option value="">Seleccionar una factura existente</option>
                  {invoices.filter((invoice) => invoice.status !== 'Anulada').map((invoice) => (
                    <option key={invoice.id} value={invoice.invoiceNumber}>{invoice.invoiceNumber} — {invoice.customerName} — {invoice.issueDate}</option>
                  ))}
                </select>
                {newInvoiceNumber && <p className="text-[11px] text-slate-600">Cliente: {newCustomerName} · Documento: {newCustomerCedula || '—'}</p>}
              </div>

              {/* Vehicle & Sede Info Grid */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
                  2. Vehículo, Sede y Factura
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Placa de la Moto *</label>
                    <input
                      type="text"
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                      placeholder="Ej. UWE-48E"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Modelo / Marca</label>
                    <input
                      type="text"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="Ej. Yamaha MT-09"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Sede del Taller *</label>
                    <select
                      value={newBranch}
                      onChange={(e) => setNewBranch(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Precio / Importe ($ COP)</label>
                    <input
                      type="number"
                      step="5000"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="180000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Item Details (Service vs Product) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
                  3. Detalles de la Cobertura
                </span>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Nombre del {newType === 'service' ? 'Servicio Realizado' : 'Producto / Pieza'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={newType === 'service' ? 'Ej. Cambio de Kit de Arrastre y Sincronización' : 'Ej. Neumático Michelin Road 6'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {newType === 'product' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">SKU del Producto *</label>
                      <input
                        type="text"
                        required
                        value={newSku}
                        onChange={(e) => setNewSku(e.target.value.toUpperCase())}
                        placeholder="Ej. MICH-R6-1805517"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Marca / Fabricante</label>
                      <input
                        type="text"
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        placeholder="Ej. Michelin, Motul, Brembo..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Mecánico Responsable del Servicio *
                    </label>
                    <select
                      value={newMechanicName}
                      onChange={(e) => setNewMechanicName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="Marcos Silva">Marcos Silva (Técnico Mecánico Principal)</option>
                      <option value="David Morales">David Morales (Técnico Mecánico)</option>
                      <option value="Carlos Ruiz">Carlos Ruiz (Técnico Electricista & Inyección)</option>
                      <option value="Roberto Gómez">Roberto Gómez (Especialista Neumáticos)</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Meses de Garantía *</label>
                    <select
                      value={newWarrantyMonths}
                      onChange={(e) => setNewWarrantyMonths(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="3">3 Meses (90 Días)</option>
                      <option value="6">6 Meses (180 Días - Estándar Taller)</option>
                      <option value="12">12 Meses (1 Año - Piezas Oficiales)</option>
                      <option value="24">24 Meses (2 Años - Fabricante Premium)</option>
                      <option value="36">36 Meses (3 Años - Baterías/Estructura)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Condiciones Específicas</label>
                    <input
                      type="text"
                      value={newCoverageDetails}
                      onChange={(e) => setNewCoverageDetails(e.target.value)}
                      placeholder="Cobertura 100% en mano de obra y repuestos..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewWarrantyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Emitir Póliza de Garantía</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
