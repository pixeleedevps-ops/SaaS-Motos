import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { InventoryView } from './components/inventory/InventoryView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { CustomersView } from './components/customers/CustomersView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { ServicesCatalogView } from './components/services/ServicesCatalogView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { NewInvoiceView } from './components/invoices/NewInvoiceView';
import { GarantiasView } from './components/garantias/GarantiasView';
import { ActasView } from './components/actas/ActasView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const MainContent: React.FC = () => {
  const { currentView } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'inventory':
        return <InventoryView />;
      case 'attendance':
        return <AttendanceView />;
      case 'customers':
        return <CustomersView />;
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
            {renderView()}
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
  const [error, setError] = useState('');
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-950 p-6">
      <form onSubmit={signIn} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl space-y-5">
        <div><p className="text-sm font-bold text-indigo-600">MOTOPRO</p><h1 className="text-2xl font-extrabold text-slate-900">Iniciar sesión</h1><p className="mt-1 text-sm text-slate-500">Accede con tu usuario autorizado de Supabase.</p></div>
        <label className="block text-sm font-semibold text-slate-700">Correo<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-semibold text-slate-700">Contraseña<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button disabled={submitting} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-bold text-white disabled:opacity-60">{submitting ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </main>
  );
};

export default function App() {
  return (
    <AuthGate><AppProvider><MainContent /></AppProvider></AuthGate>
  );
}
