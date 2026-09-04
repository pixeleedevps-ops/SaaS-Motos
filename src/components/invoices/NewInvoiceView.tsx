import React, { useEffect, useState } from 'react';
import {
  PlusCircle,
  Trash2,
  Receipt,
  User,
  Bike,
  DollarSign,
  Plus,
  Package,
  Wrench,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceItem } from '../../types';
import { formatCOP } from '../../utils/formatters';

export const NewInvoiceView: React.FC = () => {
  const { customers, products, services, createInvoice, navigateTo, selectedBranch } = useApp();

  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'Tarjeta' | 'Transferencia' | 'Efectivo' | 'Financiación' | 'Nequi / Daviplata'>('Nequi / Daviplata');
  const [invoiceStatus, setInvoiceStatus] = useState<Invoice['status']>('Pagada');
  const [invoiceNotes, setInvoiceNotes] = useState('Garantía de 6 meses en mano de obra y repuestos originales según normativa colombiana.');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedCustomerId && customers[0]) setSelectedCustomerId(customers[0].id);
  }, [customers, selectedCustomerId]);

  // Items in current draft invoice
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: 'Sincronización Electrónica & Inyección',
      type: 'service',
      quantity: 1,
      unitPrice: 180000,
      discountPercent: 0,
      total: 180000,
    },
    {
      id: '2',
      description: 'Aceite Sintético Motul 7100 4T 10W-40 (4L)',
      type: 'product',
      sku: 'MOT-7100-10W40',
      quantity: 1,
      unitPrice: 240000,
      discountPercent: 5,
      total: 228000,
    },
  ]);

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const activeMoto = activeCustomer?.motorcycles[0];

  const handleAddItemFromService = (serviceId: string) => {
    const srv = services.find((s) => s.id === serviceId);
    if (!srv) return;
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      referenceId: srv.id,
      description: srv.name,
      type: 'service',
      quantity: 1,
      unitPrice: srv.price,
      discountPercent: 0,
      total: srv.price,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleAddItemFromProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      referenceId: prod.productId && prod.productId !== prod.id ? prod.id : undefined,
      description: prod.name,
      type: 'product',
      quantity: 1,
      unitPrice: prod.salePrice,
      discountPercent: 0,
      total: prod.salePrice,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      const base = current.quantity * current.unitPrice;
      current.total = base - (base * current.discountPercent) / 100;
      updated[index] = current;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Math
  const subtotal = items.reduce((acc, it) => acc + it.total, 0);
  const taxRate = 19;
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxAmount;

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !activeCustomer) return;
    setSubmitting(true);

    const newId = await createInvoice({
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      customerNIF: activeCustomer.cedula || '1.020.893.412',
      customerEmail: activeCustomer.email,
      customerPhone: activeCustomer.phone,
      customerAddress: `${activeCustomer.address}, ${activeCustomer.city}`,
      motorcyclePlate: activeMoto?.licensePlate || 'UWE-48E',
      motorcycleModel: activeMoto ? `${activeMoto.brand} ${activeMoto.model}` : 'Yamaha MT-07',
      branch: selectedBranch,
      issueDate: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
      dueDate: new Date(Date.now() + 15 * 86400000).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
      employeeName: 'Carlos Mendoza (Caja Principal)',
      items,
      subtotal,
      taxRate,
      taxAmount,
      discountTotal: 0,
      total: grandTotal,
      paymentMethod,
      status: invoiceStatus,
      notes: invoiceNotes,
    });

    setSubmitting(false);
    if (newId) navigateTo('invoices', { invoiceId: newId });
  };

  return (
    <div id="new-invoice-view" className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('invoices')}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Nueva Factura / TPV Taller</h1>
            <p className="text-xs text-gray-600">Confección y liquidación de servicios mecánicos y recambios.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitInvoice} className="space-y-6">
        
        {/* Customer and Vehicle selection banner */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5">
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">
            Datos del Cliente & Vehículo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Cliente *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Motocicleta Asociada</label>
              <input
                type="text"
                disabled
                value={activeMoto ? `${activeMoto.brand} ${activeMoto.model} (${activeMoto.licensePlate})` : 'Sin moto asignada'}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Forma de Pago *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Nequi / Daviplata">Nequi / Daviplata / QR</option>
                <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                <option value="Transferencia">Transferencia Bancolombia / PSE</option>
                <option value="Efectivo">Efectivo en Caja</option>
                <option value="Financiación">Financiación / Crédito</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Estado inicial *</label>
              <select
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value as Invoice['status'])}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Pagada">Pagada</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Borrador">Borrador</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Add Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Add Service Quick Picker */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Wrench className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-900">Añadir Mano de Obra / Servicio</h3>
            </div>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddItemFromService(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="" disabled>Selecciona un servicio para agregar...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (+{formatCOP(s.price)})
                </option>
              ))}
            </select>
          </div>

          {/* Add Product Quick Picker */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-gray-900">Añadir Recambio del Almacén</h3>
            </div>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddItemFromProduct(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="" disabled>Selecciona un producto o recambio...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.currentStock} disponibles) — {formatCOP(p.salePrice)}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4">
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Conceptos a Facturar
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3 w-20">Cant.</th>
                  <th className="py-2.5 px-3 w-32">Precio Ud. ($ COP)</th>
                  <th className="py-2.5 px-3 w-20">Dto. (%)</th>
                  <th className="py-2.5 px-3 w-32 text-right">Total ($ COP)</th>
                  <th className="py-2.5 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 text-center font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent}
                        onChange={(e) => handleUpdateItem(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 text-center text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-gray-900 text-xs">
                      {formatCOP(item.total)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-gray-600 hover:text-rose-600 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="p-8 text-center text-gray-600 text-xs">
              No hay conceptos en la factura. Selecciona servicios o recambios arriba.
            </div>
          )}

          {/* Totals & Notes footer */}
          <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="w-full md:w-1/2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Notas de la factura / Garantía:</label>
              <textarea
                rows={2}
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="w-full md:w-64 space-y-1.5 p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Base):</span>
                <span className="font-semibold text-gray-900">{formatCOP(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA ({taxRate}%):</span>
                <span className="font-semibold text-gray-900">{formatCOP(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-black text-gray-900">
                <span>TOTAL:</span>
                <span className="text-indigo-700">{formatCOP(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigateTo('invoices')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={items.length === 0 || !activeCustomer || submitting}
            className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Guardando…' : 'Emitir Factura Oficial & Cobrar'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
