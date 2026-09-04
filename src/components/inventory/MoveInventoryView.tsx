import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, LockKeyhole, MapPin, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCOP } from '../../utils/formatters';

export const MoveInventoryView: React.FC = () => {
  const { products, branches, currentUserRole, canManageInventory, moveProductToBranch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const productRows = useMemo(() => {
    const uniqueProducts = new Map<string, (typeof products)[number]>();
    products.forEach((product) => {
      const productId = product.productId || product.id;
      if (!uniqueProducts.has(productId)) uniqueProducts.set(productId, product);
    });
    const query = searchQuery.trim().toLocaleLowerCase('es');
    return [...uniqueProducts.values()].filter((product) =>
      !query || product.name.toLocaleLowerCase('es').includes(query) || product.category.toLocaleLowerCase('es').includes(query)
    );
  }, [products, searchQuery]);

  const handleLocationChange = async (productId: string, branch: string) => {
    setSavingProductId(productId);
    await moveProductToBranch(productId, branch);
    setSavingProductId(null);
  };

  return (
    <div id="move-inventory-view" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Traslado entre sedes
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Mover inventario</h1>
          <p className="mt-1 text-sm text-gray-600">Cambia la sede asignada a cada producto.</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${canManageInventory ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {canManageInventory ? <CheckCircle2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
          {canManageInventory ? `Perfil autorizado: ${currentUserRole}` : 'Solo administradores y empleados pueden mover inventario'}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
        <div className="relative max-w-lg">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por producto o categoría..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-xs outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-5 py-4">Producto</th>
                <th className="px-5 py-4">Categoría</th>
                <th className="px-5 py-4">Costo</th>
                <th className="px-5 py-4">Ubicación</th>
                <th className="px-5 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productRows.map((product) => {
                const productId = product.productId || product.id;
                const isSaving = savingProductId === productId;
                return (
                  <tr key={productId} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-5 py-4 font-bold text-gray-900">{product.name}</td>
                    <td className="px-5 py-4 text-gray-700">{product.category || 'Sin categoría'}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">
                      {product.costPrice > 0 ? formatCOP(product.costPrice) : 'Sin registrar'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative min-w-[190px]">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
                        <select
                          aria-label={`Ubicación de ${product.name}`}
                          value={product.branch}
                          disabled={!canManageInventory || isSaving}
                          onChange={(event) => void handleLocationChange(productId, event.target.value)}
                          className="w-full appearance-none rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-8 font-semibold text-gray-800 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          {!branches.includes(product.branch) && <option value={product.branch}>{product.branch}</option>}
                          {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                        </select>
                        {isSaving && <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600">Guardando…</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${product.isActive !== false ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-600'}`}>
                        {product.isActive !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {productRows.length === 0 && <div className="p-12 text-center text-sm text-gray-500">No hay productos que coincidan con la búsqueda.</div>}
      </div>
    </div>
  );
};
