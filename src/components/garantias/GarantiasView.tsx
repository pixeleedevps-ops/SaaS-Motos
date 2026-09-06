import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Package,
  Search,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { WarrantyRecord } from '../../types';
import { formatCOP } from '../../utils/formatters';

type WarrantyTypeFilter = 'all' | WarrantyRecord['type'];
type WarrantyStatusFilter = 'all' | 'Activa' | 'Por Vencer' | 'Vencida';

const statusPresentation: Record<WarrantyStatusFilter, { label: string; className: string }> = {
  all: { label: 'Todos los estados', className: '' },
  Activa: { label: 'Vigente', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  'Por Vencer': { label: 'Próxima a vencer', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  Vencida: { label: 'Vencida', className: 'border-rose-200 bg-rose-50 text-rose-700' },
};

export const GarantiasView: React.FC = () => {
  const { warranties, branchOptions, selectedBranch, navigateTo } = useApp();
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<WarrantyTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<WarrantyStatusFilter>('all');

  useEffect(() => setBranchFilter('all'), [selectedBranch]);

  const filteredWarranties = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return warranties.filter((warranty) => {
      if (branchFilter !== 'all' && warranty.branchId !== branchFilter) return false;
      if (typeFilter !== 'all' && warranty.type !== typeFilter) return false;
      if (statusFilter !== 'all' && warranty.status !== statusFilter) return false;
      if (!term) return true;

      return [
        warranty.customerName,
        warranty.customerCedula,
        warranty.customerPhone,
        warranty.customerEmail,
        warranty.invoiceNumber,
        warranty.itemName,
        warranty.sku,
        warranty.branch,
      ].some((value) => value?.toLocaleLowerCase('es').includes(term));
    });
  }, [branchFilter, search, statusFilter, typeFilter, warranties]);

  const counts = useMemo(() => ({
    total: warranties.length,
    active: warranties.filter((warranty) => warranty.status === 'Activa').length,
    expiring: warranties.filter((warranty) => warranty.status === 'Por Vencer').length,
    expired: warranties.filter((warranty) => warranty.status === 'Vencida').length,
  }), [warranties]);

  return (
    <div id="warranties-module" className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-indigo-200 bg-indigo-50 p-2 text-indigo-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Garantías y Compras</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Productos facturados con garantía y servicios vinculados a una cita completada.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
          <Building2 className="h-3.5 w-3.5 text-indigo-600" />
          Viendo: {selectedBranch || 'Mi información'}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Registros exactos', value: counts.total, icon: ShieldCheck, color: 'text-indigo-600' },
          { label: 'Vigentes', value: counts.active, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Próximas a vencer', value: counts.expiring, icon: Clock3, color: 'text-amber-600' },
          { label: 'Vencidas', value: counts.expired, icon: TriangleAlert, color: 'text-rose-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="relative">
            <span className="sr-only">Buscar garantía</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, factura, teléfono o concepto" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </label>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-hidden focus:border-indigo-400">
            <option value="all">Todas las sedes visibles</option>
            {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as WarrantyTypeFilter)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-hidden focus:border-indigo-400">
            <option value="all">Productos y servicios</option>
            <option value="product">Producto</option>
            <option value="service">Servicio</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WarrantyStatusFilter)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-hidden focus:border-indigo-400">
            {Object.entries(statusPresentation).map(([value, presentation]) => <option key={value} value={value}>{presentation.label}</option>)}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Tipo / concepto</th><th className="px-4 py-3">Factura</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Sede</th><th className="px-4 py-3">Compra / servicio</th><th className="px-4 py-3">Vence / revisión</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWarranties.map((warranty) => {
                const TypeIcon = warranty.type === 'service' ? Wrench : Package;
                const status = statusPresentation[warranty.status === 'En Reclamación' ? 'Activa' : warranty.status];
                return (
                  <tr key={warranty.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3.5"><div className="flex items-start gap-2.5"><span className={`rounded-lg p-2 ${warranty.type === 'service' ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'}`}><TypeIcon className="h-4 w-4" /></span><div><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${warranty.type === 'service' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>{warranty.type === 'service' ? 'Servicio' : 'Producto'}</span><p className="mt-1 max-w-56 font-bold text-slate-900">{warranty.itemName}</p>{warranty.sku && <p className="mt-0.5 text-[10px] text-slate-500">SKU: {warranty.sku}</p>}</div></div></td>
                    <td className="px-4 py-3.5"><button type="button" onClick={() => navigateTo('invoices', { invoiceId: warranty.invoiceId })} className="inline-flex items-center gap-1.5 font-black text-indigo-700 hover:text-indigo-900"><FileText className="h-3.5 w-3.5" />{warranty.invoiceNumber}</button>{warranty.type === 'service' && warranty.appointmentId && <p className="mt-1 text-[10px] text-slate-500">Cita vinculada</p>}</td>
                    <td className="px-4 py-3.5"><p className="font-bold text-slate-900">{warranty.customerName}</p><p className="mt-0.5 text-[10px] text-slate-500">{warranty.customerCedula || 'Sin documento'}</p><p className="text-[10px] text-slate-500">{warranty.customerPhone || warranty.customerEmail || 'Sin contacto'}</p></td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{warranty.branch}</td>
                    <td className="px-4 py-3.5 text-slate-700"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{warranty.purchaseDate}</span></td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{warranty.expirationDate}</td>
                    <td className="px-4 py-3.5"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>{warranty.status !== 'Vencida' && <p className="mt-1 text-[10px] text-slate-500">{warranty.daysRemaining} días restantes</p>}</td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-900">{formatCOP(warranty.itemPrice * warranty.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredWarranties.length === 0 && <div className="flex flex-col items-center px-6 py-16 text-center"><ShieldCheck className="h-10 w-10 text-slate-300" /><h2 className="mt-3 text-sm font-black text-slate-800">No hay garantías que coincidan</h2><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Solo aparecen productos con fecha de garantía y servicios facturados vinculados a una cita completada con próxima revisión.</p></div>}
      </section>
    </div>
  );
};
