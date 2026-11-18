import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlarmClock,
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Droplets,
  PhoneCall,
  Pill,
  Plus,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTimeOfDayGreeting } from '../i18n/translations';
import { getLocalDateString } from '../lib/dateUtils';
import { speakText } from '../lib/speechAndAudio';
import { GlucoseContext, MealTiming } from '../types/medimitra';

export const PatientDashboard: React.FC = () => {
  const {
    patientProfile,
    medicines,
    schedules,
    logs,
    readings,
    appointments,
    canCurrentUserEditPatient,
    activeCaregiverPermissions,
    recordDoseAction,
    triggerTestAlarm,
    addHealthReading,
    navigate,
    t,
    language,
  } = useApp();

  const todayStr = getLocalDateString();
  const canViewLogs = activeCaregiverPermissions ? activeCaregiverPermissions.canViewLogs : true;
  const canViewVitals = activeCaregiverPermissions ? activeCaregiverPermissions.canViewVitals : true;

  // Quick BP state
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [bpPulse, setBpPulse] = useState('');
  const [bpSavedMsg, setBpSavedMsg] = useState<string | null>(null);

  // Quick Glucose state
  const [glVal, setGlVal] = useState('');
  const [glCtx, setGlCtx] = useState<GlucoseContext>('fasting');
  const [glSavedMsg, setGlSavedMsg] = useState<string | null>(null);

  const todayScheduleItems = useMemo(() => {
    return [...schedules]
      .filter((s) => s.isActive)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
      .map((sch) => {
        const slot = `${todayStr}T${sch.scheduledTime}`;
        const log = logs.find((l) => l.scheduleId === sch.id && l.scheduledFor === slot);
        return {
          schedule: sch,
          log,
          status: log?.status || 'pending',
        };
      });
  }, [schedules, logs, todayStr]);

  const takenToday = todayScheduleItems.filter((i) => i.status === 'taken').length;
  const pendingToday = todayScheduleItems.filter(
    (i) => i.status === 'pending' || i.status === 'snoozed'
  ).length;
  const totalToday = todayScheduleItems.length;
  const adherencePercent = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 100;

  const defaultThreshold = patientProfile?.defaultLowStockThreshold ?? 7;
  const lowStockMeds = medicines.filter(
    (m) => m.isActive && m.stockQuantity < (m.refillThreshold ?? defaultThreshold)
  );
  const upcomingAppointments = appointments
    .filter((a) => a.status === 'upcoming')
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))
    .slice(0, 2);

  const latestBp = readings
    .filter((r) => r.type === 'bp')
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  const latestGlucose = readings
    .filter((r) => r.type === 'glucose')
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];

  const greetingText = `${getTimeOfDayGreeting(language)}, ${patientProfile?.fullName || 'Friend'}`;

  const handleReadSummary = () => {
    const nextPending = todayScheduleItems.find((i) => i.status === 'pending' || i.status === 'snoozed');
    const summary = nextPending
      ? `${greetingText}. You have taken ${takenToday} of ${totalToday} medicines today. Your next medicine is ${nextPending.schedule.medicineName}, ${nextPending.schedule.dosage}, at ${nextPending.schedule.scheduledTime}.`
      : `${greetingText}. Wonderful! All ${totalToday} scheduled medicines for today have been completed.`;
    speakText(summary, language);
  };

  const handleQuickBp = async (e: React.FormEvent) => {
    e.preventDefault();
    const sys = Number(bpSys);
    const dia = Number(bpDia);
    if (!sys || !dia || sys < 40 || sys > 300 || dia < 30 || dia > 200) return;
    await addHealthReading({
      type: 'bp',
      measuredAt: new Date().toISOString(),
      systolic: sys,
      diastolic: dia,
      pulse: bpPulse ? Number(bpPulse) : undefined,
    });
    setBpSys('');
    setBpDia('');
    setBpPulse('');
    setBpSavedMsg(`Saved ${sys}/${dia} mmHg`);
    setTimeout(() => setBpSavedMsg(null), 4000);
  };

  const handleQuickGlucose = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(glVal);
    if (!val || val < 20 || val > 900) return;
    await addHealthReading({
      type: 'glucose',
      measuredAt: new Date().toISOString(),
      glucoseValue: val,
      glucoseContext: glCtx,
    });
    setGlVal('');
    setGlSavedMsg(`Saved ${val} mg/dL`);
    setTimeout(() => setGlSavedMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Hero Greeting & Emergency SOS Bar */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {greetingText}
          </h2>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {pendingToday === 0 && totalToday > 0
              ? 'All scheduled doses for today are complete.'
              : `You have ${pendingToday} medicine dose${pendingToday === 1 ? '' : 's'} remaining today.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleReadSummary}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100 text-sm font-bold inline-flex items-center gap-2 hover:bg-sky-100 transition-colors cursor-pointer"
          >
            <Volume2 className="w-5 h-5" />
            {t.common.readAloud}
          </button>

          <button
            type="button"
            onClick={() => triggerTestAlarm(todayScheduleItems[0]?.schedule)}
            disabled={schedules.length === 0}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <AlarmClock className="w-5 h-5" />
            {t.dashboard.testAlarm}
          </button>

          <button
            type="button"
            onClick={() => navigate('emergency')}
            className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <PhoneCall className="w-5 h-5" />
            {t.common.sosButton}
          </button>
        </div>
      </section>

      {/* Summary KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.dashboard.adherenceToday}
            </p>
            <p className="mt-1 text-3xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
              {adherencePercent}%
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {takenToday} of {totalToday} scheduled
            </p>
          </div>
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
            <path
              className="text-slate-100 dark:text-slate-800"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-teal-600"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${adherencePercent}, 100`}
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t.dashboard.takenCount} / {t.dashboard.pendingCount}
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {takenToday} <span className="text-base font-medium text-slate-400">/ {pendingToday} left</span>
          </p>
          <button
            type="button"
            onClick={() => navigate('history')}
            className="mt-2 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
          >
            View full history →
          </button>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Latest Blood Pressure
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {!canViewVitals ? 'Hidden' : latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '—'}{' '}
            {canViewVitals && <span className="text-xs font-normal text-slate-500">mmHg</span>}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {!canViewVitals
              ? 'Vitals hidden by patient privacy'
              : latestBp
                ? `${latestBp.flagLevel.toUpperCase()} · ${new Date(latestBp.measuredAt).toLocaleDateString()}`
                : 'No BP logged yet'}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Latest Blood Glucose
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {!canViewVitals ? 'Hidden' : latestGlucose ? `${latestGlucose.glucoseValue}` : '—'}{' '}
            {canViewVitals && <span className="text-xs font-normal text-slate-500">mg/dL</span>}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {!canViewVitals
              ? 'Vitals hidden by patient privacy'
              : latestGlucose
                ? `${latestGlucose.glucoseContext?.replace('_', ' ')} · ${latestGlucose.flagLevel.toUpperCase()}`
                : 'No glucose logged yet'}
          </p>
        </div>
      </section>

      {/* Main Content Split: Today's Schedule + Quick Vitals Entry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Medicine Schedule */}
        <section className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2.5">
              <Pill className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.dashboard.todaySchedule}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('medicines')}
              className="text-sm font-semibold text-teal-700 dark:text-teal-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Manage Medicines
            </button>
          </div>

          {todayScheduleItems.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                No medicines scheduled for today yet.
              </p>
              <button
                type="button"
                onClick={() => navigate('medicines')}
                className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold cursor-pointer"
              >
                Add First Medicine
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayScheduleItems.map(({ schedule, status }) => {
                const mealLabel = t.meals[schedule.mealTiming as MealTiming] || schedule.mealTiming;
                const linkedMed = medicines.find((m) => m.id === schedule.medicineId);
                const medThreshold = linkedMed ? (linkedMed.refillThreshold ?? defaultThreshold) : defaultThreshold;
                const isLowStock = linkedMed ? linkedMed.stockQuantity < medThreshold : false;
                return (
                  <div
                    key={schedule.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isLowStock
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/25'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                        <span className="text-teal-700 dark:text-teal-300">{schedule.scheduledTime}</span>
                        <span aria-hidden="true">·</span>
                        <span>{mealLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            status === 'taken'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : status === 'missed'
                                ? 'text-rose-700 dark:text-rose-300'
                                : status === 'snoozed'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-slate-600 dark:text-slate-300'
                          }
                        >
                          {status === 'taken'
                            ? t.common.taken
                            : status === 'missed'
                              ? t.common.missed
                              : status === 'snoozed'
                                ? t.common.snooze
                                : t.common.pending}
                        </span>
                      </div>
                      <h4 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {schedule.medicineName}{' '}
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          ({schedule.dosage})
                        </span>
                      </h4>
                      {schedule.instructions && (
                        <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                          {schedule.instructions}
                        </p>
                      )}
                      {isLowStock && linkedMed && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Low Stock: {linkedMed.stockQuantity} left (below threshold of {medThreshold})
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate('medicines')}
                            className="ml-1 underline hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer"
                          >
                            Refill →
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!canViewLogs ? (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">
                          Dose logs hidden
                        </span>
                      ) : status !== 'taken' && canCurrentUserEditPatient ? (
                        <>
                          <button
                            type="button"
                            onClick={() => recordDoseAction(schedule, 'taken')}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {t.common.taken}
                          </button>
                          <button
                            type="button"
                            onClick={() => recordDoseAction(schedule, 'snoozed')}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Clock className="w-4 h-4" />
                            {t.common.snooze}
                          </button>
                          <button
                            type="button"
                            onClick={() => recordDoseAction(schedule, 'missed')}
                            className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            {t.common.missed}
                          </button>
                        </>
                      ) : status !== 'taken' ? (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">
                          View-only access
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 px-3 py-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Done
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Quick BP & Glucose Entry + Alerts + Appointments */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick BP Entry (Editable users only) */}
          {canCurrentUserEditPatient ? (
            <>
              <form
                onSubmit={handleQuickBp}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t.dashboard.bpQuickEntry}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('bp-tracker')}
                    className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                  >
                    Charts →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Systolic
                    </label>
                    <input
                      type="number"
                      placeholder="120"
                      min={40}
                      max={300}
                      required
                      value={bpSys}
                      onChange={(e) => setBpSys(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Diastolic
                    </label>
                    <input
                      type="number"
                      placeholder="80"
                      min={30}
                      max={200}
                      required
                      value={bpDia}
                      onChange={(e) => setBpDia(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Pulse
                    </label>
                    <input
                      type="number"
                      placeholder="72"
                      min={25}
                      max={240}
                      value={bpPulse}
                      onChange={(e) => setBpPulse(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold cursor-pointer"
                  >
                    Save BP Reading
                  </button>
                  {bpSavedMsg && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {bpSavedMsg}
                    </span>
                  )}
                </div>
              </form>

              {/* Quick Glucose Entry */}
              <form
                onSubmit={handleQuickGlucose}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t.dashboard.glucoseQuickEntry}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('diabetes-tracker')}
                    className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                  >
                    Charts →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Glucose (mg/dL)
                    </label>
                    <input
                      type="number"
                      placeholder="115"
                      min={20}
                      max={900}
                      required
                      value={glVal}
                      onChange={(e) => setGlVal(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Timing
                    </label>
                    <select
                      value={glCtx}
                      onChange={(e) => setGlCtx(e.target.value as GlucoseContext)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                    >
                      <option value="fasting">Fasting</option>
                      <option value="before_meal">Before Meal</option>
                      <option value="after_meal">After Meal</option>
                      <option value="bedtime">Bedtime</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-sm font-bold cursor-pointer"
                  >
                    Save Glucose
                  </button>
                  {glSavedMsg && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {glSavedMsg}
                    </span>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Caregiver Read-Only View
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                You have view-only access for this patient. Use the BP and Diabetes trackers to review trends or ask the patient to grant schedule/vitals editing permissions if needed.
              </p>
            </div>
          )}

          {/* Low Stock Alerts & Upcoming Appointments */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            {lowStockMeds.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{t.dashboard.lowStockAlerts}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {lowStockMeds.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900"
                    >
                      <span className="font-semibold text-amber-900 dark:text-amber-200 tabular-nums">
                        {m.name} ({m.dosage}) — {m.stockQuantity} left (threshold {m.refillThreshold ?? defaultThreshold})
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('medicines')}
                        className="font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
                      >
                        Refill
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>{t.dashboard.upcomingAppointments}</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('appointments')}
                  className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                >
                  All visits →
                </button>
              </div>
              {upcomingAppointments.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">No upcoming doctor appointments scheduled.</p>
              ) : (
                <div className="mt-2.5 space-y-2">
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {apt.doctorName}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 tabular-nums">
                        {apt.appointmentDate} at {apt.appointmentTime} · {apt.clinicName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Medical Safety Footer */}
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2">
        {t.common.medicalDisclaimer}
      </p>
    </div>
  );
};
