import React, { Suspense, lazy, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const InventoryView = lazy(() => import('./components/inventory/InventoryView').then((module) => ({ default: module.InventoryView })));
const MoveInventoryView = lazy(() => import('./components/inventory/MoveInventoryView').then((module) => ({ default: module.MoveInventoryView })));
const AttendanceView = lazy(() => import('./components/attendance/AttendanceView').then((module) => ({ default: module.AttendanceView })));
const EmployeesView = lazy(() => import('./components/employees/EmployeesView').then((module) => ({ default: module.EmployeesView })));
const CustomersView = lazy(() => import('./components/customers/CustomersView').then((module) => ({ default: module.CustomersView })));
const VehiclesView = lazy(() => import('./components/vehicles/VehiclesView').then((module) => ({ default: module.VehiclesView })));
const AppointmentsView = lazy(() => import('./components/appointments/AppointmentsView').then((module) => ({ default: module.AppointmentsView })));
const ServicesCatalogView = lazy(() => import('./components/services/ServicesCatalogView').then((module) => ({ default: module.ServicesCatalogView })));
const InvoicesView = lazy(() => import('./components/invoices/InvoicesView').then((module) => ({ default: module.InvoicesView })));
const NewInvoiceView = lazy(() => import('./components/invoices/NewInvoiceView').then((module) => ({ default: module.NewInvoiceView })));
const GarantiasView = lazy(() => import('./components/garantias/GarantiasView').then((module) => ({ default: module.GarantiasView })));
const ActasView = lazy(() => import('./components/actas/ActasView').then((module) => ({ default: module.ActasView })));
const AnalyticsView = lazy(() => import('./components/analytics/AnalyticsView').then((module) => ({ default: module.AnalyticsView })));
const SettingsView = lazy(() => import('./components/settings/SettingsView').then((module) => ({ default: module.SettingsView })));

const MainContent: React.FC = () => {
  const { currentView, currentUserRole } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isSupabaseConfigured && !currentUserRole) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-white">Verificando permisos…</div>;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'inventory':
        return <InventoryView />;
      case 'attendance':
        return <AttendanceView />;
      case 'employees':
        return <EmployeesView />;
      case 'customers':
        return <CustomersView />;
      case 'vehicles':
        return <VehiclesView />;
      case 'move-inventory':
        return <MoveInventoryView />;
      case 'appointments':
        return <AppointmentsView />;
      case 'services':
        return <ServicesCatalogView />;
      case 'invoices':
        return <InvoicesView />;
      case 'new-invoice':
        return <NewInvoiceView />;
      case 'warranties':
        return <GarantiasView />;
      case 'actas':
        return <ActasView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased">
      {/* Sidebar with dark Professional Polish theme */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-12">
            <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500">Cargando módulo…</div>}>
              {renderView()}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Global Toast Alerts */}
      <ToastContainer />
    </div>
  );
};

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return <>{children}</>;
  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Verificando sesión…</div>;
  if (session) return <>{children}</>;

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    if (mode === 'register') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            nombre: firstName.trim(),
            apellido: lastName.trim(),
            telefono: phone.trim(),
            documento: document.trim(),
          },
        },
      });
      if (signUpError) setError(signUpError.message);
      else if (!data.session) setMessage('Cuenta creada. Revisa tu correo para confirmar el acceso.');
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    }
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-950 p-6">
      <form onSubmit={signIn} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl space-y-5">
        <div><p className="text-sm font-bold text-indigo-600">MOTOPRO</p><h1 className="text-2xl font-extrabold text-slate-900">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta de cliente'}</h1><p className="mt-1 text-sm text-slate-500">{mode === 'login' ? 'Accede con tu usuario autorizado de Supabase.' : 'Tu perfil se crea en Supabase con rol cliente.'}</p></div>
        {mode === 'register' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-slate-700">Nombre<input required value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="block text-sm font-semibold text-slate-700">Apellido<input required value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">Teléfono<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="block text-sm font-semibold text-slate-700">Documento / cédula<input required value={document} onChange={(event) => setDocument(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          </>
        )}
        <label className="block text-sm font-semibold text-slate-700">Correo<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-semibold text-slate-700">Contraseña<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        <button disabled={submitting} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-bold text-white disabled:opacity-60">{submitting ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Registrarme'}</button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }} className="w-full text-sm font-semibold text-indigo-600 hover:underline">
          {mode === 'login' ? 'Crear cuenta de cliente' : 'Ya tengo una cuenta'}
        </button>
      </form>
    </main>
  );
};

export default function App() {
  return (
    <AuthGate><AppProvider><MainContent /></AppProvider></AuthGate>
  );
}
