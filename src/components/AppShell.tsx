import React, { useState } from 'react';
import {
  Activity,
  AlarmClock,
  Bell,
  Bot,
  CalendarDays,
  ChevronDown,
  Droplets,
  FileBarChart2,
  HeartHandshake,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PhoneCall,
  Pill,
  ScanLine,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppLanguage, PageRoute } from '../types/medimitra';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';

interface NavItem {
  route: PageRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    route,
    navigate,
    userAccount,
    isDemoMode,
    demoRole,
    switchDemoRole,
    exitDemoMode,
    signOut,
    language,
    setLanguage,
    t,
    darkMode,
    toggleDarkMode,
    notifications,
    markNotificationRead,
    connectedPatients,
    selectedPatientId,
    setSelectedPatientId,
    patientProfile,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const isCaregiver = userAccount?.role === 'caregiver';
  const unreadNotifs = notifications.filter((n) => !n.read);

  const navItems: NavItem[] = isCaregiver
    ? [
        { route: 'caregiver', label: t.nav.caregiver, icon: HeartHandshake },
        { route: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { route: 'medicines', label: t.nav.medicines, icon: Pill },
        { route: 'schedule', label: t.nav.schedule, icon: AlarmClock },
        { route: 'history', label: t.nav.history, icon: History },
        { route: 'bp-tracker', label: t.nav.bpTracker, icon: Activity },
        { route: 'diabetes-tracker', label: t.nav.diabetesTracker, icon: Droplets },
        { route: 'appointments', label: t.nav.appointments, icon: CalendarDays },
        { route: 'reports', label: t.nav.reports, icon: FileBarChart2 },
        { route: 'assistant', label: t.nav.assistant, icon: Bot },
        { route: 'emergency', label: t.nav.emergency, icon: PhoneCall },
        { route: 'settings', label: t.nav.settings, icon: Settings },
      ]
    : [
        { route: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { route: 'medicines', label: t.nav.medicines, icon: Pill },
        { route: 'schedule', label: t.nav.schedule, icon: AlarmClock },
        { route: 'history', label: t.nav.history, icon: History },
        { route: 'bp-tracker', label: t.nav.bpTracker, icon: Activity },
        { route: 'diabetes-tracker', label: t.nav.diabetesTracker, icon: Droplets },
        { route: 'assistant', label: t.nav.assistant, icon: Bot },
        { route: 'scanner', label: t.nav.scanner, icon: ScanLine },
        { route: 'caregiver', label: t.nav.caregiver, icon: HeartHandshake },
        { route: 'appointments', label: t.nav.appointments, icon: CalendarDays },
        { route: 'reports', label: t.nav.reports, icon: FileBarChart2 },
        { route: 'emergency', label: t.nav.emergency, icon: PhoneCall },
        { route: 'settings', label: t.nav.settings, icon: Settings },
      ];

  const handleNav = (r: PageRoute) => {
    navigate(r);
    setMobileMenuOpen(false);
  };

  const currentPageLabel = navItems.find((n) => n.route === route)?.label || t.brandName;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Isolated Demo Mode Notice Bar */}
      {isDemoMode && (
        <div className="bg-sky-900 text-sky-50 px-4 py-2 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 z-40">
          <div className="flex items-center gap-2 font-medium">
            <span>{t.common.demoModeBanner}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold">
              Viewing as: {demoRole === 'patient' ? 'Ramesh Rao (Patient)' : 'Ananya Rao (Caregiver)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={switchDemoRole}
              className="px-3 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.common.switchDemoRole} ({demoRole === 'patient' ? 'Caregiver' : 'Patient'})
            </button>
            <button
              type="button"
              onClick={exitDemoMode}
              className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.common.exitDemo}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-68 lg:shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
            <img src="/icon.svg" alt="" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold tracking-tight text-teal-700 dark:text-teal-300 font-display whitespace-nowrap">
              {t.brandName}
            </span>
          </div>

          {isCaregiver && connectedPatients.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Monitoring Patient
              </label>
              <div className="relative">
                <select
                  value={selectedPatientId || ''}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 pr-8 text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  {connectedPatients.map((p) => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = route === item.route;
              const isSos = item.route === 'emergency';
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNav(item.route)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
                    active
                      ? isSos
                        ? 'bg-rose-600 text-white'
                        : 'bg-teal-600 text-white'
                      : isSos
                        ? 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {userAccount?.displayName || patientProfile?.fullName || 'MediMitra Account'}
              </div>
              <div className="truncate mt-0.5">
                {userAccount?.role === 'caregiver' ? 'Family Caregiver' : 'Patient Account'}
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              {t.nav.signOut}
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {currentPageLabel}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Language Switcher */}
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {(['en', 'kn', 'hi'] as AppLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      language === lang
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'en' ? 'EN' : lang === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
                  </button>
                ))}
              </div>

              {/* Dark Mode Toggle */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifs.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {unreadNotifs.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Alerts & Notifications
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-500">
                          No alerts right now. You are all caught up.
                        </p>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n.id}
                            className={`py-3 flex items-start justify-between gap-3 ${
                              n.read ? 'opacity-65' : ''
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {n.title}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                                {n.message}
                              </p>
                            </div>
                            {!n.read && (
                              <button
                                type="button"
                                onClick={() => markNotificationRead(n.id)}
                                className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline shrink-0 cursor-pointer"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden md:block">
                <PWAInstallButton variant="compact" />
              </div>

              {/* Emergency SOS Quick Button */}
              <button
                type="button"
                onClick={() => navigate('emergency')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>SOS</span>
              </button>
            </div>
          </header>

          {/* Main Scrollable Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col shadow-xl z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <span className="text-lg font-bold text-teal-700 dark:text-teal-300">
                {t.brandName}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 flex gap-1.5 border-b border-slate-100 dark:border-slate-800">
              {(['en', 'kn', 'hi'] as AppLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    language === lang
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {lang === 'en' ? 'English' : lang === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
                </button>
              ))}
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = route === item.route;
                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => handleNav(item.route)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-left cursor-pointer ${
                      active
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <PWAInstallButton variant="full" />
              <button
                type="button"
                onClick={signOut}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                {t.nav.signOut}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar (Thumb Zone, <= 60px height) */}
      <nav
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4"
      >
        {[
          { route: isCaregiver ? 'caregiver' : 'dashboard', label: 'Home', icon: LayoutDashboard },
          { route: 'medicines', label: 'Meds', icon: Pill },
          { route: 'bp-tracker', label: 'Vitals', icon: Activity },
          { route: 'assistant', label: 'AI Help', icon: Bot },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = route === tab.route;
          return (
            <button
              key={tab.route}
              type="button"
              onClick={() => handleNav(tab.route as PageRoute)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
                active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <OfflineIndicator />
    </div>
  );
};
