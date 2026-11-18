import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Lock, Sliders } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLocalDateTimeInputValue } from '../lib/dateUtils';
import { BloodPressureChart } from '../components/Charts';

export const BpTrackerPage: React.FC = () => {
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

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => getLocalDateTimeInputValue());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [showThresholds, setShowThresholds] = useState(false);
  const [sysThresh, setSysThresh] = useState(String(patientProfile?.bpHighThresholdSys || 140));
  const [diaThresh, setDiaThresh] = useState(String(patientProfile?.bpHighThresholdDia || 90));

  useEffect(() => {
    if (patientProfile) {
      setSysThresh(String(patientProfile.bpHighThresholdSys || 140));
      setDiaThresh(String(patientProfile.bpHighThresholdDia || 90));
    }
  }, [patientProfile?.bpHighThresholdSys, patientProfile?.bpHighThresholdDia]);

  const bpReadings = useMemo(
    () =>
      [...readings]
        .filter((r) => r.type === 'bp')
        .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)),
    [readings]
  );

  const avgSys = bpReadings.length
    ? Math.round(bpReadings.reduce((s, r) => s + (r.systolic || 0), 0) / bpReadings.length)
    : 0;
  const avgDia = bpReadings.length
    ? Math.round(bpReadings.reduce((s, r) => s + (r.diastolic || 0), 0) / bpReadings.length)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = Number(systolic);
    const d = Number(diastolic);
    if (!s || !d || s < 40 || s > 300 || d < 30 || d > 200) return;
    setSaving(true);
    try {
      await addHealthReading({
        type: 'bp',
        measuredAt: new Date(measuredAt).toISOString(),
        systolic: s,
        diastolic: d,
        pulse: pulse ? Number(pulse) : undefined,
        notes,
      });
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setNotes('');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveThresholds = async () => {
    await updatePatientSettings({
      bpHighThresholdSys: Math.min(220, Math.max(100, Number(sysThresh) || 140)),
      bpHighThresholdDia: Math.min(140, Math.max(60, Number(diaThresh) || 90)),
    });
    setShowThresholds(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.nav.bpTracker}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Record systolic, diastolic, and pulse readings. Flagged readings help you share accurate patterns with your doctor.
          </p>
        </div>

        {canEditPatientProfile && (
          <button
            type="button"
            onClick={() => setShowThresholds((v) => !v)}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            Alert Threshold ({patientProfile?.bpHighThresholdSys || 140}/{patientProfile?.bpHighThresholdDia || 90})
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
            The patient&apos;s privacy settings currently restrict blood pressure and glucose history from caregiver view.
          </p>
        </div>
      ) : (
        <>

      {showThresholds && (
        <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-5 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">High Systolic Flag (mmHg)</label>
            <input
              type="number"
              min={100}
              max={220}
              value={sysThresh}
              onChange={(e) => setSysThresh(e.target.value)}
              className="w-32 min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">High Diastolic Flag (mmHg)</label>
            <input
              type="number"
              min={60}
              max={140}
              value={diaThresh}
              onChange={(e) => setDiaThresh(e.target.value)}
              className="w-32 min-h-[42px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm tabular-nums"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveThresholds}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
          >
            Update Thresholds
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form */}
        {canCurrentUserEditPatient ? (
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
              <Activity className="w-5 h-5 text-teal-600" />
              <span>Log Blood Pressure</span>
            </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">Systolic *</label>
              <input
                type="number"
                required
                min={40}
                max={300}
                placeholder="128"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Diastolic *</label>
              <input
                type="number"
                required
                min={30}
                max={200}
                placeholder="82"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Pulse (bpm)</label>
              <input
                type="number"
                min={25}
                max={240}
                placeholder="72"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base tabular-nums"
              />
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
              placeholder="e.g., After 10 min rest, morning before tea"
              className="w-full min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[52px] rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base cursor-pointer"
          >
            {saving ? 'Saving Reading...' : 'Save BP Reading'}
          </button>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Safety note: MediMitra flags high (&ge; {patientProfile?.bpHighThresholdSys || 140}/{patientProfile?.bpHighThresholdDia || 90}) or urgent (&ge; 180/120) readings for medical attention. It never diagnoses or changes prescriptions.
            </p>
          </form>
        ) : (
          <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-2 flex flex-col justify-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">View-Only Access</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You can view and monitor blood pressure trends here. Only the patient or a caregiver granted schedule/vitals editing permission can log new readings.
            </p>
          </div>
        )}

        {/* Chart & Summary */}
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Blood Pressure Trend
            </h3>
            {bpReadings.length > 0 && (
              <div className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                Average: <strong className="text-slate-900 dark:text-white">{avgSys}/{avgDia} mmHg</strong> ({bpReadings.length} readings)
              </div>
            )}
          </div>

          <BloodPressureChart
            readings={bpReadings}
            highSys={patientProfile?.bpHighThresholdSys}
            highDia={patientProfile?.bpHighThresholdDia}
          />
        </div>
      </div>

      {/* Readings History List */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Recorded BP History
        </h3>
        {bpReadings.length === 0 ? (
          <p className="text-sm text-slate-500">No BP readings logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {bpReadings.map((r) => (
              <div key={r.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {r.flagged ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                      {r.systolic}/{r.diastolic} mmHg
                    </span>
                    {r.pulse && (
                      <span className="text-xs text-slate-500 tabular-nums">· Pulse {r.pulse} bpm</span>
                    )}
                    <span
                      className={`text-xs font-bold uppercase ${
                        r.flagLevel === 'urgent' || r.flagLevel === 'high'
                          ? 'text-rose-700 dark:text-rose-300'
                          : r.flagLevel === 'low'
                            ? 'text-amber-700 dark:text-amber-300'
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
