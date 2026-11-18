import React, { useState } from 'react';
import { CalendarDays, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLocalDateString } from '../lib/dateUtils';
import { Appointment } from '../types/medimitra';

export const AppointmentsPage: React.FC = () => {
  const { appointments, saveAppointment, deleteAppointment, canCurrentUserEditPatient, t } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => getLocalDateString());
  const [appointmentTime, setAppointmentTime] = useState('10:30');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [status, setStatus] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [notes, setNotes] = useState('');
  const [reportSummary, setReportSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setDoctorName('');
    setSpecialty('General Medicine');
    setClinicName('');
    setAppointmentDate(getLocalDateString());
    setAppointmentTime('10:30');
    setReminderEnabled(true);
    setStatus('upcoming');
    setNotes('');
    setReportSummary('');
    setModalOpen(true);
  };

  const openEdit = (apt: Appointment) => {
    setEditing(apt);
    setDoctorName(apt.doctorName);
    setSpecialty(apt.specialty);
    setClinicName(apt.clinicName);
    setAppointmentDate(apt.appointmentDate);
    setAppointmentTime(apt.appointmentTime);
    setReminderEnabled(apt.reminderEnabled);
    setStatus(apt.status);
    setNotes(apt.notes || '');
    setReportSummary(apt.reportSummary || '');
    setModalOpen(true);
  };

  const handleReportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setReportSummary(String(reader.result || '').slice(0, 1200));
      };
      reader.readAsText(file);
    } else {
      setReportSummary((prev) =>
        `${prev ? `${prev}\n` : ''}Attached Report Reference: ${file.name} (${Math.round(file.size / 1024)} KB, uploaded ${new Date().toLocaleDateString()})`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim() || !clinicName.trim()) return;
    setSaving(true);
    try {
      await saveAppointment({
        id: editing?.id,
        doctorName,
        specialty,
        clinicName,
        appointmentDate,
        appointmentTime,
        reminderEnabled,
        status,
        notes,
        reportSummary,
      });
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...appointments].sort((a, b) =>
    a.appointmentDate.localeCompare(b.appointmentDate)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-teal-600" />
            <span>{t.nav.appointments}</span>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Keep track of clinic visits, consultation notes, and lab report summaries.
          </p>
        </div>

        {canCurrentUserEditPatient && (
          <button
            type="button"
            onClick={openAdd}
            className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Add Appointment
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center text-sm text-slate-500">
          No doctor appointments added yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((apt) => (
            <div
              key={apt.id}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 tabular-nums">
                    {apt.appointmentDate} · {apt.appointmentTime} · {apt.status.toUpperCase()}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {apt.doctorName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {apt.specialty} · {apt.clinicName}
                  </p>
                </div>

                {canCurrentUserEditPatient && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(apt)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAppointment(apt.id)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {apt.notes && (
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <strong>Notes:</strong> {apt.notes}
                </p>
              )}
              {apt.reportSummary && (
                <p className="text-xs text-sky-900 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/40 p-3 rounded-xl">
                  <strong>Reports:</strong> {apt.reportSummary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Appointment' : 'Schedule Doctor Appointment'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Dr. Kavitha Deshmukh"
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Specialty</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="General Medicine / Cardiology"
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Clinic / Hospital *</label>
                <input
                  type="text"
                  required
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Jayanagar Senior Care Clinic"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'upcoming' | 'completed' | 'cancelled')}
                    className="w-full min-h-[42px] px-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Consultation Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Questions for doctor, recent symptoms, or follow-up instructions..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Lab / Report Summary (or attach file reference)
                </label>
                <textarea
                  rows={2}
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  placeholder="e.g., HbA1c 7.1%, Lipid profile normal"
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
                <input
                  type="file"
                  onChange={handleReportFile}
                  className="mt-1.5 text-xs text-slate-600 dark:text-slate-300"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-4 h-4 accent-teal-600"
                />
                <span>Enable appointment reminder</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
