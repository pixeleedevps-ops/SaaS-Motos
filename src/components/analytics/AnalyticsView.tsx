import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Package,
  Receipt,
  TicketCheck,
  Wrench,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { Appointment, Invoice } from '../../types';
import { formatCOP } from '../../utils/formatters';

type RangePreset = 'day' | 'week' | 'month' | 'custom';

type AnalyticsReport = {
  resumen: {
    ingresos: number;
    facturas: number;
    ticket_promedio: number;
    productos_vendidos: number;
    servicios_realizados: number;
    margen_bruto: null;
  };
  productos: Array<{ id: string | null; nombre: string; unidades: number; ingresos: number }>;
  servicios: Array<{ id: string | null; nombre: string; cantidad: number; ingresos: number }>;
  sedes: Array<{ id: string; nombre: string; tipo: string; facturas: number; ingresos: number; ticket_promedio: number }>;
};

const pad = (value: number) => String(value).padStart(2, '0');
const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const invoiceDate = (invoice: Invoice) => {
  if (invoice.issuedAt) return new Date(`${invoice.issuedAt}T00:00:00`);
  const parsed = new Date(invoice.issueDate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const appointmentDate = (appointment: Appointment) => {
  if (appointment.scheduledAt) return new Date(appointment.scheduledAt);
  const fallback = new Date();
  if (appointment.date.toLowerCase().includes('mañana')) fallback.setDate(fallback.getDate() + 1);
  return fallback;
};

export const AnalyticsView: React.FC = () => {
  const { invoices, appointments, branchOptions, selectedBranch, currentUserRole } = useApp();
  const today = new Date();
  const [rangePreset, setRangePreset] = useState<RangePreset>('month');
  const [anchorDate, setAnchorDate] = useState(toDateKey(today));
  const [customStart, setCustomStart] = useState(toDateKey(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(toDateKey(today));
  const [remoteReport, setRemoteReport] = useState<AnalyticsReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const range = useMemo(() => {
    const anchor = new Date(`${anchorDate}T00:00:00`);
    let start = new Date(anchor);
    let end = new Date(anchor);
    if (rangePreset === 'week') {
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else if (rangePreset === 'month') {
      start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    } else if (rangePreset === 'custom') {
      start = new Date(`${customStart}T00:00:00`);
      end = new Date(`${customEnd}T23:59:59`);
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [anchorDate, customEnd, customStart, rangePreset]);

  const reportStart = toDateKey(range.start);
  const reportEnd = toDateKey(range.end);
  const selectedLocationId = selectedBranch === 'Todas las sedes'
    ? null
    : branchOptions.find((branch) => branch.name === selectedBranch)?.id || null;

  useEffect(() => {
    let active = true;
    if (!supabase || !currentUserRole || currentUserRole === 'cliente' || currentUserRole === 'mecanico') {
      setRemoteReport(null);
      return () => { active = false; };
    }

    setReportLoading(true);
    setReportError('');
    void supabase.rpc('reporte_erp', {
      p_desde: reportStart,
      p_hasta: reportEnd,
      p_sede_id: selectedLocationId,
    }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        console.error('No fue posible cargar los agregados del reporte', error);
        setRemoteReport(null);
        setReportError('No fue posible consultar las métricas reales.');
      } else {
        setRemoteReport(data as unknown as AnalyticsReport);
      }
      setReportLoading(false);
    });

    return () => { active = false; };
  }, [currentUserRole, reportEnd, reportStart, selectedLocationId]);

  const inRange = (date: Date) => !Number.isNaN(date.getTime()) && date >= range.start && date <= range.end;
  const filteredInvoices = useMemo(() => invoices.filter((invoice) => inRange(invoiceDate(invoice))), [invoices, range]);
  const postedInvoices = filteredInvoices.filter((invoice) => !['Anulada', 'Borrador'].includes(invoice.status));
  const completedAppointments = appointments.filter((appointment) => appointment.status === 'Completada' && inRange(appointmentDate(appointment)));

  const localTotalRevenue = postedInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const localAverageTicket = postedInvoices.length ? localTotalRevenue / postedInvoices.length : 0;
  const localProductUnits = postedInvoices.reduce((sum, invoice) => sum + invoice.items.filter((item) => item.type === 'product').reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const invoicedServiceUnits = postedInvoices.reduce((sum, invoice) => sum + invoice.items.filter((item) => item.type === 'service').reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const localServiceCount = invoicedServiceUnits || completedAppointments.length;

  const localTopProducts = useMemo(() => {
    const grouped = new Map<string, { name: string; units: number; revenue: number }>();
    postedInvoices.forEach((invoice) => invoice.items.filter((item) => item.type === 'product').forEach((item) => {
      const current = grouped.get(item.description) || { name: item.description, units: 0, revenue: 0 };
      current.units += item.quantity;
      current.revenue += item.total;
      grouped.set(item.description, current);
    }));
    const result = [...grouped.values()].sort((left, right) => right.units - left.units || right.revenue - left.revenue).slice(0, 6);
    const maxUnits = Math.max(...result.map((item) => item.units), 1);
    return result.map((item) => ({ ...item, percent: Math.round((item.units / maxUnits) * 100) }));
  }, [postedInvoices]);

  const localTopServices = useMemo(() => {
    const grouped = new Map<string, { name: string; count: number; revenue: number }>();
    postedInvoices.forEach((invoice) => invoice.items.filter((item) => item.type === 'service').forEach((item) => {
      const current = grouped.get(item.description) || { name: item.description, count: 0, revenue: 0 };
      current.count += item.quantity;
      current.revenue += item.total;
      grouped.set(item.description, current);
    }));
    if (grouped.size === 0) {
      completedAppointments.forEach((appointment) => {
        const current = grouped.get(appointment.serviceName) || { name: appointment.serviceName, count: 0, revenue: 0 };
        current.count += 1;
        current.revenue += appointment.price;
        grouped.set(appointment.serviceName, current);
      });
    }
    return [...grouped.values()].sort((left, right) => right.count - left.count || right.revenue - left.revenue).slice(0, 6);
  }, [completedAppointments, postedInvoices]);

  const localBranchRows = useMemo(() => {
    const locations = selectedBranch === 'Todas las sedes'
      ? branchOptions
      : branchOptions.filter((branch) => branch.name === selectedBranch);
    return locations.map((branch) => {
      const branchInvoices = postedInvoices.filter((invoice) => invoice.branch === branch.name);
      const revenue = branchInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
      return {
        id: branch.id,
        name: branch.name,
        type: branch.type,
        count: branchInvoices.length,
        revenue,
        average: branchInvoices.length ? revenue / branchInvoices.length : 0,
        share: localTotalRevenue ? (revenue / localTotalRevenue) * 100 : 0,
      };
    });
  }, [branchOptions, localTotalRevenue, postedInvoices, selectedBranch]);

  const totalRevenue = isSupabaseConfigured ? Number(remoteReport?.resumen.ingresos || 0) : localTotalRevenue;
  const averageTicket = isSupabaseConfigured ? Number(remoteReport?.resumen.ticket_promedio || 0) : localAverageTicket;
  const productUnits = isSupabaseConfigured ? Number(remoteReport?.resumen.productos_vendidos || 0) : localProductUnits;
  const serviceCount = isSupabaseConfigured ? Number(remoteReport?.resumen.servicios_realizados || 0) : localServiceCount;
  const invoiceCount = isSupabaseConfigured ? Number(remoteReport?.resumen.facturas || 0) : postedInvoices.length;
  const topProducts = isSupabaseConfigured
    ? (remoteReport?.productos || []).map((product, _index, products) => ({
      name: product.nombre,
      units: Number(product.unidades),
      revenue: Number(product.ingresos),
      percent: Math.round((Number(product.unidades) / Math.max(...products.map((item) => Number(item.unidades)), 1)) * 100),
    }))
    : localTopProducts;
  const topServices = isSupabaseConfigured
    ? (remoteReport?.servicios || []).map((service) => ({
      name: service.nombre,
      count: Number(service.cantidad),
      revenue: Number(service.ingresos),
    }))
    : localTopServices;
  const branchRows = isSupabaseConfigured
    ? (remoteReport?.sedes || []).map((branch) => ({
      id: branch.id,
      name: branch.nombre,
      type: branch.tipo,
      count: Number(branch.facturas),
      revenue: Number(branch.ingresos),
      average: Number(branch.ticket_promedio),
      share: totalRevenue ? (Number(branch.ingresos) / totalRevenue) * 100 : 0,
    }))
    : localBranchRows;

  const rangeLabel = `${range.start.toLocaleDateString('es-CO')} – ${range.end.toLocaleDateString('es-CO')}`;

  return (
    <div id="analytics-view" className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl border border-indigo-100 bg-indigo-50"><BarChart3 className="h-5 w-5 text-indigo-600" /></span><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Reportes y analítica</h1></div>
          <p className="mt-1 text-sm text-slate-600">Indicadores calculados desde facturas y citas reales del contexto de sede activo.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <select value={rangePreset} onChange={(event) => setRangePreset(event.target.value as RangePreset)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option><option value="custom">Personalizado</option></select>
            {rangePreset !== 'custom' ? <input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" /> : <><input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /></>}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400"><CalendarDays className="h-3 w-3" />{rangeLabel}</p>
        </div>
      </div>

      {isSupabaseConfigured && reportLoading && <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-700">Actualizando métricas desde Supabase…</p>}
      {isSupabaseConfigured && reportError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{reportError}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Ingresos totales" value={formatCOP(totalRevenue)} note={`${invoiceCount} facturas válidas`} icon={CircleDollarSign} tone="emerald" />
        <MetricCard label="Ticket promedio" value={formatCOP(averageTicket)} note="Promedio por factura" icon={TicketCheck} tone="indigo" />
        <MetricCard label="Productos vendidos" value={productUnits.toLocaleString('es-CO')} note="Unidades facturadas" icon={Package} tone="amber" />
        <MetricCard label="Servicios realizados" value={serviceCount.toLocaleString('es-CO')} note={isSupabaseConfigured ? 'Facturados o completados' : invoicedServiceUnits ? 'Servicios facturados' : 'Citas completadas'} icon={Wrench} tone="blue" />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5"><p className="text-xs font-bold text-slate-500">Margen bruto</p><p className="mt-2 text-lg font-black text-slate-400">No disponible</p><p className="mt-2 text-[10px] leading-relaxed text-slate-500">Los productos ya tienen costo, pero falta definir y registrar el costo real de los servicios. No se muestra una cifra parcial.</p></div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-extrabold text-slate-900">Productos vendidos</h2></div><span className="text-[10px] text-slate-400">Detalle de factura</span></div>
          <div className="mt-4 space-y-4">{topProducts.map((product) => <div key={product.name}><div className="flex items-baseline justify-between gap-3"><p className="truncate text-xs font-bold text-slate-800">{product.name}</p><strong className="shrink-0 text-xs text-indigo-700">{formatCOP(product.revenue)}</strong></div><div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>{product.units} unidades</span><span>{product.percent}% del producto líder</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${product.percent}%` }} /></div></div>)}{topProducts.length === 0 && <EmptyReport text="No hay productos facturados en este periodo." />}</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-extrabold text-slate-900">Servicios con mayor demanda</h2></div><span className="text-[10px] text-slate-400">Mayor a menor</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{topServices.map((service, index) => <div key={service.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold leading-snug text-slate-800">{service.name}</p><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-black text-blue-700">{index + 1}</span></div><p className="mt-2 text-[10px] font-bold text-blue-700">{service.count} servicio{service.count === 1 ? '' : 's'} · {formatCOP(service.revenue)}</p></div>)}{topServices.length === 0 && <div className="sm:col-span-2"><EmptyReport text="No hay servicios facturados ni citas completadas en este periodo." /></div>}</div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-extrabold text-slate-900">Facturas por CD/taller</h2></div><span className="text-[10px] text-slate-400">Catálogo dinámico de sedes activas</span></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-3 py-2">Sede</th><th className="px-3 py-2 text-right">Facturas</th><th className="px-3 py-2 text-right">Ingresos</th><th className="px-3 py-2 text-right">Ticket promedio</th><th className="px-3 py-2">Participación</th></tr></thead><tbody className="divide-y divide-slate-100">{branchRows.map((branch) => <tr key={branch.id} className="hover:bg-slate-50"><td className="px-3 py-3"><p className="font-bold text-slate-800">{branch.name}</p><span className="text-[9px] font-semibold uppercase text-slate-400">{branch.type}</span></td><td className="px-3 py-3 text-right font-bold text-slate-700">{branch.count}</td><td className="px-3 py-3 text-right font-black text-emerald-700">{formatCOP(branch.revenue)}</td><td className="px-3 py-3 text-right font-bold text-slate-700">{formatCOP(branch.average)}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${branch.share}%` }} /></div><span className="w-10 text-right text-[10px] font-bold text-slate-500">{branch.share.toFixed(1)}%</span></div></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
};

const tones = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
};

const MetricCard: React.FC<{ label: string; value: string; note: string; icon: React.ElementType; tone: keyof typeof tones }> = ({ label, value, note, icon: Icon, tone }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-500">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-xl border ${tones[tone]}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-black text-slate-900">{value}</p><p className="mt-1 text-[10px] font-medium text-slate-400">{note}</p></div>;

const EmptyReport: React.FC<{ text: string }> = ({ text }) => <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><div><Receipt className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-xs text-slate-500">{text}</p></div></div>;
