import React, { useState, useEffect } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  UserCheck,
  Calendar,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AttendanceView: React.FC = () => {
  const { attendance, recordAttendance, selectedBranch } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchEmployee, setSearchEmployee] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual record state
  const [manualName, setManualName] = useState('David Morales');
  const [manualTime, setManualTime] = useState('08:00');
  const [manualType, setManualType] = useState<'Entrada' | 'Salida'>('Entrada');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formattedDate = currentTime.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const filteredAttendance = attendance.filter((rec) =>
    rec.employeeName.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    rec.employeeRole.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const activeCount = attendance.filter((a) => a.status === 'En Turno').length;
  const lateCount = attendance.filter((a) => a.status === 'Retraso').length;

  return (
    <div id="attendance-view" className="space-y-6">
      
      {/* Top Banner with Real-time Clock & Direct Punch Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Left: Clock Display */}
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Terminal de Fichaje & Presencia
            </div>
            <div className="font-mono text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white flex items-baseline gap-2">
              <span>{formattedTime}</span>
              <span className="text-sm font-sans font-bold text-indigo-300">COT (GMT-5)</span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-200 mt-2 font-medium capitalize">
              {formattedDate} • {selectedBranch}
            </p>
          </div>

          {/* Right: Direct Punch Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              id="punch-in-btn"
              onClick={() => recordAttendance('checkIn')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2.5"
            >
              <LogIn className="w-5 h-5" />
              <span>Registrar Entrada</span>
            </button>
            <button
              id="punch-out-btn"
              onClick={() => recordAttendance('checkOut')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 font-extrabold text-sm transition-all flex items-center justify-center gap-2.5"
            >
              <LogOut className="w-5 h-5 text-rose-400" />
              <span>Registrar Salida</span>
            </button>
          </div>

        </div>

        {/* Quick summary stats pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Personal en Turno Activo</span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{activeCount} mecánicos</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Incidencias / Retrasos</span>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{lateCount} registros</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Puntualidad del Día</span>
            <p className="text-xl font-bold text-indigo-300 mt-0.5">94.2%</p>
          </div>
        </div>
      </div>

      {/* Attendance History Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4">
        
        {/* Controls header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Registro Diario de Fichajes</h2>
            <p className="text-xs text-gray-600">Histórico de entradas, salidas y turnos del equipo técnico</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar mecánico..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajuste Manual</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Empleado</th>
                <th className="py-3 px-3">Turno / Horario</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Hora Entrada</th>
                <th className="py-3 px-3">Hora Salida</th>
                <th className="py-3 px-3">Horas Computadas</th>
                <th className="py-3 px-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAttendance.map((rec) => {
                const statusBadges = {
                  'En Turno': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  Retraso: 'bg-amber-50 text-amber-700 border-amber-200',
                  Fuera: 'bg-gray-100 text-gray-700 border-gray-200',
                  Pausa: 'bg-blue-50 text-blue-700 border-blue-200',
                };

                return (
                  <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            rec.avatar ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={rec.employeeName}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{rec.employeeName}</p>
                          <p className="text-[11px] text-gray-600">{rec.employeeRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-700">{rec.shift}</td>
                    <td className="py-3 px-3 text-gray-600 font-medium">{rec.date}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                      {rec.checkIn}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-700">
                      {rec.checkOut || '—'}
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-800">
                      {rec.totalHoursWorked ? `${rec.totalHoursWorked} hrs` : 'En cómputo'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          statusBadges[rec.status]
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Manual Entry Adjustment Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Registro Manual de Asistencia</h3>
              <button onClick={() => setShowManualModal(false)} className="text-gray-600 hover:text-gray-600">✕</button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Empleado</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipo</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Entrada">Entrada</option>
                    <option value="Salida">Salida</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hora (HH:MM)</label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Motivo del ajuste</label>
                <textarea
                  rows={2}
                  placeholder="ej. Olvido de fichaje por atención urgente a cliente en recepción."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  recordAttendance(manualType === 'Entrada' ? 'checkIn' : 'checkOut', manualName);
                  setShowManualModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Guardar Registro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
