import React from 'react';
import {
  Activity,
  AlarmClock,
  ArrowRight,
  Bot,
  HeartHandshake,
  PhoneCall,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from '../components/PWAInstallButton';

export const LandingPage: React.FC = () => {
  const { navigate, enterDemoMode, language, setLanguage, t } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xl font-bold tracking-tight text-teal-700 dark:text-teal-300 font-display whitespace-nowrap shrink-0"
          >
            {t.brandName}
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#capabilities" className="hover:text-teal-700 dark:hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#caregivers" className="hover:text-teal-700 dark:hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              For Families
            </a>
            <a href="#safety" className="hover:text-teal-700 dark:hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              Safety
            </a>
            <a href="#demo" className="hover:text-teal-700 dark:hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              Demo
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('login')}
              className="px-5 py-2.5 min-h-[42px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
              Medication & Elderly Care Companion · English · ಕನ್ನಡ · हिन्दी
            </p>
            <h1
              style={{ textWrap: 'balance' }}
              className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
            >
              Never miss a dose. Never feel alone in your healthcare journey.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              MediMitra helps senior citizens and patients with diabetes or hypertension manage daily medicines with spoken reminders, simple blood pressure and glucose logs, and trusted family caregiver alerts.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('register')}
                className="min-h-[52px] px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => enterDemoMode('patient')}
                className="min-h-[52px] px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-base transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Try Patient Demo
              </button>
              <PWAInstallButton variant="compact" />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Language:</span>
              {(['en', 'kn', 'hi'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                    language === lang
                      ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {lang === 'en' ? 'English' : lang === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[300px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-teal-50 dark:bg-slate-900">
              <img
                src="/src/assets/images/hero_medimitra_care_1794922459891.jpg"
                alt="An elderly father and his daughter sitting warmly at a sunny table reviewing daily medication reminders together"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Full-Width Key Outcomes Strip */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Spoken Reminders', value: '3 Languages', sub: 'English, Kannada, and Hindi read-aloud' },
            { label: 'Missed Dose Escalation', value: 'Auto-Notify', sub: 'Alerts authorized family after delay' },
            { label: 'Prescription Review', value: 'Human-Verified', sub: 'OCR + Gemini draft requiring confirmation' },
            { label: 'Emergency Readiness', value: 'One-Tap SOS', sub: 'Native phone call & optional location' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5"
            >
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities Asymmetric Bento */}
      <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-8 py-14 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Designed for seniors first, trusted by families everywhere
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            Large readable text, calm colors, and zero medical jargon make daily adherence simple and reassuring.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mb-4">
                  <AlarmClock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  01. Smart Meal-Timed Alarms
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Schedule before or after breakfast, lunch, dinner, and bedtime. Prominent full-screen reminders speak aloud and provide Taken, Snooze, and Missed controls—never recommending double doses.
                </p>
              </div>
              <div>
                <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  02. BP & Glucose Trend Tracking
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Track systolic/diastolic pressure, pulse, fasting and post-meal glucose against doctor-configured targets with PDF reports ready for clinic visits.
                </p>
              </div>
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  03. Multilingual AI Companion
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ask by voice or text in English, Kannada, or Hindi about today&apos;s medicines, missed doses, or recent readings—strictly scoped to your authorized records.
                </p>
              </div>
              <div>
                <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center mb-4">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  04. One-Tap Emergency SOS
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Instantly call primary family contacts or doctors using your phone&apos;s native dialer, with optional permission-based location sharing.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800">
              <img
                src="/src/assets/images/prescription_scan_desk_1794922462391.jpg"
                alt="Weekly pill organizer, reading glasses, and printed prescription alongside a mobile health app"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 text-sm font-semibold">
                  <ScanLine className="w-4 h-4" />
                  <span>Prescription Scanner</span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  OCR + AI Draft with Mandatory Human Review
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Upload a prescription photo to draft medicine names and timings. Unclear handwriting is flagged—nothing is saved without your explicit confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Caregiver Section */}
      <section id="caregivers" className="max-w-7xl mx-auto px-4 sm:px-8 py-14 border-t border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
            <img
              src="/src/assets/images/caregiver_family_connect_1794922462618.jpg"
              alt="Cheerful senior woman checking her smartphone in a bright living room"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
              <HeartHandshake className="w-5 h-5" />
              <span>Patient-Controlled Caregiver Sharing</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Keep family caregivers informed without losing privacy
            </h2>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Patients decide exactly who can view medication adherence, BP and glucose trends, low-stock alerts, or edit schedules—and can revoke access at any moment.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <p className="font-bold text-slate-900 dark:text-white">Missed Dose Escalation</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  If a scheduled dose remains unacknowledged past your configured delay, caregivers receive an alert.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <p className="font-bold text-slate-900 dark:text-white">Stock & Refill Tracking</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Stock decreases only when doses are marked taken, alerting caregivers when pills run low.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Demo Section */}
      <section id="demo" className="max-w-7xl mx-auto px-4 sm:px-8 py-14 border-t border-slate-200 dark:border-slate-800">
        <div id="safety" className="rounded-3xl bg-teal-900 text-white p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-teal-200 text-sm font-semibold">
              <ShieldCheck className="w-5 h-5" />
              <span>Medical Safety & Role-Based Privacy</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold">
              Explore MediMitra immediately with our Demo Sandbox
            </h2>
            <p className="mt-3 text-sm sm:text-base text-teal-100 leading-relaxed">
              Demo Mode uses clearly labeled fictional records (Ramesh Rao, age 72, managing Type 2 Diabetes & Hypertension) completely separated from real Firebase patient accounts. MediMitra never diagnoses, prescribes, or recommends double-dosing.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3">
            <button
              type="button"
              onClick={() => enterDemoMode('patient')}
              className="min-h-[52px] px-6 py-3.5 rounded-2xl bg-white text-teal-950 hover:bg-teal-50 font-bold text-base transition-colors cursor-pointer"
            >
              Launch Demo as Elderly Patient
            </button>
            <button
              type="button"
              onClick={() => enterDemoMode('caregiver')}
              className="min-h-[52px] px-6 py-3.5 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white border border-teal-500 font-bold text-base transition-colors cursor-pointer"
            >
              Launch Demo as Family Caregiver
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200">MediMitra</span>
            <span className="mx-2">·</span>
            <span>{t.common.medicalDisclaimer}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button type="button" onClick={() => navigate('login')} className="hover:underline cursor-pointer">
              Sign In
            </button>
            <button type="button" onClick={() => navigate('register')} className="hover:underline cursor-pointer">
              Register
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
