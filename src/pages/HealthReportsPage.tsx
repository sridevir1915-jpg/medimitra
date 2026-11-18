import React, { useMemo, useState } from 'react';
import { Copy, Download, FileBarChart2, Printer, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BloodPressureChart, GlucoseChart } from '../components/Charts';
import { exportHealthReportPDF } from '../lib/pdfReport';

export const HealthReportsPage: React.FC = () => {
  const { patientProfile, medicines, logs, readings, appointments, isDemoMode, t } = useApp();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [shareCopied, setShareCopied] = useState(false);

  const periodDays = period === 'weekly' ? 7 : 30;
  const cutoff = useMemo(() => new Date(Date.now() - periodDays * 86400000), [periodDays]);

  const scopedLogs = useMemo(
    () => logs.filter((l) => new Date(l.scheduledFor) >= cutoff),
    [logs, cutoff]
  );
  const bpReadings = useMemo(
    () => readings.filter((r) => r.type === 'bp' && new Date(r.measuredAt) >= cutoff),
    [readings, cutoff]
  );
  const glucoseReadings = useMemo(
    () => readings.filter((r) => r.type === 'glucose' && new Date(r.measuredAt) >= cutoff),
    [readings, cutoff]
  );

  const takenCount = scopedLogs.filter((l) => l.status === 'taken').length;
  const missedCount = scopedLogs.filter((l) => l.status === 'missed').length;
  const snoozedCount = scopedLogs.filter((l) => l.status === 'snoozed').length;
  const adherencePercent =
    scopedLogs.length > 0 ? Math.round((takenCount / scopedLogs.length) * 100) : 100;

  const handleExportPdf = () => {
    if (!patientProfile) return;
    exportHealthReportPDF({
      profile: patientProfile,
      periodLabel: period === 'weekly' ? 'Last 7 Days' : 'Last 30 Days',
      adherencePercent,
      takenCount,
      missedCount,
      snoozedCount,
      medicines,
      logs: scopedLogs,
      bpReadings,
      glucoseReadings,
      appointments,
      isDemo: isDemoMode,
    });
  };

  const handleShare = async () => {
    const summary = [
      `MediMitra ${period === 'weekly' ? 'Weekly' : 'Monthly'} Health Summary — ${patientProfile?.fullName || 'Patient'}`,
      `Adherence: ${adherencePercent}% (${takenCount} taken, ${missedCount} missed)`,
      `Latest BP: ${bpReadings[0] ? `${bpReadings[0].systolic}/${bpReadings[0].diastolic} mmHg` : 'None'}`,
      `Latest Glucose: ${glucoseReadings[0] ? `${glucoseReadings[0].glucoseValue} mg/dL` : 'None'}`,
      `Active Medicines: ${medicines.map((m) => `${m.name} ${m.dosage}`).join(', ')}`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'MediMitra Health Report', text: summary });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    await navigator.clipboard.writeText(summary);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileBarChart2 className="w-6 h-6 text-teal-600" />
            <span>{t.nav.reports}</span>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Generate weekly or monthly adherence, blood pressure, and glucose summaries to export as PDF or share with your doctor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
            {(['weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer ${
                  period === p ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            {shareCopied ? <Copy className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            {shareCopied ? 'Summary Copied!' : 'Share with Doctor / Caregiver'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500">Medication Adherence</p>
          <p className="mt-1 text-3xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
            {adherencePercent}%
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {takenCount} taken · {snoozedCount} snoozed · {missedCount} missed
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500">Blood Pressure Logs</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {bpReadings.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {bpReadings.filter((r) => r.flagged).length} flagged above target
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500">Glucose Logs</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {glucoseReadings.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {glucoseReadings.filter((r) => r.flagged).length} outside doctor target
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            BP Trends ({period})
          </h3>
          <BloodPressureChart
            readings={bpReadings}
            highSys={patientProfile?.bpHighThresholdSys}
            highDia={patientProfile?.bpHighThresholdDia}
          />
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Glucose Trends ({period})
          </h3>
          <GlucoseChart
            readings={glucoseReadings}
            fastingMax={patientProfile?.glucoseFastingMax}
            postMealMax={patientProfile?.glucosePostMealMax}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          Missed Medicine Summary ({missedCount})
        </h3>
        {missedCount === 0 ? (
          <p className="text-sm text-slate-500">No missed doses recorded in this period.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {scopedLogs
              .filter((l) => l.status === 'missed')
              .map((l) => (
                <div key={l.id} className="py-2.5 flex justify-between gap-4">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {l.medicineName} ({l.dosage})
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">{l.scheduledFor}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
