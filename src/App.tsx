import React from 'react';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SmartAlarmModal } from './components/SmartAlarmModal';
import { AppProvider, useApp } from './context/AppContext';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { AuthPage } from './pages/AuthPages';
import { BpTrackerPage } from './pages/BpTrackerPage';
import { CaregiverDashboardPage } from './pages/CaregiverDashboardPage';
import { DiabetesTrackerPage } from './pages/DiabetesTrackerPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { HealthReportsPage } from './pages/HealthReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { MedicinesPage } from './pages/MedicinesPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { PrescriptionScannerPage } from './pages/PrescriptionScannerPage';
import { SchedulePage } from './pages/SchedulePage';
import { SettingsPage } from './pages/SettingsPage';

const AppRouter: React.FC = () => {
  const { route, authReady, firebaseUser, userAccount, isDemoMode } = useApp();

  const isPublicRoute = route === 'landing' || route === 'login' || route === 'register';
  const isAuthenticated = isDemoMode || Boolean(firebaseUser && userAccount);

  if (!authReady && !isDemoMode && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <img src="/icon.svg" alt="MediMitra" className="w-14 h-14 mx-auto rounded-2xl shadow-sm" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Loading MediMitra safely...
          </p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated visitors on protected routes back to LandingPage
  if (!isAuthenticated && !isPublicRoute) {
    return <LandingPage />;
  }

  if (route === 'landing') return <LandingPage />;
  if (route === 'login') return <AuthPage mode="login" />;
  if (route === 'register') return <AuthPage mode="register" />;
  if (route === 'onboarding') {
    return (
      <>
        <OnboardingPage />
        <SmartAlarmModal />
      </>
    );
  }

  // Caregiver role without completed patient-only onboarding shouldn't get stuck on patient dashboard
  const renderProtectedPage = () => {
    if (
      userAccount?.role === 'patient' &&
      !userAccount.onboardingCompleted &&
      !isDemoMode &&
      route === 'dashboard'
    ) {
      return <OnboardingPage />;
    }

    switch (route) {
      case 'dashboard':
        return userAccount?.role === 'caregiver' ? <CaregiverDashboardPage /> : <PatientDashboard />;
      case 'medicines':
        return <MedicinesPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'history':
        return <HistoryPage />;
      case 'bp-tracker':
        return <BpTrackerPage />;
      case 'diabetes-tracker':
        return <DiabetesTrackerPage />;
      case 'assistant':
        return <AIAssistantPage />;
      case 'scanner':
        return <PrescriptionScannerPage />;
      case 'caregiver':
        return <CaregiverDashboardPage />;
      case 'reports':
        return <HealthReportsPage />;
      case 'appointments':
        return <AppointmentsPage />;
      case 'emergency':
        return <EmergencyPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return userAccount?.role === 'caregiver' ? <CaregiverDashboardPage /> : <PatientDashboard />;
    }
  };

  // If a patient hasn't finished onboarding, render full-screen guided onboarding directly
  if (
    userAccount?.role === 'patient' &&
    !userAccount.onboardingCompleted &&
    !isDemoMode &&
    route === 'dashboard'
  ) {
    return (
      <>
        <OnboardingPage />
        <SmartAlarmModal />
      </>
    );
  }

  return (
    <>
      <AppShell>{renderProtectedPage()}</AppShell>
      <SmartAlarmModal />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </ErrorBoundary>
  );
}
