import React, { useEffect, useState } from 'react';
import { Bell, Globe, Moon, Settings, Smartphone, Type, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { AppLanguage } from '../types/medimitra';

export const SettingsPage: React.FC = () => {
  const {
    userAccount,
    isDemoMode,
    language,
    setLanguage,
    darkMode,
    toggleDarkMode,
    seniorFontMode,
    toggleSeniorFontMode,
    patientProfile,
    updatePatientSettings,
    registerPushNotifications,
    navigate,
    t,
  } = useApp();

  const canEditPatientProfile = userAccount?.role === 'patient' || isDemoMode;

  const [repeatMin, setRepeatMin] = useState(patientProfile?.reminderRepeatMinutes || 10);
  const [escalationMin, setEscalationMin] = useState(patientProfile?.escalationDelayMinutes || 30);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    patientProfile?.defaultLowStockThreshold ?? 7
  );
  const [voiceAloud, setVoiceAloud] = useState(patientProfile?.voiceReadAloud ?? true);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<string | null>(null);

  useEffect(() => {
    if (patientProfile) {
      setRepeatMin(patientProfile.reminderRepeatMinutes || 10);
      setEscalationMin(patientProfile.escalationDelayMinutes || 30);
      setLowStockThreshold(patientProfile.defaultLowStockThreshold ?? 7);
      setVoiceAloud(patientProfile.voiceReadAloud ?? true);
    }
  }, [
    patientProfile?.reminderRepeatMinutes,
    patientProfile?.escalationDelayMinutes,
    patientProfile?.defaultLowStockThreshold,
    patientProfile?.voiceReadAloud,
  ]);

  const handleSaveReminderPrefs = async () => {
    await updatePatientSettings({
      reminderRepeatMinutes: Math.min(120, Math.max(1, Math.round(Number(repeatMin) || 10))),
      escalationDelayMinutes: Math.min(240, Math.max(5, Math.round(Number(escalationMin) || 30))),
      defaultLowStockThreshold: Math.min(500, Math.max(0, Math.round(Number(lowStockThreshold) || 0))),
      voiceReadAloud: voiceAloud,
    });
    setSavedMsg('Reminder, escalation, and low stock threshold preferences saved.');
    setTimeout(() => setSavedMsg(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-teal-600" />
          <span>{t.nav.settings}</span>
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Personalize language, text size, dark mode, notification channels, and PWA installation.
        </p>
      </div>

      {/* Language Preferences */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
          <Globe className="w-5 h-5 text-teal-600" />
          <span>Language / ಭಾಷೆ / भाषा</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              { code: 'en', name: 'English', sub: 'Interface & Voice' },
              { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', sub: 'ನ್ಯಾವಿಗೇಷನ್ ಮತ್ತು ಧ್ವನಿ' },
              { code: 'hi', name: 'हिन्दी (Hindi)', sub: 'नेविगेशन और आवाज़' },
            ] as Array<{ code: AppLanguage; name: string; sub: string }>
          ).map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLanguage(item.code)}
              className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                language === item.code
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
              }`}
            >
              <div className="font-bold text-base">{item.name}</div>
              <div className={`text-xs mt-0.5 ${language === item.code ? 'text-teal-100' : 'text-slate-500'}`}>
                {item.sub}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility & Display */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Accessibility & Display
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={toggleSeniorFontMode}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-teal-600" />
              <div>
                <div className="font-bold text-sm">Large Senior Text Mode</div>
                <div className="text-xs text-slate-500">Increases base font scale for easier reading</div>
              </div>
            </div>
            <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
              {seniorFontMode ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-teal-600" />
              <div>
                <div className="font-bold text-sm">Dark Mode</div>
                <div className="text-xs text-slate-500">Comfortable low-glare evening theme</div>
              </div>
            </div>
            <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
              {darkMode ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {canEditPatientProfile && (
          <button
            type="button"
            onClick={() => navigate('onboarding')}
            className="text-sm font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
          >
            Re-open Guided 4-Step Setup Wizard →
          </button>
        )}
      </div>

      {/* Reminder & Notification Preferences */}
      {patientProfile && canEditPatientProfile && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
            <Bell className="w-5 h-5 text-teal-600" />
            <span>Reminder & Escalation Settings</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Repeat Interval (Minutes)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={repeatMin}
                onChange={(e) => setRepeatMin(Number(e.target.value) || 10)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                Caregiver Escalation Delay (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={escalationMin}
                onChange={(e) => setEscalationMin(Number(e.target.value) || 30)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                Default Low Stock Threshold (Units)
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={voiceAloud}
              onChange={(e) => setVoiceAloud(e.target.checked)}
              className="w-4 h-4 accent-teal-600"
            />
            <Volume2 className="w-4 h-4 text-teal-600" />
            <span>Read medication alarms aloud automatically</span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveReminderPrefs}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold cursor-pointer"
            >
              Save Preferences
            </button>
            <button
              type="button"
              onClick={async () => {
                const res = await registerPushNotifications();
                setNotifStatus(res.message);
              }}
              className="min-h-[44px] px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold cursor-pointer"
            >
              Request Browser / FCM Permission
            </button>
          </div>
          {savedMsg && <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{savedMsg}</p>}
          {notifStatus && <p className="text-xs font-medium text-sky-800 dark:text-sky-200">{notifStatus}</p>}
        </div>
      )}

      {/* PWA & Native Android Architecture */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
            <Smartphone className="w-5 h-5 text-teal-600" />
            <span>Install App (PWA) & Push Configuration</span>
          </div>
          <PWAInstallButton variant="compact" />
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          MediMitra is a responsive Progressive Web App with offline caching. For live server-side FCM Web Push and automated background cron reminders in production, configure <code className="font-mono text-xs">VITE_FIREBASE_VAPID_KEY</code> and <code className="font-mono text-xs">FIREBASE_SERVICE_ACCOUNT_JSON</code> in your environment variables, and pair with a native Android companion app for guaranteed closed-app alarms.
        </p>
      </div>
    </div>
  );
};
