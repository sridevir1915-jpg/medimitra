import React, { useState } from 'react';
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Check,
  HeartHandshake,
  Pill,
  Plus,
  Trash2,
  User,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { speakText } from '../lib/speechAndAudio';
import { AppLanguage, MealTiming, MedicineForm } from '../types/medimitra';

interface DraftMed {
  name: string;
  dosage: string;
  form: MedicineForm;
  mealTiming: MealTiming;
  scheduledTime: string;
  instructions: string;
  stockQuantity: number;
  refillThreshold: number;
}

const COMMON_PRESETS: DraftMed[] = [
  {
    name: 'Metformin',
    dosage: '500 mg',
    form: 'tablet',
    mealTiming: 'after_breakfast',
    scheduledTime: '08:30',
    instructions: 'Take after breakfast with water',
    stockQuantity: 30,
    refillThreshold: 7,
  },
  {
    name: 'Amlodipine',
    dosage: '5 mg',
    form: 'tablet',
    mealTiming: 'before_breakfast',
    scheduledTime: '07:30',
    instructions: 'Take once every morning for BP',
    stockQuantity: 30,
    refillThreshold: 7,
  },
  {
    name: 'Atorvastatin',
    dosage: '10 mg',
    form: 'tablet',
    mealTiming: 'bedtime',
    scheduledTime: '22:00',
    instructions: 'Take at bedtime with water',
    stockQuantity: 30,
    refillThreshold: 7,
  },
];

