import React from 'react';
import { AlarmClock, CheckCircle2, Clock, Info, ShieldAlert, Volume2, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playGentleReminderChime, speakText } from '../lib/speechAndAudio';
import { MealTiming } from '../types/medimitra';

export const SmartAlarmModal: React.FC = () => {
  const { activeAlarm, recordDoseAction, dismissAlarm, t, language } = useApp();

  if (!activeAlarm) return null;

  const { schedule, medicine, repeatCount } = activeAlarm;
  const mealLabel = t.meals[schedule.mealTiming as MealTiming] || schedule.mealTiming;
  const instructions = schedule.instructions || medicine?.instructions || 'Take with water as prescribed.';

  const handleSpeak = () => {
    playGentleReminderChime();
    const msg = `${t.alarm.spokenPrefix} ${schedule.medicineName}, ${schedule.dosage}. ${mealLabel}. ${instructions}`;
    speakText(msg, language);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-alarm-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 shadow-2xl p-6 sm:p-8 my-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <AlarmClock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                {t.alarm.title}
                {repeatCount > 0 ? ` · Repeat #${repeatCount}` : ''}
              </p>
              <h2
                id="smart-alarm-heading"
                className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5"
              >
                {schedule.medicineName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSpeak}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800 text-sm font-semibold hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors cursor-pointer shrink-0"
          >
            <Volume2 className="w-5 h-5" />
            {t.common.readAloud}
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 p-5 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {schedule.dosage}
            </span>
            <span className="text-base font-semibold text-teal-800 dark:text-teal-200 tabular-nums">
              {schedule.scheduledTime} · {mealLabel}
            </span>
          </div>
          <p className="text-base text-slate-700 dark:text-slate-200 leading-relaxed">
            <span className="font-semibold">{t.alarm.instructionsLabel}: </span>
            {instructions}
          </p>
        </div>

        {/* Large elderly-accessible action buttons */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => recordDoseAction(schedule, 'taken')}
            className="min-h-[56px] px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-6 h-6" />
            {t.common.taken}
          </button>

          <button
            type="button"
            onClick={() => recordDoseAction(schedule, 'snoozed')}
            className="min-h-[56px] px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
          >
            <Clock className="w-6 h-6" />
            {t.common.snooze} ({schedule.repeatIntervalMinutes}m)
          </button>

          <button
            type="button"
            onClick={() => recordDoseAction(schedule, 'missed')}
            className="min-h-[56px] px-5 py-3.5 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
            {t.common.missed}
          </button>
        </div>

        {/* Missed Dose Safety Warning */}
        <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3.5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
            {t.alarm.missedSafetyNote}
          </p>
        </div>

        <div className="mt-3 flex items-start justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t.alarm.browserLimitation}</span>
          </div>
          <button
            type="button"
            onClick={dismissAlarm}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 whitespace-nowrap shrink-0 py-1 px-2 cursor-pointer"
          >
            Minimize
          </button>
        </div>
      </div>
    </div>
  );
};
