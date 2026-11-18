import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Download, Edit2, History, Lock, X, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLocalDateString } from '../lib/dateUtils';
import { exportHealthReportPDF } from '../lib/pdfReport';
import { DoseStatus, MedicationLog } from '../types/medimitra';

export const HistoryPage: React.FC = () => {
  const {
    patientProfile,
    medicines,
    logs,
    readings,
    appointments,
    auditLogs,
    canCurrentUserEditPatient,
    activeCaregiverPermissions,
    correctMedicationLog,
    isDemoMode,
    t,
  } = useApp();

  const canViewLogs = activeCaregiverPermissions ? activeCaregiverPermissions.canViewLogs : true;
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDay, setSelectedDay] = useState<string>(() => getLocalDateString());
  const [editingLog, setEditingLog] = useState<MedicationLog | null>(null);
  const [newStatus, setNewStatus] = useState<DoseStatus>('taken');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    const cutoffDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const cutoff = new Date(now.getTime() - cutoffDays * 86400000);
    return [...logs]
      .filter((l) => {
        const d = new Date(l.scheduledFor);
        return !Number.isNaN(d.getTime()) ? d >= cutoff : true;
      })
      .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor));
  }, [logs, period]);

  const takenCount = filteredLogs.filter((l) => l.status === 'taken').length;
  const missedCount = filteredLogs.filter((l) => l.status === 'missed').length;
  const snoozedCount = filteredLogs.filter((l) => l.status === 'snoozed').length;
  const adherencePercent =
    filteredLogs.length > 0 ? Math.round((takenCount / filteredLogs.length) * 100) : 100;

  // 14-day calendar grid
  const calendarDays = useMemo(() => {
    const days: Array<{ date: string; label: string; taken: number; missed: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayLogs = logs.filter((l) => l.scheduledFor.startsWith(dateStr));
      days.push({
        date: dateStr,
        label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
        taken: dayLogs.filter((l) => l.status === 'taken').length,
        missed: dayLogs.filter((l) => l.status === 'missed').length,
      });
    }
    return days;
  }, [logs]);

  const selectedDayLogs = logs.filter((l) => l.scheduledFor.startsWith(selectedDay));

  const handleDownloadCsv = () => {
    const rows = [
      ['Scheduled For', 'Medicine', 'Dosage', 'Status', 'Snooze Count', 'Escalated', 'Correction Reason'],
      ...filteredLogs.map((l) => [
        l.scheduledFor,
        l.medicineName,
        l.dosage,
        l.status,
        String(l.snoozeCount),
        l.escalatedToCaregiver ? 'Yes' : 'No',
        l.correctionReason || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediMitra_Medication_History_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (!patientProfile) return;
    exportHealthReportPDF({
      profile: patientProfile,
      periodLabel: period.toUpperCase(),
      adherencePercent,
      takenCount,
      missedCount,
      snoozedCount,
      medicines,
      logs: filteredLogs,
      bpReadings: readings.filter((r) => r.type === 'bp'),
      glucoseReadings: readings.filter((r) => r.type === 'glucose'),
      appointments,
      isDemo: isDemoMode,
    });
  };

  const submitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !reason.trim()) return;
    setSaving(true);
    try {
      await correctMedicationLog(editingLog, newStatus, reason);
      setEditingLog(null);
      setReason('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.nav.history}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Review adherence logs, inspect daily calendar history, or correct an entry with an audit trail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer ${
                  period === p
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            PDF Report
          </button>
        </div>
      </div>

      {!canViewLogs && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 flex items-center gap-3 text-sm text-amber-900 dark:text-amber-200">
          <Lock className="w-5 h-5 shrink-0" />
          <span>
            The patient&apos;s privacy settings currently restrict medication adherence logs from caregiver view.
          </span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-500">Adherence ({period})</p>
          <p className="mt-1 text-2xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
            {adherencePercent}%
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-500">Taken</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {takenCount}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-500">Snoozed</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
            {snoozedCount}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-500">Missed</p>
          <p className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-300 tabular-nums">
            {missedCount}
          </p>
        </div>
      </div>

      {/* 14-Day Calendar Strip */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white mb-4">
          <Calendar className="w-5 h-5 text-teal-600" />
          <span>Calendar View (Last 14 Days)</span>
        </div>
        <div className="grid grid-cols-7 lg:grid-cols-14 gap-2">
          {calendarDays.map((day) => {
            const active = selectedDay === day.date;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDay(day.date)}
                className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                  active
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : day.missed > 0
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-slate-800 dark:text-slate-200'
                      : day.taken > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-slate-800 dark:text-slate-200'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="text-[10px] font-semibold opacity-80">{day.label.split(' ')[0]}</div>
                <div className="text-sm font-bold tabular-nums">{day.date.slice(8)}</div>
                <div className="text-[10px] tabular-nums mt-0.5">
                  {day.taken}✓ {day.missed > 0 ? `${day.missed}✕` : ''}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
            Logs for {selectedDay}:
          </p>
          {selectedDayLogs.length === 0 ? (
            <p className="text-xs text-slate-500">No logged doses on {selectedDay}.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedDayLogs.map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{l.medicineName}</span>{' '}
                    <span className="text-slate-500">({l.dosage})</span>
                    <div className="text-slate-500 tabular-nums mt-0.5">{l.scheduledFor}</div>
                  </div>
                  <span className="font-bold capitalize">{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Log Table with Correction */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Medication Adherence Log ({filteredLogs.length})
        </h3>

        {filteredLogs.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No medication events recorded in this timeframe yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {log.status === 'taken' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : log.status === 'missed' ? (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {log.medicineName} ({log.dosage})
                    </span>
                    <span className="text-xs font-semibold capitalize text-slate-500">
                      · {log.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    Scheduled: {log.scheduledFor} · Recorded by {log.recordedByRole}
                    {log.escalatedToCaregiver ? ' · Caregiver alerted' : ''}
                    {log.correctionReason ? ` · Corrected: "${log.correctionReason}"` : ''}
                  </p>
                </div>

                {canCurrentUserEditPatient && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLog(log);
                      setNewStatus(log.status);
                      setReason('');
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 self-start sm:self-center cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Correct Entry
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Trail */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white mb-3">
          <History className="w-5 h-5 text-teal-600" />
          <span>Audit Trail ({auditLogs.length})</span>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No corrections or escalation events logged yet.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs"
              >
                <div className="font-bold text-slate-900 dark:text-white">
                  {a.action} · {a.previousValue} → {a.newValue}
                </div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                  By {a.actorName} ({a.actorRole}) · Reason: {a.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Correction Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Correct Medication Entry
              </h3>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              Updating <strong>{editingLog.medicineName}</strong> ({editingLog.scheduledFor}). This change will be permanently recorded in your audit log.
            </p>
            <form onSubmit={submitCorrection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Corrected Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as DoseStatus)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="taken">Taken</option>
                  <option value="snoozed">Snoozed</option>
                  <option value="missed">Missed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Reason for Correction *</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Took medicine earlier but forgot to tap button"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