export const OnboardingPage: React.FC = () => {
  const { userAccount, language, setLanguage, t, completeOnboarding, skipOnboarding, registerPushNotifications } = useApp();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Patient Profile
  const [fullName, setFullName] = useState(userAccount?.displayName || '');
  const [age, setAge] = useState('68');
  const [conditions, setConditions] = useState<string[]>(['Type 2 Diabetes', 'Hypertension']);
  const [primaryDoctorName, setPrimaryDoctorName] = useState('');
  const [primaryClinic, setPrimaryClinic] = useState('');

  // Step 2: Initial Medications
  const [meds, setMeds] = useState<DraftMed[]>([
    {
      name: '',
      dosage: '',
      form: 'tablet',
      mealTiming: 'after_breakfast',
      scheduledTime: '08:30',
      instructions: 'Take after meal with water',
      stockQuantity: 30,
      refillThreshold: 7,
    },
  ]);

  // Step 3: Reminder Preferences
  const [repeatMinutes, setRepeatMinutes] = useState(10);
  const [escalationMinutes, setEscalationMinutes] = useState(30);
  const [voiceReadAloud, setVoiceReadAloud] = useState(true);
  const [notifStatus, setNotifStatus] = useState<string | null>(null);

  // Step 4: Caregiver Invite
  const [inviteEnabled, setInviteEnabled] = useState(true);
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [canManageSchedules, setCanManageSchedules] = useState(false);
  const [receiveMissedAlerts, setReceiveMissedAlerts] = useState(true);

  const toggleCondition = (cond: string) => {
    setConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const readCurrentStep = () => {
    const stepTexts: Record<number, string> = {
      1: `${t.onboarding.step1Title}. ${t.onboarding.step1Desc}`,
      2: `${t.onboarding.step2Title}. ${t.onboarding.step2Desc}`,
      3: `${t.onboarding.step3Title}. ${t.onboarding.step3Desc}`,
      4: `${t.onboarding.step4Title}. ${t.onboarding.step4Desc}`,
    };
    speakText(stepTexts[step], language);
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      const parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 125) {
        setError('Please enter a valid age between 1 and 125.');
        return;
      }
    }
    if (step === 2) {
      const validMeds = meds.filter((m) => m.name.trim() && m.dosage.trim());
      if (validMeds.length === 0) {
        setError('Please add at least one medicine (or tap a quick example above) before continuing.');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const handleFinish = async () => {
    setError(null);
    if (inviteEnabled && caregiverEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caregiverEmail.trim())) {
      setError('Please enter a valid caregiver email address, or uncheck inviting a caregiver for now.');
      return;
    }

    setSaving(true);
    try {
      const validMeds = meds.filter((m) => m.name.trim() && m.dosage.trim());
      await completeOnboarding({
        profile: {
          fullName: fullName.trim(),
          age: Number(age) || 65,
          conditions,
          preferredLanguage: language,
          primaryDoctorName: primaryDoctorName.trim(),
          primaryClinic: primaryClinic.trim(),
          reminderRepeatMinutes: repeatMinutes,
          escalationDelayMinutes: escalationMinutes,
          voiceReadAloud,
          bpHighThresholdSys: 140,
          bpHighThresholdDia: 90,
          glucoseFastingMax: 125,
          glucosePostMealMax: 180,
        },
        initialMedicines: validMeds,
        caregiverInvite:
          inviteEnabled && caregiverEmail.trim()
            ? {
                caregiverName: caregiverName.trim() || 'Family Caregiver',
                caregiverEmail: caregiverEmail.trim(),
                relationship: relationship.trim() || 'Family Member',
                permissions: {
                  canViewLogs: true,
                  canViewVitals: true,
                  canManageSchedules,
                  receiveMissedDoseAlerts: receiveMissedAlerts,
                  receiveRefillAlerts: true,
                },
              }
            : null,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save onboarding details.');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, title: t.onboarding.step1Title, icon: User },
    { num: 2, title: t.onboarding.step2Title, icon: Pill },
    { num: 3, title: t.onboarding.step3Title, icon: AlarmClock },
    { num: 4, title: t.onboarding.step4Title, icon: HeartHandshake },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {t.onboarding.title}
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 mt-1">
              {t.onboarding.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={readCurrentStep}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100 text-sm font-semibold hover:bg-sky-100 transition-colors cursor-pointer"
          >
            <Volume2 className="w-5 h-5" />
            {t.common.readAloud}
          </button>
        </div>

        {/* Accessible Stepper */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-6">
          {steps.map((s) => {
            const Icon = s.icon;
            const active = step === s.num;
            const done = step > s.num;
            return (
              <div
                key={s.num}
                className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left ${
                  active
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : done
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold opacity-85">Step {s.num}</div>
                  <div className="text-xs sm:text-sm font-bold truncate">{s.title}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 p-4 text-sm font-medium text-rose-800 dark:text-rose-200">
              {error}
            </div>
          )}

          {/* STEP 1: PATIENT PROFILE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t.onboarding.step1Title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {t.onboarding.step1Desc}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Ramesh Rao"
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={125}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Preferred Language (Navigation & Voice)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['en', 'kn', 'hi'] as AppLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`min-h-[48px] rounded-xl border font-bold text-base cursor-pointer transition-colors ${
                        language === lang
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {lang === 'en' ? 'English' : lang === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Health Focus Areas
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {['Type 2 Diabetes', 'Hypertension', 'Heart Care', 'Cholesterol', 'Thyroid', 'Arthritis'].map((c) => {
                    const selected = conditions.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCondition(c)}
                        className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${
                          selected
                            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-600 text-teal-800 dark:text-teal-200'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {selected ? '✓ ' : ''}{c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Doctor Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={primaryDoctorName}
                    onChange={(e) => setPrimaryDoctorName(e.target.value)}
                    placeholder="e.g., Dr. Kavitha Deshmukh"
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Clinic / Hospital (Optional)
                  </label>
                  <input
                    type="text"
                    value={primaryClinic}
                    onChange={(e) => setPrimaryClinic(e.target.value)}
                    placeholder="e.g., City Senior Care Clinic"
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INITIAL MEDICATIONS */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t.onboarding.step2Title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {t.onboarding.step2Desc}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                  Tap a common medicine to add quickly:
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        setMeds((prev) => {
                          const hasEmpty = prev.length === 1 && !prev[0].name.trim();
                          return hasEmpty ? [preset] : [...prev, preset];
                        })
                      }
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100 text-sm font-semibold hover:bg-sky-100 cursor-pointer"
                    >
                      + {preset.name} ({preset.dosage})
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {meds.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Medicine #{idx + 1}
                      </span>
                      {meds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMeds((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Medicine Name *
                        </label>
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) =>
                            setMeds((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item))
                            )
                          }
                          placeholder="e.g., Metformin"
                          className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          value={m.dosage}
                          onChange={(e) =>
                            setMeds((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, dosage: e.target.value } : item))
                            )
                          }
                          placeholder="e.g., 500 mg"
                          className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Meal Timing
                        </label>
                        <select
                          value={m.mealTiming}
                          onChange={(e) =>
                            setMeds((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, mealTiming: e.target.value as MealTiming } : item
                              )
                            )
                          }
                          className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                        >
                          {Object.entries(t.meals).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Reminder Time
                        </label>
                        <input
                          type="time"
                          value={m.scheduledTime}
                          onChange={(e) =>
                            setMeds((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, scheduledTime: e.target.value } : item
                              )
                            )
                          }
                          className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Tablets in Stock
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={m.stockQuantity}
                          onChange={(e) =>
                            setMeds((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, stockQuantity: Number(e.target.value) || 0 } : item
                              )
                            )
                          }
                          className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Notes / Instructions
                        </label>
                        <input
                          type="text"
                          value={m.instructions}
                          onChange={(e) =>
                            setMeds((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, instructions: e.target.value } : item
                              )
                            )
                          }
                          className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setMeds((prev) => [
                    ...prev,
                    {
                      name: '',
                      dosage: '',
                      form: 'tablet',
                      mealTiming: 'after_dinner',
                      scheduledTime: '20:30',
                      instructions: 'Take after dinner with water',
                      stockQuantity: 30,
                      refillThreshold: 7,
                    },
                  ])
                }
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-dashed border-teal-400 text-teal-700 dark:text-teal-300 text-sm font-bold inline-flex items-center gap-2 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Another Medicine
              </button>
            </div>
          )}

          {/* STEP 3: REMINDER PREFERENCES */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t.onboarding.step3Title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {t.onboarding.step3Desc}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Repeat Reminder Interval
                  </label>
                  <select
                    value={repeatMinutes}
                    onChange={(e) => setRepeatMinutes(Number(e.target.value))}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base"
                  >
                    <option value={5}>Every 5 minutes</option>
                    <option value={10}>Every 10 minutes (Recommended)</option>
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Notify Caregiver If Unacknowledged After
                  </label>
                  <select
                    value={escalationMinutes}
                    onChange={(e) => setEscalationMinutes(Number(e.target.value))}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes (Recommended)</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceReadAloud}
                  onChange={(e) => setVoiceReadAloud(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-teal-600"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-base">
                    Speak medicine reminders aloud
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    MediMitra will gently announce your medicine name, dosage, and instructions in your chosen language.
                  </div>
                </div>
              </label>

              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sky-950 dark:text-sky-100 text-sm">
                      Enable Browser Notifications
                    </div>
                    <div className="text-xs text-sky-800 dark:text-sky-300 mt-0.5">
                      Receive desktop or mobile browser pop-up reminders while MediMitra is open.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await registerPushNotifications();
                      setNotifStatus(res.message);
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold cursor-pointer"
                  >
                    Allow Notifications
                  </button>
                </div>
                {notifStatus && (
                  <p className="text-xs font-medium text-sky-900 dark:text-sky-200">{notifStatus}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: INVITE CAREGIVER */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t.onboarding.step4Title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {t.onboarding.step4Desc}
                </p>
              </div>

              <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteEnabled}
                  onChange={(e) => setInviteEnabled(e.target.checked)}
                  className="w-5 h-5 accent-teal-600"
                />
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  Invite a family caregiver now (you can also add or revoke anytime later)
                </span>
              </label>

              {inviteEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        Caregiver Name
                      </label>
                      <input
                        type="text"
                        value={caregiverName}
                        onChange={(e) => setCaregiverName(e.target.value)}
                        placeholder="e.g., Ananya Rao"
                        className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        Caregiver Email
                      </label>
                      <input
                        type="email"
                        value={caregiverEmail}
                        onChange={(e) => setCaregiverEmail(e.target.value)}
                        placeholder="family@example.com"
                        className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        Relationship
                      </label>
                      <input
                        type="text"
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        placeholder="Daughter / Son / Spouse"
                        className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Caregiver Permissions
                    </p>
                    <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={receiveMissedAlerts}
                        onChange={(e) => setReceiveMissedAlerts(e.target.checked)}
                        className="w-4 h-4 accent-teal-600"
                      />
                      <span>Notify if a medicine dose is missed after {escalationMinutes} minutes</span>
                    </label>
                    <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canManageSchedules}
                        onChange={(e) => setCanManageSchedules(e.target.checked)}
                        className="w-4 h-4 accent-teal-600"
                      />
                      <span>Allow caregiver to help add or update my medicine schedules</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm inline-flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                {t.common.back}
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setError(null);
                  setSaving(true);
                  try {
                    await skipOnboarding();
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Unable to skip setup right now.');
                  } finally {
                    setSaving(false);
                  }
                }}
                className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Preparing dashboard...' : 'Skip for now'}
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[52px] px-7 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base inline-flex items-center gap-2 cursor-pointer"
              >
                {t.common.next}
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="min-h-[52px] px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-base inline-flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-5 h-5" />
                {saving ? 'Saving Care Plan...' : t.common.finish}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
