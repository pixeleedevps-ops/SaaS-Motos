import React, { useMemo, useState } from 'react';
import { BriefcaseBusiness, Building2, Mail, Pencil, Phone, Plus, Search, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Employee } from '../../types';

const emptyEmployee = (branch: string): Omit<Employee, 'id' | 'userId'> => ({
  name: '', lastName: '', email: '', phone: '', document: '', role: 'Técnico mecánico',
  branchId: '', branch, hireDate: new Date().toISOString().slice(0, 10), isActive: true,
});

export const EmployeesView: React.FC = () => {
  const { employees, branches, selectedBranch, currentUserRole, createEmployee, updateEmployee, toggleEmployeeStatus } = useApp();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Employee, 'id' | 'userId'>>(emptyEmployee(selectedBranch));
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((employee) => !term || [employee.name, employee.lastName, employee.role, employee.branch, employee.document]
      .some((value) => value.toLowerCase().includes(term)));
  }, [employees, search]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyEmployee(branches.includes(selectedBranch) ? selectedBranch : branches[0] || ''));
    setShowModal(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setDraft({
      name: employee.name, lastName: employee.lastName, email: employee.email, phone: employee.phone,
      document: employee.document, role: employee.role, branchId: employee.branchId, branch: employee.branch,
      hireDate: employee.hireDate, isActive: employee.isActive,
    });
    setShowModal(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const saved = editingId ? await updateEmployee(editingId, draft) : await createEmployee(draft);
    setSaving(false);
    if (saved) setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Catálogo de empleados</h1>
          <p className="text-xs text-gray-600 sm:text-sm">Personal operativo por sede; una cuenta de acceso es opcional.</p>
        </div>
        {currentUserRole === 'admin' && (
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Nuevo empleado
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-[11px] font-bold text-gray-500">TOTAL PERSONAL</p><p className="mt-1 text-2xl font-black text-gray-900">{employees.length}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-[11px] font-bold text-gray-500">ACTIVOS</p><p className="mt-1 text-2xl font-black text-emerald-600">{employees.filter((employee) => employee.isActive).length}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-[11px] font-bold text-gray-500">CON ACCESO AL SISTEMA</p><p className="mt-1 text-2xl font-black text-indigo-600">{employees.filter((employee) => employee.userId).length}</p></div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, cargo, documento o sede…" className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((employee) => (
            <article key={employee.id} className="rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><UserRound className="h-5 w-5" /></div>
                  <div><h2 className="font-bold text-gray-900">{employee.name} {employee.lastName}</h2><p className="text-xs text-gray-500">{employee.role}</p></div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${employee.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{employee.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
              <div className="mt-4 space-y-2 text-xs text-gray-600">
                <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />{employee.branch}</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{employee.email || 'Sin correo'}</p>
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{employee.phone || 'Sin teléfono'}</p>
                <p className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" />{employee.userId ? 'Cuenta vinculada' : 'Solo catálogo'}</p>
              </div>
              {currentUserRole === 'admin' && (
                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
                  <button onClick={() => openEdit(employee)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                  <button onClick={() => void toggleEmployeeStatus(employee.id)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">{employee.isActive ? 'Desactivar' : 'Reactivar'}</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-950/50 p-4 backdrop-blur-xs">
          <form onSubmit={save} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-black text-gray-900">{editingId ? 'Editar empleado' : 'Nuevo empleado'}</h2></div>
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <label className="font-bold text-gray-700">Nombre *<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="font-bold text-gray-700">Apellido<input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="font-bold text-gray-700">Cargo *<input required value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="font-bold text-gray-700">Sede *<select required value={draft.branch} onChange={(event) => setDraft({ ...draft, branch: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-normal">{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
              <label className="font-bold text-gray-700">Correo<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="font-bold text-gray-700">Celular<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="font-bold text-gray-700">Documento<input value={draft.document} onChange={(event) => setDraft({ ...draft, document: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" /></label>
              <label className="font-bold text-gray-700">Fecha de contratación<input type="date" value={draft.hireDate} onChange={(event) => setDraft({ ...draft, hireDate: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4"><button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600">Cancelar</button><button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar empleado'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
};
