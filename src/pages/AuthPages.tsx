import React from 'react';
import { ArrowLeft, HeartHandshake, ShieldCheck, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppLanguage, UserRole } from '../types/medimitra';

export const AuthPage: React.FC<{ mode: 'login' | 'register' }> = ({ mode }) => {
  const {
    navigate,
    selectedRoleForAuth,
    setSelectedRoleForAuth,
    signInWithGoogle,
    enterDemoMode,
    authError,
    clearAuthError,
    language,
    setLanguage,
    t,
  } = useApp();

  const isRegister = mode === 'register';

  const handleGoogleAuth = async (role: UserRole) => {
    clearAuthError();
    await signInWithGoogle(role);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-xl w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => navigate('landing')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 min-h-[44px] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
            {(['en', 'kn', 'hi'] as AppLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  language === lang
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isRegister ? 'Create Your MediMitra Account' : 'Sign In to MediMitra'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Role Selection */}
          <div className="mt-7">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
              {isRegister ? '1. Choose how you will use MediMitra' : 'Select your role'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRoleForAuth('patient')}
                className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                  selectedRoleForAuth === 'patient'
                    ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span>Patient / Senior</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                  Manage my medicines, voice alarms, BP, glucose, and doctor visits.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRoleForAuth('caregiver')}
                className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                  selectedRoleForAuth === 'caregiver'
                    ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <HeartHandshake className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <span>Family Caregiver</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                  Monitor loved ones, receive missed-dose alerts, and help with schedules.
                </p>
              </button>
            </div>
          </div>

          {authError && (
            <div className="mt-5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 p-4 text-sm text-rose-800 dark:text-rose-200">
              {authError}
            </div>
          )}

          {/* Primary Google Authentication */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => handleGoogleAuth(selectedRoleForAuth)}
              className="w-full min-h-[54px] px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base flex items-center justify-center gap-3 shadow-sm transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>
                {isRegister ? 'Continue with Google' : 'Sign In with Google'} (
                {selectedRoleForAuth === 'patient' ? 'Patient' : 'Caregiver'})
              </span>
            </button>
            <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 text-center">
              Protected by Firebase Authentication and role-based Firestore security rules.
            </p>
          </div>

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                New to MediMitra?{' '}
                <button
                  type="button"
                  onClick={() => navigate('register')}
                  className="font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </>
            )}
          </div>

          {/* Clearly Separated Demo Sandbox Section */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-sky-800 dark:text-sky-300">
              Demo Sandbox Mode (Fictional Records for Exploration)
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Explore MediMitra immediately with sample elderly patient Ramesh Rao (Diabetes & Hypertension) or Caregiver Ananya Rao without modifying real accounts.
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => enterDemoMode('patient')}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100 text-sm font-semibold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
              >
                Patient Demo (Ramesh Rao)
              </button>
              <button
                type="button"
                onClick={() => enterDemoMode('caregiver')}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100 text-sm font-semibold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
              >
                Caregiver Demo (Ananya Rao)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
