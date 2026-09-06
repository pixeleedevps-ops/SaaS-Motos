import React, { useMemo, useState } from 'react';
import {
  Bike,
  CalendarClock,
  Gauge,
  Hash,
  Pencil,
  Search,
  ShieldAlert,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const VehiclesView: React.FC = () => {
  const {
    customers,
    appointments,
    currentUserRole,
    navigateTo,
    updateMotorcycle,
    deleteMotorcycle,
  } = useApp();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{
    customerId: string;
    id: string;
    brand: string;
    model: string;
    plate: string;
    year: number;
  } | null>(null);

  const canView = currentUserRole === 'admin' || currentUserRole === 'mecanico';
  const canEdit = currentUserRole === 'admin';
  const vehicles = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return customers
      .flatMap((customer) => customer.motorcycles.map((motorcycle) => ({
        customer,
        motorcycle,
        appointmentCount: appointments.filter((appointment) => appointment.motorcycleId === motorcycle.id).length,
      })))
      .filter(({ customer, motorcycle }) => !term || [
        customer.name,
        motorcycle.brand,
        motorcycle.model,
        motorcycle.licensePlate,
        motorcycle.year,
      ].join(' ').toLocaleLowerCase('es').includes(term))
      .sort((left, right) => `${left.motorcycle.brand} ${left.motorcycle.model}`.localeCompare(`${right.motorcycle.brand} ${right.motorcycle.model}`, 'es'));
  }, [appointments, customers, search]);

  if (!canView) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50"><ShieldAlert className="h-7 w-7 text-rose-500" /></div>
          <h1 className="mt-4 text-lg font-extrabold text-slate-900">Acceso restringido</h1>
          <p className="mt-1 text-sm text-slate-500">La vista consolidada de vehículos está disponible únicamente para administración y mecánicos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-indigo-100 bg-indigo-50"><Bike className="h-5 w-5 text-indigo-600" /></span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Todos los vehículos</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">Flota de clientes registrada en Supabase y su actividad de taller.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Marca, modelo, placa o cliente" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <span><strong className="text-slate-900">{vehicles.length}</strong> vehículos encontrados</span>
        <span className="font-semibold text-indigo-600">Fuente: clientes y motos activas</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {vehicles.map(({ customer, motorcycle, appointmentCount }) => (
          <article key={motorcycle.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
            <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 text-white">
              <div className="absolute -right-4 -top-5 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">{motorcycle.brand || 'Motocicleta'}</p>
                  <h2 className="mt-1 truncate text-lg font-black">{motorcycle.model || 'Modelo sin registrar'}</h2>
                  <p className="mt-1 text-xs text-slate-300">Año {motorcycle.year || '—'}</p>
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10"><Bike className="h-6 w-6 text-indigo-200" /></div>
              </div>
              <span className="relative mt-4 inline-flex rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 font-mono text-sm font-black tracking-wider">{motorcycle.licensePlate || 'SIN PLACA'}</span>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-slate-400"><Gauge className="h-3.5 w-3.5" />Kilometraje</div><p className="mt-1 font-bold text-slate-800">{motorcycle.mileage ? `${motorcycle.mileage.toLocaleString('es-CO')} km` : 'No registrado'}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-slate-400"><Hash className="h-3.5 w-3.5" />Cilindraje</div><p className="mt-1 font-bold text-slate-800">{motorcycle.cylinderCapacity || 'No registrado'}</p></div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">{customer.name.split(' ').slice(0, 2).map((name) => name[0]).join('').toUpperCase()}</div>
                <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase text-slate-400">Propietario</p><p className="truncate text-xs font-bold text-slate-800">{customer.name}</p></div>
                <User className="h-4 w-4 text-slate-300" />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => navigateTo('customers', { customerId: customer.id })} className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"><CalendarClock className="h-3.5 w-3.5" />Historial ({appointmentCount})</button>
                {canEdit && <><button type="button" onClick={() => setEditing({ customerId: customer.id, id: motorcycle.id, brand: motorcycle.brand, model: motorcycle.model, plate: motorcycle.licensePlate, year: motorcycle.year })} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-indigo-600" aria-label={`Editar ${motorcycle.licensePlate}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void deleteMotorcycle(customer.id, motorcycle.id)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" aria-label={`Desactivar ${motorcycle.licensePlate}`}><Trash2 className="h-4 w-4" /></button></>}
              </div>
            </div>
          </article>
        ))}
      </div>

      {vehicles.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Bike className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">No se encontraron vehículos</p><p className="mt-1 text-xs text-slate-500">Ajusta la búsqueda o registra una moto desde la ficha del cliente.</p></div>}

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl" onSubmit={async (event) => { event.preventDefault(); await updateMotorcycle(editing.customerId, editing.id, { brand: editing.brand, model: editing.model, licensePlate: editing.plate, year: editing.year }); setEditing(null); }}><div className="flex items-center justify-between"><div><h2 className="font-extrabold text-slate-900">Editar motocicleta</h2><p className="text-xs text-slate-500">Actualiza los datos principales del vehículo.</p></div><button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X className="h-4 w-4" /></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Marca<input className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-normal text-slate-900" value={editing.brand} onChange={(event) => setEditing({ ...editing, brand: event.target.value })} required /></label><label className="text-xs font-bold text-slate-600">Modelo<input className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-normal text-slate-900" value={editing.model} onChange={(event) => setEditing({ ...editing, model: event.target.value })} required /></label><label className="text-xs font-bold text-slate-600">Placa<input className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-mono font-normal uppercase text-slate-900" value={editing.plate} onChange={(event) => setEditing({ ...editing, plate: event.target.value.toUpperCase() })} required /></label><label className="text-xs font-bold text-slate-600">Año<input type="number" min="1900" max={new Date().getFullYear() + 1} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-normal text-slate-900" value={editing.year} onChange={(event) => setEditing({ ...editing, year: Number(event.target.value) })} /></label></div><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setEditing(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancelar</button><button className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">Guardar cambios</button></div></form></div>}
    </div>
  );
};
