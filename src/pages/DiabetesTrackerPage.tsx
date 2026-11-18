import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Droplets, Lock, Sliders } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLocalDateTimeInputValue } from '../lib/dateUtils';
import { GlucoseChart } from '../components/Charts';
import { GlucoseContext } from '../types/medimitra';

export const DiabetesTrackerPage: React.FC = () => {
  const {
    userAccount,
    isDemoMode,
    readings,
    patientProfile,
    canCurrentUserEditPatient,
    activeCaregiverPermissions,
    addHealthReading,
    updatePatientSettings,
    t,
  } = useApp();

  const canEditPatientProfile = userAccount?.role === 'patient' || isDemoMode;
  const canViewVitals = activeCaregiverPermissions ? activeCaregiverPermissions.canViewVitals : true;

  const [glucoseValue, setGlucoseValue] = useState('');
  const [glucoseContext, setGlucoseContext] = useState<GlucoseContext>('fasting');
  const [measuredAt, setMeasuredAt] = useState(() => getLocalDateTimeInputValue());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [showTargets, setShowTargets] = useState(false);
  const [fastingMax, setFastingMax] = useState(String(patientProfile?.glucoseFastingMax || 125));
  const [postMealMax, setPostMealMax] = useState(String(patientProfile?.glucosePostMealMax || 180));

  useEffect(() => {
    if (patientProfile) {
      setFastingMax(String(patientProfile.glucoseFastingMax || 125));
      setPostMealMax(String(patientProfile.glucosePostMealMax || 180));
    }
  }, [patientProfile?.glucoseFastingMax, patientProfile?.glucosePostMealMax]);

  const glucoseReadings = useMemo(
    () =>
      [...readings]
        .filter((r) => r.type === 'glucose')
        .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)),
    [readings]
  );

  const avgGlucose = glucoseReadings.length
    ? Math.round(
        glucoseReadings.reduce((s, r) => s + (r.glucoseValue || 0), 0) / glucoseReadings.length
      )
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(glucoseValue);
    if (!val || val < 20 || val > 900) return;
    setSaving(true);
    try {
      await addHealthReading({
        type: 'glucose',
        measuredAt: new Date(measuredAt).toISOString(),
        glucoseValue: val,
        glucoseContext,
        notes,
      });
      setGlucoseValue('');
      setNotes('');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTargets = async () => {
    await updatePatientSettings({
      glucoseFastingMax: Math.min(250, Math.max(80, Number(fastingMax) || 125)),
      glucosePostMealMax: Math.min(350, Math.max(100, Number(postMealMax) || 180)),
    });
    setShowTargets(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t.nav.diabetesTracker}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Track fasting, before-meal, and after-meal blood glucose readings against your doctor&apos;s target range.
          </p>
        </div>

        {canEditPatientProfile && (
          <button
            type="button"
            onClick={() => setShowTargets((v) => !v)}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            Doctor Target Ranges (≤{patientProfile?.glucoseFastingMax || 125} / ≤{patientProfile?.glucosePostMealMax || 180})
          </button>
        )}
      </div>

      {!canViewVitals ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
          <Lock className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Vitals Access Restricted
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            The patient&apos;s privacy settings currently restrict blood glucose and blood pressure history from caregiver view.
          </p>
        </div>
      ) : (
        <>

      {showTargets && (
        <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-5 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Fasting Target Max (mg/dL)</label>
            <input
              type="number"
              min={80}
              max={250}
              value={fastingMax}
              onChange={(e) => setFastingMax(e.target.value)}
              className="w-36 min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">After-Meal Target Max (mg/dL)</label>
            <input
              type="number"
              min={100}
              max={350}
              value={postMealMax}
              onChange={(e) => setPostMealMax(e.target.value)}
              className="w-36 min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm tabular-nums"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveTargets}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
          >
            Save Doctor Targets
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {canCurrentUserEditPatient ? (
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
              <Droplets className="w-5 h-5 text-sky-600" />
              <span>Log Blood Glucose</span>
            </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">Glucose (mg/dL) *</label>
              <input
                type="number"
                required
                min={20}
                max={900}
                placeholder="118"
                value={glucoseValue}
                onChange={(e) => setGlucoseValue(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Reading Timing</label>
              <select
                value={glucoseContext}
                onChange={(e) => setGlucoseContext(e.target.value as GlucoseContext)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              >
                <option value="fasting">Fasting</option>
                <option value="before_meal">Before Meal</option>
                <option value="after_meal">After Meal (2 hr)</option>
                <option value="bedtime">Bedtime</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Personal Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., 2 hours after breakfast"
              className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[52px] rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-base cursor-pointer"
          >
            {saving ? 'Saving Reading...' : 'Save Glucose Reading'}
          </button>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Disclaimer: MediMitra helps track blood sugar trends and does not diagnose diabetes or alter your medication plan.
            </p>
          </form>
        ) : (
          <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-2 flex flex-col justify-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">View-Only Access</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You can view and monitor blood glucose trends here. Only the patient or a caregiver granted schedule/vitals editing permission can log new readings.
            </p>
          </div>
        )}

        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Blood Glucose Trend
            </h3>
            {glucoseReadings.length > 0 && (
              <div className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                Average: <strong className="text-slate-900 dark:text-white">{avgGlucose} mg/dL</strong> ({glucoseReadings.length} readings)
              </div>
            )}
          </div>

          <GlucoseChart
            readings={glucoseReadings}
            fastingMax={patientProfile?.glucoseFastingMax}
            postMealMax={patientProfile?.glucosePostMealMax}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Recorded Glucose History
        </h3>
        {glucoseReadings.length === 0 ? (
          <p className="text-sm text-slate-500">No blood glucose readings logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {glucoseReadings.map((r) => (
              <div key={r.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {r.flagged ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                      {r.glucoseValue} mg/dL
                    </span>
                    <span className="text-xs font-semibold text-slate-500 capitalize">
                      · {r.glucoseContext?.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase ${
                        r.flagLevel === 'urgent' || r.flagLevel === 'high' || r.flagLevel === 'low'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      · {r.flagLevel}
                    </span>
                  </div>
                  {r.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{r.notes}</p>
                  )}
                </div>
                <span className="text-xs text-slate-500 tabular-nums">
                  {new Date(r.measuredAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};
