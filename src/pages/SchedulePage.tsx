import React, { useEffect, useState } from 'react';
import { AlarmClock, BellRing, Info, Smartphone, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { speakText } from '../lib/speechAndAudio';
import { MealTiming } from '../types/medimitra';

export const SchedulePage: React.FC = () => {
  const { schedules, patientProfile, triggerTestAlarm, registerPushNotifications, t, language } = useApp();
  const [archInfo, setArchInfo] = useState<{
    fcmServerConfigured: boolean;
    vapidConfigured: boolean;
    browserLimitationNote: string;
  } | null>(null);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/notifications/architecture')
      .then((r) => r.json())
      .then((d) => setArchInfo(d))
      .catch(() => {});
  }, []);

  const sortedSchedules = [...schedules].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.nav.schedule}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Timezone: <span className="font-mono font-semibold">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span> · Repeat every{' '}
            <span className="tabular-nums font-semibold">{patientProfile?.reminderRepeatMinutes || 10} min</span> · Caregiver escalation after{' '}
            <span className="tabular-nums font-semibold">{patientProfile?.escalationDelayMinutes || 30} min</span>
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
            const res = await registerPushNotifications();
            setNotifMsg(res.message);
          }}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
        >
          <BellRing className="w-4 h-4" />
          Enable Browser & Push Alerts
        </button>
      </div>

      {notifMsg && (
        <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 p-4 text-sm text-sky-900 dark:text-sky-100">
          {notifMsg}
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Daily Reminder Slots
        </h3>

        {sortedSchedules.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No reminder slots active. Add a medicine to generate daily alarms.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedSchedules.map((sch) => {
              const mealLabel = t.meals[sch.mealTiming as MealTiming] || sch.mealTiming;
              return (
                <div
                  key={sch.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 font-mono font-bold text-teal-800 dark:text-teal-200 tabular-nums shrink-0">
                      {sch.scheduledTime}
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-white">
                        {sch.medicineName} ({sch.dosage})
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {mealLabel} · {sch.daysOfWeek.join(', ')}
                      </div>
                      {sch.instructions && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {sch.instructions}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        speakText(
                          `${sch.medicineName}, ${sch.dosage}. ${mealLabel} at ${sch.scheduledTime}.`,
                          language
                        )
                      }
                      className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      Speak
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerTestAlarm(sch)}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlarmClock className="w-4 h-4" />
                      Test Alarm
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Browser Limitation & Native Android Architecture Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Important Note on Web Browser Alarms vs. Native Android Alarms
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {archInfo?.browserLimitationNote || t.alarm.browserLimitation}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">
              Native Android Companion Architecture Ready
            </p>
            <p>
              Firestore <code className="font-mono">medicationSchedules</code> documents store IANA timezones, repeat intervals, and escalation windows so a native Android client can sync via <code className="font-mono">WorkManager</code>, schedule wake-up alerts via <code className="font-mono">AlarmManager.setExactAndAllowWhileIdle()</code>, and receive high-priority FCM push triggers even when killed.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              FCM Server Admin Status: {archInfo?.fcmServerConfigured ? 'Configured' : 'Requires FIREBASE_SERVICE_ACCOUNT_JSON'} · Web Push VAPID: {archInfo?.vapidConfigured ? 'Configured' : 'Requires VITE_FIREBASE_VAPID_KEY'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
