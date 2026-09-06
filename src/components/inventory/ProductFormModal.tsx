import React, { useMemo, useState } from 'react';
import { Boxes, Plus, Trash2, WandSparkles, X } from 'lucide-react';
import { useApp, type CatalogOption } from '../../context/AppContext';
import type { ProductCreationInput, ProductVariantInput } from '../../types';
import { CreatableCombobox } from '../common/CreatableCombobox';

interface ProductFormModalProps {
  onClose: () => void;
}

interface AttributeDraft {
  key: string;
  attribute: CatalogOption | null;
  values: Array<{ key: string; value: CatalogOption | null }>;
}

const createKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 18);

const cartesian = <T,>(groups: T[][]): T[][] => groups.reduce<T[][]>(
  (combinations, group) => combinations.flatMap((combination) => group.map((item) => [...combination, item])),
  [[]],
);

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ onClose }) => {
  const {
    selectedBranch,
    branchOptions,
    productBrands,
    productCategories,
    productAttributes,
    createProductCatalogOption,
    createProduct,
  } = useApp();

  const initialBranch = branchOptions.find((branch) => branch.name === selectedBranch) || branchOptions[0] || null;
  const [kind, setKind] = useState<'simple' | 'variable'>('simple');
  const [name, setName] = useState('');
  const [baseSku, setBaseSku] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [brand, setBrand] = useState<CatalogOption | null>(null);
  const [category, setCategory] = useState<CatalogOption | null>(null);
  const [branchId, setBranchId] = useState(initialBranch?.id || '');
  const [costPrice, setCostPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [warrantyDuration, setWarrantyDuration] = useState<number | ''>('');
  const [warrantyUnit, setWarrantyUnit] = useState<'dias' | 'meses' | 'anios' | ''>('');
  const [simpleStock, setSimpleStock] = useState(0);
  const [simpleMinStock, setSimpleMinStock] = useState(5);
  const [isActive, setIsActive] = useState(true);
  const [attributes, setAttributes] = useState<AttributeDraft[]>([]);
  const [variants, setVariants] = useState<ProductVariantInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedBranchOption = branchOptions.find((branch) => branch.id === branchId) || null;
  const canChooseBranch = selectedBranch === 'Todas las sedes';

  const invalidateVariations = (nextAttributes: AttributeDraft[]) => {
    setAttributes(nextAttributes);
    setVariants([]);
    setError('');
  };

  const addAttribute = () => invalidateVariations([
    ...attributes,
    { key: createKey(), attribute: null, values: [{ key: createKey(), value: null }] },
  ]);

  const updateAttribute = (key: string, option: CatalogOption | null) => invalidateVariations(attributes.map((item) => (
    item.key === key ? { ...item, attribute: option, values: [{ key: createKey(), value: null }] } : item
  )));

  const addValue = (attributeKey: string) => invalidateVariations(attributes.map((item) => (
    item.key === attributeKey
      ? { ...item, values: [...item.values, { key: createKey(), value: null }] }
      : item
  )));

  const updateValue = (attributeKey: string, valueKey: string, option: CatalogOption | null) => invalidateVariations(attributes.map((item) => (
    item.key === attributeKey
      ? { ...item, values: item.values.map((entry) => entry.key === valueKey ? { ...entry, value: option } : entry) }
      : item
  )));

  const removeValue = (attributeKey: string, valueKey: string) => invalidateVariations(attributes.map((item) => (
    item.key === attributeKey
      ? { ...item, values: item.values.filter((entry) => entry.key !== valueKey) }
      : item
  )));

  const generateVariations = () => {
    setError('');
    if (!baseSku.trim()) {
      setError('Escribe el SKU base antes de generar las variaciones.');
      return;
    }
    if (attributes.length === 0) {
      setError('Agrega al menos un atributo para el producto variable.');
      return;
    }

    const attributeIds = attributes.map((item) => item.attribute?.id).filter(Boolean);
    if (attributeIds.length !== attributes.length) {
      setError('Selecciona o crea el nombre de cada atributo.');
      return;
    }
    if (new Set(attributeIds).size !== attributeIds.length) {
      setError('No puedes agregar dos veces el mismo atributo.');
      return;
    }

    const valueGroups = attributes.map((item) => item.values.map((entry) => entry.value).filter(Boolean) as CatalogOption[]);
    if (valueGroups.some((values) => values.length === 0)) {
      setError('Cada atributo debe tener al menos un valor seleccionado.');
      return;
    }
    if (attributes.some((item, index) => new Set(valueGroups[index].map((value) => value.id)).size !== valueGroups[index].length)) {
      setError('Un atributo no puede repetir el mismo valor.');
      return;
    }

    const combinations = cartesian(valueGroups);
    if (combinations.length > 200) {
      setError(`La selección genera ${combinations.length} combinaciones. El máximo permitido es 200.`);
      return;
    }

    setVariants(combinations.map((combination) => {
      const label = combination.map((value, index) => `${attributes[index].attribute?.name}: ${value.name}`).join(' · ');
      const suffix = combination.map((value) => slugify(value.name)).join('-');
      return {
        key: combination.map((value) => value.id).join(':'),
        label,
        sku: `${baseSku.trim().toUpperCase()}-${suffix}`,
        additionalPrice: 0,
        stock: 0,
        minStock: 0,
        isActive: true,
        valueIds: combination.map((value) => value.id),
      };
    }));
  };

  const updateVariant = (key: string, changes: Partial<ProductVariantInput>) => {
    setVariants((current) => current.map((variant) => variant.key === key ? { ...variant, ...changes } : variant));
  };

  const attributeOptions = useMemo(
    () => productAttributes.map(({ id, name }) => ({ id, name })),
    [productAttributes],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!brand || !category || !selectedBranchOption) {
      setError('Selecciona o crea la marca y categoría, y elige una ubicación válida.');
      return;
    }
    if ((warrantyDuration && !warrantyUnit) || (!warrantyDuration && warrantyUnit)) {
      setError('Para configurar garantía debes indicar tanto la duración como la unidad.');
      return;
    }

    const submittedVariants: ProductVariantInput[] = kind === 'simple'
      ? [{
        key: 'simple',
        label: 'Producto simple',
        sku: baseSku.trim(),
        additionalPrice: 0,
        stock: simpleStock,
        minStock: simpleMinStock,
        isActive,
        valueIds: [],
      }]
      : variants;

    if (kind === 'variable' && submittedVariants.length === 0) {
      setError('Genera las variaciones antes de guardar el producto.');
      return;
    }
    const normalizedSkus = submittedVariants.map((variant) => variant.sku.trim().toLocaleLowerCase('es'));
    if (normalizedSkus.some((sku) => !sku) || new Set(normalizedSkus).size !== normalizedSkus.length) {
      setError('Cada variación debe tener un SKU único y no vacío.');
      return;
    }

    const payload: ProductCreationInput = {
      kind,
      name: name.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      baseSku: baseSku.trim(),
      brandId: brand.id,
      brandName: brand.name,
      categoryId: category.id,
      categoryName: category.name,
      branchId: selectedBranchOption.id,
      branchName: selectedBranchOption.name,
      costPrice,
      salePrice,
      warrantyDuration: warrantyDuration || undefined,
      warrantyUnit: warrantyUnit || undefined,
      isActive,
      variants: submittedVariants,
    };

    setIsSaving(true);
    const created = await createProduct(payload);
    setIsSaving(false);
    if (created) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/55 p-2 backdrop-blur-xs sm:p-4">
      <div className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in zoom-in-95">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">Agregar producto</h3>
            <p className="mt-0.5 text-xs text-gray-600">Crea el catálogo, sus variantes y el stock inicial en una sola operación.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Cerrar formulario">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5 text-xs sm:p-6">
          <section>
            <p className="mb-2 font-bold text-gray-800">Tipo de producto *</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['simple', 'Producto simple', 'Un SKU, un precio y un nivel de stock.'],
                ['variable', 'Producto variable', 'Combinaciones independientes de atributos, SKU, precio y stock.'],
              ] as const).map(([value, title, copy]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setKind(value);
                    setError('');
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${kind === value ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="block font-bold text-gray-900">{title}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-gray-600">{copy}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block font-bold text-gray-700">Nombre del producto *</label>
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Casco integral certificado" className="w-full rounded-xl border border-gray-300 px-3 py-2 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block font-bold text-gray-700">SKU base *</label>
              <input required value={baseSku} onChange={(event) => { setBaseSku(event.target.value); if (kind === 'variable') setVariants([]); }} placeholder="Ej. CASCO-X1" className="w-full rounded-xl border border-gray-300 px-3 py-2 font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block font-bold text-gray-700">Sede / ubicación *</label>
              <select required value={branchId} disabled={!canChooseBranch} onChange={(event) => setBranchId(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100">
                <option value="" disabled>Seleccionar ubicación</option>
                {branchOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </div>
            <CreatableCombobox label="Marca" required options={productBrands} value={brand} onChange={setBrand} placeholder="Buscar o escribir una marca" createLabel="Crear marca" onCreate={(value) => createProductCatalogOption('brand', value)} />
            <CreatableCombobox label="Categoría" required options={productCategories} value={category} onChange={setCategory} placeholder="Buscar o escribir una categoría" createLabel="Crear categoría" onCreate={(value) => createProductCatalogOption('category', value)} />
            <div>
              <label className="mb-1 block font-bold text-gray-700">Costo unitario (COP) *</label>
              <input required type="number" min="0" step="1" value={costPrice} onChange={(event) => setCostPrice(Number(event.target.value))} className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block font-bold text-gray-700">Precio base de venta (COP) *</label>
              <input required type="number" min="0" step="1" value={salePrice} onChange={(event) => setSalePrice(Number(event.target.value))} className="w-full rounded-xl border border-gray-300 px-3 py-2 font-bold text-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block font-bold text-gray-700">Descripción</label>
              <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Características, referencia y observaciones" className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block font-bold text-gray-700">Duración de garantía</label>
              <input type="number" min="1" value={warrantyDuration} onChange={(event) => setWarrantyDuration(event.target.value ? Number(event.target.value) : '')} placeholder="Ej. 3" className="w-full rounded-xl border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block font-bold text-gray-700">Unidad de garantía</label>
              <select value={warrantyUnit} onChange={(event) => setWarrantyUnit(event.target.value as typeof warrantyUnit)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2">
                <option value="">Sin garantía</option>
                <option value="dias">Días</option>
                <option value="meses">Meses</option>
                <option value="anios">Años</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block font-bold text-gray-700">URL de imagen</label>
              <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500" />
            </div>
          </section>

          {kind === 'simple' ? (
            <section className="grid gap-4 rounded-2xl border border-gray-200 p-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-gray-700">Stock inicial</label>
                <input type="number" min="0" value={simpleStock} onChange={(event) => setSimpleStock(Number(event.target.value))} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block font-bold text-gray-700">Stock mínimo</label>
                <input type="number" min="0" value={simpleMinStock} onChange={(event) => setSimpleMinStock(Number(event.target.value))} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
              </div>
              <p className="sm:col-span-2 text-[11px] text-gray-500">Internamente se creará una única variante sin atributos para mantener consistente el inventario.</p>
            </section>
          ) : (
            <section className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h4 className="flex items-center gap-2 font-bold text-gray-900"><Boxes className="h-4 w-4 text-indigo-600" /> Atributos reutilizables</h4>
                  <p className="mt-1 text-[11px] text-gray-600">Selecciona valores existentes o créalos aquí; quedarán disponibles para futuros productos.</p>
                </div>
                <button type="button" onClick={addAttribute} className="inline-flex items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 font-bold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">
                  <Plus className="h-3.5 w-3.5" /> Agregar otro atributo
                </button>
              </div>

              {attributes.length === 0 && (
                <div className="rounded-xl border border-dashed border-indigo-200 bg-white p-6 text-center text-gray-600">
                  Empieza agregando un atributo, por ejemplo Color o Talla.
                </div>
              )}

              {attributes.map((item) => {
                const catalogAttribute = productAttributes.find((attribute) => attribute.id === item.attribute?.id);
                return (
                  <div key={item.key} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <CreatableCombobox label="Nombre del atributo" required options={attributeOptions} value={item.attribute} onChange={(option) => updateAttribute(item.key, option)} placeholder="Ej. Color" createLabel="Crear atributo" onCreate={(value) => createProductCatalogOption('attribute', value)} />
                      </div>
                      <button type="button" onClick={() => invalidateVariations(attributes.filter((attribute) => attribute.key !== item.key))} className="mt-5 rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Eliminar atributo">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.attribute && (
                      <div className="mt-4 space-y-3 border-l-2 border-indigo-100 pl-3">
                        {item.values.map((entry, index) => (
                          <div key={entry.key} className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <CreatableCombobox
                                label={`Valor ${index + 1}`}
                                required
                                options={catalogAttribute?.values || []}
                                value={entry.value}
                                onChange={(option) => updateValue(item.key, entry.key, option)}
                                placeholder={`Valor de ${item.attribute?.name}`}
                                createLabel="Crear valor"
                                onCreate={(value) => createProductCatalogOption('attributeValue', value, item.attribute!.id)}
                              />
                            </div>
                            <button type="button" onClick={() => removeValue(item.key, entry.key)} disabled={item.values.length === 1} className="mt-5 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Quitar valor">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addValue(item.key)} className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900">
                          <Plus className="h-3.5 w-3.5" /> Agregar valor
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <button type="button" onClick={generateVariations} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-sm hover:bg-indigo-700 sm:w-auto">
                <WandSparkles className="h-4 w-4" /> Generar variaciones
              </button>

              {variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900">{variants.length} variación{variants.length === 1 ? '' : 'es'} generada{variants.length === 1 ? '' : 's'}</h4>
                    <span className="text-[11px] text-gray-500">Precio final = precio base + adicional</span>
                  </div>
                  {variants.map((variant) => (
                    <div key={variant.key} className={`rounded-xl border bg-white p-3 ${variant.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <strong className="text-gray-900">{variant.label}</strong>
                        <label className="flex items-center gap-2 font-semibold text-gray-600">
                          <input type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(variant.key, { isActive: event.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                          Activa
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">SKU *</label>
                          <input required value={variant.sku} onChange={(event) => updateVariant(variant.key, { sku: event.target.value })} className="w-full rounded-lg border border-gray-300 px-2.5 py-2 font-mono" />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Precio adicional</label>
                          <input type="number" min="0" value={variant.additionalPrice} onChange={(event) => updateVariant(variant.key, { additionalPrice: Number(event.target.value) })} className="w-full rounded-lg border border-gray-300 px-2.5 py-2" />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Stock inicial</label>
                          <input type="number" min="0" value={variant.stock} onChange={(event) => updateVariant(variant.key, { stock: Number(event.target.value) })} className="w-full rounded-lg border border-gray-300 px-2.5 py-2" />
                        </div>
                        <div>
                          <label className="mb-1 block font-bold text-gray-700">Stock mínimo</label>
                          <input type="number" min="0" value={variant.minStock} onChange={(event) => updateVariant(variant.key, { minStock: Number(event.target.value) })} className="w-full rounded-lg border border-gray-300 px-2.5 py-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-semibold text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            Producto activo y disponible para la operación
          </label>

          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-semibold text-rose-700">{error}</div>}

          <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-end gap-3 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
              {isSaving ? 'Guardando en Supabase…' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
