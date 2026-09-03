import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  Download,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  DollarSign,
  ChevronRight,
  Eye,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { formatCOP } from '../../utils/formatters';

export const InvoicesView: React.FC = () => {
  const { invoices, selectedInvoice, setSelectedInvoice, navigateTo } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todas');
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(selectedInvoice || invoices[0] || null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.motorcyclePlate && inv.motorcyclePlate.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'Todas' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalFacturado = invoices.reduce((acc, i) => (i.status === 'Pagada' ? acc + i.total : acc), 0);
  const totalPendiente = invoices.reduce((acc, i) => (i.status === 'Pendiente' ? acc + i.total : acc), 0);

  return (
    <div id="invoices-view" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Historial de Facturación & Cobros</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Emisión de facturas oficiales, liquidación con IVA desglosado y registro de cobros.
          </p>
        </div>
        <button
          onClick={() => navigateTo('new-invoice')}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Factura / TPV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-gray-600">Total Cobrado (Mes)</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatCOP(totalFacturado)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-gray-600">Pendiente de Cobro</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatCOP(totalPendiente)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-gray-600">Facturas Emitidas</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{invoices.length} documentos</p>
        </div>
      </div>

      {/* Main Grid: Invoices List & Invoice Paper Document Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Invoices List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar factura o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['Todas', 'Pagada', 'Pendiente'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === st ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredInvoices.map((inv) => {
              const isSelected = activeInvoice?.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => setActiveInvoice(inv)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                      : 'bg-white hover:bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-700">{inv.invoiceNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'Pagada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-xs mt-1">{inv.customerName}</p>
                      <p className="text-[11px] text-gray-600">{inv.motorcycleModel || 'Servicio taller'}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-gray-900 text-sm">{formatCOP(inv.total)}</span>
                      <span className="block text-[10px] text-gray-600 mt-0.5">{inv.issueDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Invoice Paper Sheet Preview (7 cols) */}
        {activeInvoice ? (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 shadow-md p-6 sm:p-8 space-y-6">
            
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 no-print">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Visor de Factura Oficial
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
              </div>
            </div>

            {/* Invoice Printable Sheet */}
            <div className="space-y-6 text-xs">
              
              {/* Company & Invoice meta Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                      M
                    </div>
                    <span className="font-extrabold text-lg text-gray-900">MotoPro Colombia S.A.S.</span>
                  </div>
                  <p className="text-gray-600 mt-1">NIT: 901.482.910-3</p>
                  <p className="text-gray-600">Cra 15 # 85-32, Chapinero, Bogotá D.C.</p>
                  <p className="text-gray-600">Taller Autorizado Multimarca</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-black text-gray-900">{activeInvoice.invoiceNumber}</span>
                  <p className="text-gray-600 mt-1">Fecha Emisión: {activeInvoice.issueDate}</p>
                  <p className="text-gray-600">Vencimiento: {activeInvoice.dueDate}</p>
                  <span
                    className={`inline-block mt-2 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                      activeInvoice.status === 'Pagada'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    ESTADO: {activeInvoice.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Client & Vehicle Details Box */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-600">Facturar a:</span>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{activeInvoice.customerName}</p>
                  <p className="text-gray-600">{activeInvoice.customerAddress}</p>
                  <p className="text-gray-600">Cédula / NIT: {activeInvoice.customerNIF}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-600">Vehículo & Pago:</span>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {activeInvoice.motorcycleModel || 'Mantenimiento General'}
                  </p>
                  <p className="font-mono text-indigo-700 font-bold">{activeInvoice.motorcyclePlate}</p>
                  <p className="text-gray-600">Método de Pago: {activeInvoice.paymentMethod}</p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Concepto / Recambio</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">Precio Ud.</th>
                      <th className="py-2.5 px-3 text-right">Dto.</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{item.description}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right">{formatCOP(item.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-600">
                          {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatCOP(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Base Imponible:</span>
                    <span className="font-semibold text-gray-900">{formatCOP(activeInvoice.subtotal)}</span>
                  </div>
                  {activeInvoice.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Descuento aplicado:</span>
                      <span className="font-semibold">-{formatCOP(activeInvoice.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>IVA ({activeInvoice.taxRate}%):</span>
                    <span className="font-semibold text-gray-900">{formatCOP(activeInvoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-black text-gray-900">
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-indigo-700">{formatCOP(activeInvoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Notes */}
              {activeInvoice.notes && (
                <div className="p-3 rounded-lg bg-gray-50 text-[11px] text-gray-600 border border-gray-100">
                  <span className="font-bold text-gray-700">Condiciones de Garantía: </span>
                  {activeInvoice.notes}
                </div>
              )}

            </div>

          </div>
        ) : null}

      </div>

    </div>
  );
};
