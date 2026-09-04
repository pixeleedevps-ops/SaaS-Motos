import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProductItem } from '../../types';
import { formatCOP } from '../../utils/formatters';

export const InventoryView: React.FC = () => {
  const {
    products,
    createProduct,
    restockProduct,
    selectedBranch,
    branches,
    productBrands,
    productCategories,
    canManageInventory,
  } = useApp();

  const emptyProduct = (): Omit<ProductItem, 'id'> => ({
    sku: '',
    name: '',
    description: '',
    imageUrl: '',
    brand: productBrands[0]?.name || '',
    category: productCategories[0]?.name || '',
    branch: branches.includes(selectedBranch) ? selectedBranch : branches[0] || '',
    isActive: true,
    currentStock: 0,
    minStock: 5,
    maxStock: 10,
    costPrice: 0,
    salePrice: 0,
    location: '',
    lastRestocked: 'Hoy',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'ok'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [restockItem, setRestockItem] = useState<ProductItem | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [isCreating, setIsCreating] = useState(false);

  // New product form state
  const [newProd, setNewProd] = useState<Omit<ProductItem, 'id'>>(emptyProduct);

  const categories = ['Todas', ...new Set([...productCategories.map((category) => category.name), ...products.map((product) => product.category)])];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesStock =
      stockFilter === 'all'
        ? true
        : stockFilter === 'low'
        ? p.currentStock <= p.minStock
        : p.currentStock > p.minStock;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.sku || !newProd.brand || !newProd.category || !newProd.branch) return;
    setIsCreating(true);
    const created = await createProduct({ ...newProd, location: newProd.branch });
    setIsCreating(false);
    if (!created) return;
    setShowAddModal(false);
    setNewProd(emptyProduct());
  };

  const handleConfirmRestock = () => {
    if (restockItem) {
      restockProduct(restockItem.id, restockQty);
      setRestockItem(null);
    }
  };

  return (
    <div id="inventory-view" className="space-y-6">
      
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Control de inventarios</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Control de stock, lubricantes, consumibles y piezas de recambio para motocicletas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewProd(emptyProduct());
              setShowAddModal(true);
            }}
            disabled={!canManageInventory}
            title={!canManageInventory ? 'Solo administradores y empleados pueden añadir productos' : undefined}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Producto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, marca o SKU (ej. Motul, Brembo, DID)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Stock Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                stockFilter === 'low'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Stock Bajo ({products.filter((p) => p.currentStock <= p.minStock).length})</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
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

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-200/80 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Producto & SKU</th>
                <th className="py-3.5 px-4">Categoría & Marca</th>
                <th className="py-3.5 px-4">Nivel de Stock</th>
                <th className="py-3.5 px-4">Coste / PVP</th>
                <th className="py-3.5 px-4">Ubicación</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((prod) => {
                const stockPercent = Math.min(100, Math.round((prod.currentStock / prod.maxStock) * 100));
                const isLow = prod.currentStock <= prod.minStock;
                const margin = (((prod.salePrice - prod.costPrice) / prod.salePrice) * 100).toFixed(0);

                return (
                  <tr key={prod.id} className="hover:bg-gray-50/60 transition-colors">
                    
                    {/* Name & SKU */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{prod.name}</div>
                      <div className="text-[11px] font-mono text-gray-600 mt-0.5">{prod.sku}</div>
                    </td>

                    {/* Category & Brand */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                        {prod.category}
                      </span>
                      <div className="text-[11px] text-gray-600 mt-0.5 font-semibold">{prod.brand}</div>
                    </td>

                    {/* Stock Bar */}
                    <td className="py-3.5 px-4 min-w-[160px]">
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                        <span className={isLow ? 'text-rose-600' : 'text-gray-900'}>
                          {prod.currentStock} uds
                        </span>
                        <span className="text-gray-600 font-normal">Máx: {prod.maxStock}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          style={{ width: `${stockPercent}%` }}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isLow ? 'bg-rose-500' : stockPercent > 70 ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                        />
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">Mínimo requerido: {prod.minStock}</div>
                    </td>

                    {/* Prices */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 text-sm">{formatCOP(prod.salePrice)}</div>
                      <div className="text-[11px] text-gray-600">
                        Coste: {formatCOP(prod.costPrice)} ({margin}% mg)
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-800">{prod.branch}</div>
                      <div className="text-[10px] text-gray-600">Sede asignada al producto</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          Stock Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Disponible
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setRestockItem(prod)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors"
                      >
                        Reponer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-900">No se encontraron artículos</h3>
            <p className="text-xs text-gray-600 mt-1">Prueba ajustando los filtros de búsqueda o categoría.</p>
          </div>
        )}
      </div>

      {/* Modal: Añadir Producto */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Añadir Nuevo Recambio o Producto</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-600 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Código SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. MOT-7100-10W40"
                    value={newProd.sku}
                    onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Marca Fabricante *</label>
                  <select
                    required
                    value={newProd.brand}
                    onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="" disabled>Seleccionar marca</option>
                    {productBrands.map((brand) => <option key={brand.id} value={brand.name}>{brand.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Características, referencia y observaciones del producto"
                  value={newProd.description || ''}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  className="w-full resize-none px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nombre Descriptivo del Artículo *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Aceite Sintético Motul 7100 4T 10W-40 (4L)"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoría</label>
                  <select
                    required
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="" disabled>Seleccionar categoría</option>
                    {productCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sede / Ubicación *</label>
                  <select
                    required
                    value={newProd.branch}
                    onChange={(e) => setNewProd({ ...newProd, branch: e.target.value, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="" disabled>Seleccionar sede</option>
                    {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={newProd.currentStock}
                    onChange={(e) => setNewProd({ ...newProd, currentStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="1"
                    value={newProd.minStock}
                    onChange={(e) => setNewProd({ ...newProd, minStock: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Precio Costo Proveedor ($ COP)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={newProd.costPrice}
                    onChange={(e) => setNewProd({ ...newProd, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">PVP Venta al Público ($ COP)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={newProd.salePrice}
                    onChange={(e) => setNewProd({ ...newProd, salePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">URL de imagen</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newProd.imageUrl || ''}
                  onChange={(e) => setNewProd({ ...newProd, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={newProd.isActive !== false}
                  onChange={(e) => setNewProd({ ...newProd, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Producto activo y disponible para la operación
              </label>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {isCreating ? 'Guardando en Supabase…' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reponer Stock */}
      {restockItem && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Entrada de Mercancía / Reposición</h3>
              <button onClick={() => setRestockItem(null)} className="text-gray-600 hover:text-gray-600">✕</button>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-600">Producto seleccionado:</p>
              <p className="text-sm font-bold text-gray-900">{restockItem.name}</p>
              <div className="text-xs text-gray-600 font-mono mt-0.5">SKU: {restockItem.sku}</div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 my-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-gray-600">Stock Actual:</span>
                  <p className="text-base font-extrabold text-gray-900">{restockItem.currentStock} uds</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-gray-600">Stock Máximo:</span>
                  <p className="text-base font-extrabold text-gray-900">{restockItem.maxStock} uds</p>
                </div>
              </div>

              <label className="block text-xs font-bold text-gray-700 mb-1">
                Unidades a ingresar al taller:
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={restockQty}
                onChange={(e) => setRestockQty(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setRestockItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRestock}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
              >
                Confirmar Reposición (+{restockQty} uds)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
