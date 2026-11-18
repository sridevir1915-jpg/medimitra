import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, requestFCMToken, testConnection } from '../lib/firebase';
import { createInitialDemoSandbox, DEMO_CAREGIVER_UID, DEMO_PATIENT_UID, DemoSandboxState } from '../lib/demoData';
import { getLocalDateString, getLocalWeekday } from '../lib/dateUtils';
import { playGentleReminderChime, speakText, stopSpeaking } from '../lib/speechAndAudio';
import { TRANSLATIONS, TranslationBundle } from '../i18n/translations';
import {
  ActiveAlarm,
  AppLanguage,
  Appointment,
  AuditLog,
  CaregiverConnection,
  CaregiverPermissions,
  DoseStatus,
  EmergencyContact,
  HealthReading,
  MealTiming,
  MedicationLog,
  MedicationSchedule,
  Medicine,
  MedicineForm,
  NotificationItem,
  OperationType,
  PageRoute,
  PatientProfile,
  PrescriptionRecord,
  ReadingFlagLevel,
  UserAccount,
  UserRole,
} from '../types/medimitra';

const VALID_PROTECTED_ROUTES: PageRoute[] = [
  'dashboard',
  'medicines',
  'schedule',
  'history',
  'bp-tracker',
  'diabetes-tracker',
  'assistant',
  'scanner',
  'caregiver',
  'reports',
  'appointments',
  'emergency',
  'settings',
  'onboarding',
];

function getInitialRouteFromHash(): PageRoute {
  if (typeof window === 'undefined') return 'landing';
  const raw = window.location.hash.replace(/^#/, '') as PageRoute;
  if (VALID_PROTECTED_ROUTES.includes(raw) || raw === 'login' || raw === 'register') {
    return raw;
  }
  return 'landing';
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getTodayDateStr(): string {
  return getLocalDateString();
}

function getTodayWeekday(): string {
  return getLocalWeekday();
}

export function evaluateBpFlag(
  sys: number,
  dia: number,
  profile?: PatientProfile | null
): { flagged: boolean; flagLevel: ReadingFlagLevel } {
  const highSys = profile?.bpHighThresholdSys ?? 140;
  const highDia = profile?.bpHighThresholdDia ?? 90;
  if (sys >= 180 || dia >= 120) return { flagged: true, flagLevel: 'urgent' };
  if (sys < 90 || dia < 60) return { flagged: true, flagLevel: 'low' };
  if (sys >= highSys || dia >= highDia) return { flagged: true, flagLevel: 'high' };
  if (sys >= 125 || dia >= 80) return { flagged: false, flagLevel: 'elevated' };
  return { flagged: false, flagLevel: 'normal' };
}

export function evaluateGlucoseFlag(
  value: number,
  context: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime',
  profile?: PatientProfile | null
): { flagged: boolean; flagLevel: ReadingFlagLevel } {
  const fastingMax = profile?.glucoseFastingMax ?? 125;
  const postMax = profile?.glucosePostMealMax ?? 180;
  if (value < 70) return { flagged: true, flagLevel: value < 55 ? 'urgent' : 'low' };
  if (value >= 300) return { flagged: true, flagLevel: 'urgent' };
  const threshold = context === 'after_meal' ? postMax : fastingMax;
  if (value > threshold) return { flagged: true, flagLevel: 'high' };
  if (context === 'fasting' && value > 100) return { flagged: false, flagLevel: 'elevated' };
  return { flagged: false, flagLevel: 'normal' };
}

interface AppContextValue {
  route: PageRoute;
  navigate: (r: PageRoute) => void;
  authReady: boolean;
  firebaseUser: User | null;
  userAccount: UserAccount | null;
  isDemoMode: boolean;
  demoRole: UserRole;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: TranslationBundle;
  darkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  seniorFontMode: boolean;
  toggleSeniorFontMode: () => Promise<void>;
  firestoreOnline: boolean;
  selectedRoleForAuth: UserRole;
  setSelectedRoleForAuth: (r: UserRole) => void;
  signInWithGoogle: (role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: (role: UserRole) => void;
  switchDemoRole: () => void;
  exitDemoMode: () => void;
  authError: string | null;
  clearAuthError: () => void;

  // Active patient context (either self as patient or selected connected patient as caregiver)
  patientProfile: PatientProfile | null;
  connectedPatients: PatientProfile[];
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string) => void;
  canCurrentUserEditPatient: boolean;
  activeCaregiverPermissions: CaregiverPermissions | null;
  caregiverConnections: CaregiverConnection[];
  medicines: Medicine[];
  schedules: MedicationSchedule[];
  logs: MedicationLog[];
  readings: HealthReading[];
  prescriptions: PrescriptionRecord[];
  appointments: Appointment[];
  emergencyContacts: EmergencyContact[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];

  // Smart Reminder Alarm state
  activeAlarm: ActiveAlarm | null;
  dismissAlarm: () => void;
  triggerTestAlarm: (schedule?: MedicationSchedule) => void;
  recordDoseAction: (
    schedule: MedicationSchedule,
    status: DoseStatus,
    notes?: string
  ) => Promise<void>;
  correctMedicationLog: (
    log: MedicationLog,
    newStatus: DoseStatus,
    reason: string
  ) => Promise<void>;

  // Onboarding & Profile actions
  completeOnboarding: (payload: {
    profile: {
      fullName: string;
      age: number;
      conditions: string[];
      preferredLanguage: AppLanguage;
      primaryDoctorName: string;
      primaryClinic: string;
      reminderRepeatMinutes: number;
      escalationDelayMinutes: number;
      voiceReadAloud: boolean;
      bpHighThresholdSys: number;
      bpHighThresholdDia: number;
      glucoseFastingMax: number;
      glucosePostMealMax: number;
    };
    initialMedicines: Array<{
      name: string;
      dosage: string;
      form: MedicineForm;
      mealTiming: MealTiming;
      scheduledTime: string;
      instructions: string;
      stockQuantity: number;
      refillThreshold: number;
    }>;
    caregiverInvite?: {
      caregiverName: string;
      caregiverEmail: string;
      relationship: string;
      permissions: CaregiverPermissions;
    } | null;
  }) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  updatePatientSettings: (updates: Partial<PatientProfile>) => Promise<void>;

  // CRUD Actions
  saveMedicineWithSchedule: (input: {
    existingId?: string;
    name: string;
    dosage: string;
    form: MedicineForm;
    instructions: string;
    frequency: string;
    mealTimings: MealTiming[];
    customTimes: string[];
    startDate: string;
    endDate: string;
    stockQuantity: number;
    refillThreshold: number;
    doctorRef: string;
    isActive: boolean;
  }) => Promise<void>;
  deleteMedicine: (medicineId: string) => Promise<void>;
  restockMedicine: (medicineId: string, addQty: number) => Promise<void>;
  updateLowStockThreshold: (threshold: number, applyToAllMedicines?: boolean) => Promise<void>;
  updateMedicineThreshold: (medicineId: string, threshold: number) => Promise<void>;

  addHealthReading: (input: {
    type: 'bp' | 'glucose';
    measuredAt: string;
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    glucoseValue?: number;
    glucoseContext?: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime';
    notes?: string;
  }) => Promise<void>;

  saveConfirmedPrescription: (input: {
    doctorName: string;
    clinicName: string;
    prescriptionDate: string;
    ocrRawText: string;
    medicines: Array<{
      name: string;
      dosage: string;
      form: MedicineForm;
      frequency: string;
      mealTiming: MealTiming;
      instructions: string;
      confidence: 'high' | 'medium' | 'unclear';
      unclearNote: string;
    }>;
  }) => Promise<void>;

  saveAppointment: (input: Partial<Appointment> & { doctorName: string; clinicName: string; appointmentDate: string; appointmentTime: string }) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;

  saveEmergencyContact: (input: Partial<EmergencyContact> & { name: string; relationship: string; phone: string }) => Promise<void>;
  deleteEmergencyContact: (id: string) => Promise<void>;

  inviteCaregiver: (input: {
    caregiverName: string;
    caregiverEmail: string;
    relationship: string;
    escalationDelayMinutes: number;
    permissions: CaregiverPermissions;
  }) => Promise<void>;
  respondCaregiverInvite: (conn: CaregiverConnection, accept: boolean) => Promise<void>;
  updateCaregiverPermissions: (conn: CaregiverConnection, permissions: CaregiverPermissions) => Promise<void>;
  revokeCaregiver: (conn: CaregiverConnection) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  registerPushNotifications: () => Promise<{ ok: boolean; message: string }>;
  getAuthTokenHeader: () => Promise<Record<string, string>>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<PageRoute>(getInitialRouteFromHash);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [selectedRoleForAuth, setSelectedRoleForAuth] = useState<UserRole>('patient');
  const [authError, setAuthError] = useState<string | null>(null);
  const [firestoreOnline, setFirestoreOnline] = useState(true);

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoRole, setDemoRole] = useState<UserRole>('patient');
  const [demoSandbox, setDemoSandbox] = useState<DemoSandboxState>(() => createInitialDemoSandbox());

  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [darkMode, setDarkMode] = useState(false);
  const [seniorFontMode, setSeniorFontMode] = useState(false);

  // Refs so Firebase Auth listener stays mounted once and always reads latest auth preference
  const selectedRoleRef = useRef<UserRole>(selectedRoleForAuth);
  const languageRef = useRef<AppLanguage>(language);
  const darkModeRef = useRef<boolean>(darkMode);
  const seniorFontModeRef = useRef<boolean>(seniorFontMode);
  const isDemoModeRef = useRef<boolean>(isDemoMode);
  selectedRoleRef.current = selectedRoleForAuth;
  languageRef.current = language;
  darkModeRef.current = darkMode;
  seniorFontModeRef.current = seniorFontMode;
  isDemoModeRef.current = isDemoMode;

  // Real Firestore state
  const [fsPatientProfile, setFsPatientProfile] = useState<PatientProfile | null>(null);
  const [fsConnectedPatients, setFsConnectedPatients] = useState<PatientProfile[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [fsConnections, setFsConnections] = useState<CaregiverConnection[]>([]);
  const [fsMedicines, setFsMedicines] = useState<Medicine[]>([]);
  const [fsSchedules, setFsSchedules] = useState<MedicationSchedule[]>([]);
  const [fsLogs, setFsLogs] = useState<MedicationLog[]>([]);
  const [fsReadings, setFsReadings] = useState<HealthReading[]>([]);
  const [fsPrescriptions, setFsPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [fsAppointments, setFsAppointments] = useState<Appointment[]>([]);
  const [fsEmergencyContacts, setFsEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [fsNotifications, setFsNotifications] = useState<NotificationItem[]>([]);
  const [fsAuditLogs, setFsAuditLogs] = useState<AuditLog[]>([]);

  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const snoozedTimersRef = useRef<Record<string, number>>({});
  const triggeredSlotsRef = useRef<Set<string>>(new Set());

  const navigate = useCallback((nextRoute: PageRoute) => {
    setRoute(nextRoute);
    if (typeof window !== 'undefined' && !isDemoModeRef.current) {
      const nextHash = nextRoute === 'landing' ? '' : `#${nextRoute}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash || window.location.pathname + window.location.search);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Apply Dark Mode & Senior Font classes to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('senior-font', seniorFontMode);
  }, [seniorFontMode]);

  // Startup Firestore connectivity verification
  useEffect(() => {
    testConnection().then((res) => {
      if (res.offlineError) setFirestoreOnline(false);
    });
  }, []);

  // Firebase Auth listener (mounted once; persists across refreshes via browserLocalPersistence)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserAccount(null);
        setFsPatientProfile(null);
        setFsConnectedPatients([]);
        setSelectedPatientId(null);
        setFsConnections([]);
        setFsMedicines([]);
        setFsSchedules([]);
        setFsLogs([]);
        setFsReadings([]);
        setFsPrescriptions([]);
        setFsAppointments([]);
        setFsEmergencyContacts([]);
        setFsNotifications([]);
        setFsAuditLogs([]);
        setRoute((prev) => (prev === 'login' || prev === 'register' ? prev : 'landing'));
        setAuthReady(true);
        return;
      }

      setIsDemoMode(false);
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const acct = snap.data() as UserAccount;
          setUserAccount(acct);
          setLanguageState(acct.preferredLanguage || 'en');
          setDarkMode(Boolean(acct.darkMode));
          setSeniorFontMode(Boolean(acct.seniorFontMode));
          if (acct.role === 'patient') {
            setSelectedPatientId(user.uid);
            setRoute((prev) => {
              if (!acct.onboardingCompleted) return 'onboarding';
              if (prev === 'landing' || prev === 'login' || prev === 'register') return 'dashboard';
              return prev;
            });
          } else {
            setRoute((prev) =>
              prev === 'landing' || prev === 'login' || prev === 'register' ? 'caregiver' : prev
            );
          }
        } else {
          const roleChoice = selectedRoleRef.current;
          const safeEmail = (user.email || `${user.uid}@medimitra.local`).trim().slice(0, 160);
          const safeDisplayName = (user.displayName || 'MediMitra User').trim().slice(0, 80) || 'MediMitra User';
          const newAcct: UserAccount = {
            uid: user.uid,
            email: safeEmail,
            displayName: safeDisplayName,
            role: roleChoice,
            preferredLanguage: languageRef.current,
            onboardingCompleted: roleChoice === 'caregiver',
            darkMode: darkModeRef.current,
            seniorFontMode: seniorFontModeRef.current,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newAcct);
          setUserAccount(newAcct);
          if (roleChoice === 'patient') {
            setSelectedPatientId(user.uid);
            setRoute('onboarding');
          } else {
            setRoute('caregiver');
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listeners (strictly gated on authReady && firebaseUser && !isDemoMode)
  useEffect(() => {
    if (!authReady || !firebaseUser || !userAccount || isDemoMode) return;

    const uid = firebaseUser.uid;
    const unsubs: Array<() => void> = [];

    if (userAccount.role === 'patient') {
      unsubs.push(
        onSnapshot(
          doc(db, 'patientProfiles', uid),
          (snap) => {
            setFsPatientProfile(snap.exists() ? (snap.data() as PatientProfile) : null);
          },
          (err) => handleFirestoreError(err, OperationType.GET, `patientProfiles/${uid}`)
        )
      );

      const patientScopedCollections = [
        { name: 'medicines', setter: setFsMedicines },
        { name: 'medicationSchedules', setter: setFsSchedules },
        { name: 'medicationLogs', setter: setFsLogs },
        { name: 'healthReadings', setter: setFsReadings },
        { name: 'prescriptions', setter: setFsPrescriptions },
        { name: 'appointments', setter: setFsAppointments },
        { name: 'emergencyContacts', setter: setFsEmergencyContacts },
        { name: 'notifications', setter: setFsNotifications },
        { name: 'auditLogs', setter: setFsAuditLogs },
        { name: 'caregiverConnections', setter: setFsConnections },
      ] as const;

      for (const col of patientScopedCollections) {
        const q = query(collection(db, col.name), where('patientId', '==', uid));
        unsubs.push(
          onSnapshot(
            q,
            (snap) => {
              const items = snap.docs.map((d) => d.data());
              (col.setter as React.Dispatch<React.SetStateAction<unknown[]>>)(items);
            },
            (err) => handleFirestoreError(err, OperationType.LIST, col.name)
          )
        );
      }
    } else {
      // Caregiver role: listen to caregiverConnections by caregiverId & verified email
      let byIdList: CaregiverConnection[] = [];
      let byEmailList: CaregiverConnection[] = [];
      const mergeConnections = () => {
        const map = new Map<string, CaregiverConnection>();
        [...byIdList, ...byEmailList].forEach((c) => map.set(c.id, c));
        setFsConnections(Array.from(map.values()));
      };

      unsubs.push(
        onSnapshot(
          query(collection(db, 'caregiverConnections'), where('caregiverId', '==', uid)),
          (snap) => {
            byIdList = snap.docs.map((d) => d.data() as CaregiverConnection);
            mergeConnections();
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'caregiverConnections')
        )
      );

      if (firebaseUser.email && firebaseUser.emailVerified) {
        unsubs.push(
          onSnapshot(
            query(
              collection(db, 'caregiverConnections'),
              where('caregiverEmail', '==', firebaseUser.email.trim().toLowerCase())
            ),
            (snap) => {
              byEmailList = snap.docs.map((d) => d.data() as CaregiverConnection);
              mergeConnections();
            },
            (err) => handleFirestoreError(err, OperationType.LIST, 'caregiverConnections')
          )
        );
      }

      unsubs.push(
        onSnapshot(
          query(collection(db, 'patientProfiles'), where('authorizedCaregiverIds', 'array-contains', uid)),
          (snap) => {
            const profiles = snap.docs.map((d) => d.data() as PatientProfile);
            setFsConnectedPatients(profiles);
            setSelectedPatientId((curr) => {
              if (curr && profiles.some((p) => p.patientId === curr)) return curr;
              return profiles[0]?.patientId || null;
            });
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'patientProfiles')
        )
      );

      const caregiverCollections = [
        { name: 'medicines', setter: setFsMedicines },
        { name: 'medicationSchedules', setter: setFsSchedules },
        { name: 'medicationLogs', setter: setFsLogs },
        { name: 'healthReadings', setter: setFsReadings },
        { name: 'prescriptions', setter: setFsPrescriptions },
        { name: 'appointments', setter: setFsAppointments },
        { name: 'emergencyContacts', setter: setFsEmergencyContacts },
        { name: 'notifications', setter: setFsNotifications },
        { name: 'auditLogs', setter: setFsAuditLogs },
      ] as const;

      for (const col of caregiverCollections) {
        const q = query(collection(db, col.name), where('authorizedCaregiverIds', 'array-contains', uid));
        unsubs.push(
          onSnapshot(
            q,
            (snap) => {
              const items = snap.docs.map((d) => d.data());
              (col.setter as React.Dispatch<React.SetStateAction<unknown[]>>)(items);
            },
            (err) => handleFirestoreError(err, OperationType.LIST, col.name)
          )
        );
      }
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, userAccount, isDemoMode]);

  // Unified derived view (Demo Sandbox vs Real Firestore)
  const activeUserAccount = isDemoMode
    ? demoRole === 'patient'
      ? demoSandbox.patientUser
      : demoSandbox.caregiverUser
    : userAccount;

  const activePatientProfile = useMemo(() => {
    if (isDemoMode) return demoSandbox.patientProfile;
    if (userAccount?.role === 'patient') return fsPatientProfile;
    return fsConnectedPatients.find((p) => p.patientId === selectedPatientId) || fsConnectedPatients[0] || null;
  }, [isDemoMode, demoSandbox.patientProfile, userAccount, fsPatientProfile, fsConnectedPatients, selectedPatientId]);

  const activePatientId = activePatientProfile?.patientId || (userAccount?.role === 'patient' ? firebaseUser?.uid || null : null);

  const filterBySelectedPatient = useCallback(
    <T extends { patientId: string }>(items: T[]): T[] => {
      if (isDemoMode) return items;
      if (!activePatientId) return [];
      return items.filter((item) => item.patientId === activePatientId);
    },
    [isDemoMode, activePatientId]
  );

  const medicines = useMemo(
    () => (isDemoMode ? demoSandbox.medicines : filterBySelectedPatient(fsMedicines)),
    [isDemoMode, demoSandbox.medicines, filterBySelectedPatient, fsMedicines]
  );
  const schedules = useMemo(
    () => (isDemoMode ? demoSandbox.schedules : filterBySelectedPatient(fsSchedules)),
    [isDemoMode, demoSandbox.schedules, filterBySelectedPatient, fsSchedules]
  );
  const activeCaregiverPermissions = useMemo<CaregiverPermissions | null>(() => {
    if (isDemoMode || !firebaseUser || userAccount?.role !== 'caregiver' || !activePatientId) {
      return null;
    }
    const conn = fsConnections.find(
      (c) =>
        c.patientId === activePatientId &&
        c.status === 'active' &&
        (c.caregiverId === firebaseUser.uid ||
          (firebaseUser.email && c.caregiverEmail === firebaseUser.email.trim().toLowerCase()))
    );
    return conn?.permissions || null;
  }, [isDemoMode, firebaseUser, userAccount, activePatientId, fsConnections]);

  const logs = useMemo(() => {
    if (isDemoMode) return demoSandbox.logs;
    if (activeCaregiverPermissions && !activeCaregiverPermissions.canViewLogs) return [];
    return filterBySelectedPatient(fsLogs);
  }, [isDemoMode, demoSandbox.logs, activeCaregiverPermissions, filterBySelectedPatient, fsLogs]);

  const readings = useMemo(() => {
    if (isDemoMode) return demoSandbox.readings;
    if (activeCaregiverPermissions && !activeCaregiverPermissions.canViewVitals) return [];
    return filterBySelectedPatient(fsReadings);
  }, [isDemoMode, demoSandbox.readings, activeCaregiverPermissions, filterBySelectedPatient, fsReadings]);

  const prescriptions = useMemo(
    () => (isDemoMode ? demoSandbox.prescriptions : filterBySelectedPatient(fsPrescriptions)),
    [isDemoMode, demoSandbox.prescriptions, filterBySelectedPatient, fsPrescriptions]
  );
  const appointments = useMemo(
    () => (isDemoMode ? demoSandbox.appointments : filterBySelectedPatient(fsAppointments)),
    [isDemoMode, demoSandbox.appointments, filterBySelectedPatient, fsAppointments]
  );
  const emergencyContacts = useMemo(
    () => (isDemoMode ? demoSandbox.emergencyContacts : filterBySelectedPatient(fsEmergencyContacts)),
    [isDemoMode, demoSandbox.emergencyContacts, filterBySelectedPatient, fsEmergencyContacts]
  );
  const notifications = useMemo(
    () => (isDemoMode ? demoSandbox.notifications : fsNotifications),
    [isDemoMode, demoSandbox.notifications, fsNotifications]
  );
  const auditLogs = useMemo(() => {
    if (isDemoMode) return demoSandbox.auditLogs;
    if (activeCaregiverPermissions && !activeCaregiverPermissions.canViewLogs) return [];
    return filterBySelectedPatient(fsAuditLogs);
  }, [isDemoMode, demoSandbox.auditLogs, activeCaregiverPermissions, filterBySelectedPatient, fsAuditLogs]);

  const caregiverConnections = useMemo(
    () => (isDemoMode ? demoSandbox.caregiverConnections : fsConnections),
    [isDemoMode, demoSandbox.caregiverConnections, fsConnections]
  );

  const canCurrentUserEditPatient = useMemo(() => {
    if (isDemoMode) return true;
    if (!firebaseUser || !activePatientProfile) return false;
    if (activePatientProfile.patientId === firebaseUser.uid) return true;
    return (
      activePatientProfile.caregiverCanEditIds.includes(firebaseUser.uid) ||
      Boolean(activeCaregiverPermissions?.canManageSchedules)
    );
  }, [isDemoMode, firebaseUser, activePatientProfile, activeCaregiverPermissions]);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const getAuthTokenHeader = useCallback(async (): Promise<Record<string, string>> => {
    if (isDemoMode) {
      return { 'x-medimitra-demo': 'true' };
    }
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken();
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }, [isDemoMode, firebaseUser]);

  // Auth Actions
  const signInWithGoogle = useCallback(
    async (role?: UserRole) => {
      setAuthError(null);
      if (role) setSelectedRoleForAuth(role);
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
        setAuthError(msg);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    stopSpeaking();
    setActiveAlarm(null);
    if (isDemoMode) {
      setIsDemoMode(false);
      navigate('landing');
      return;
    }
    await firebaseSignOut(auth);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setRoute('landing');
  }, [isDemoMode, navigate]);

  const enterDemoMode = useCallback((role: UserRole) => {
    setDemoSandbox(createInitialDemoSandbox());
    setIsDemoMode(true);
    setDemoRole(role);
    setSelectedPatientId(DEMO_PATIENT_UID);
    setRoute(role === 'patient' ? 'dashboard' : 'caregiver');
  }, []);

  const switchDemoRole = useCallback(() => {
    setDemoRole((prev) => {
      const next = prev === 'patient' ? 'caregiver' : 'patient';
      setRoute(next === 'patient' ? 'dashboard' : 'caregiver');
      return next;
    });
  }, []);

  const exitDemoMode = useCallback(() => {
    stopSpeaking();
    setActiveAlarm(null);
    setIsDemoMode(false);
    setRoute('landing');
  }, []);

  const setLanguage = useCallback(
    async (lang: AppLanguage) => {
      setLanguageState(lang);
      if (!isDemoMode && firebaseUser && userAccount) {
        try {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            preferredLanguage: lang,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        }
      }
    },
    [isDemoMode, firebaseUser, userAccount]
  );

  const toggleDarkMode = useCallback(async () => {
    const next = !darkMode;
    setDarkMode(next);
    if (!isDemoMode && firebaseUser && userAccount) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          darkMode: next,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    }
  }, [darkMode, isDemoMode, firebaseUser, userAccount]);

  const toggleSeniorFontMode = useCallback(async () => {
    const next = !seniorFontMode;
    setSeniorFontMode(next);
    if (!isDemoMode && firebaseUser && userAccount) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          seniorFontMode: next,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    }
  }, [seniorFontMode, isDemoMode, firebaseUser, userAccount]);

  // Helper to get current patient ACL arrays
  const getAclArrays = useCallback(() => {
    return {
      authorizedCaregiverIds: activePatientProfile?.authorizedCaregiverIds || [],
      caregiverCanEditIds: activePatientProfile?.caregiverCanEditIds || [],
    };
  }, [activePatientProfile]);

  // Record Dose Action (Taken / Snoozed / Missed) + Stock Decrement + Refill Alert + Caregiver Escalation
  const recordDoseAction = useCallback(
    async (schedule: MedicationSchedule, status: DoseStatus, notes?: string) => {
      if (!activePatientId) return;
      const todayStr = getTodayDateStr();
      const slot = `${todayStr}T${schedule.scheduledTime}`;
      const existingLog = logs.find(
        (l) => l.scheduleId === schedule.id && l.scheduledFor === slot
      );
      const med = medicines.find((m) => m.id === schedule.medicineId);
      const actorUid = isDemoMode
        ? demoRole === 'patient'
          ? DEMO_PATIENT_UID
          : DEMO_CAREGIVER_UID
        : firebaseUser?.uid || activePatientId;
      const actorRole: 'patient' | 'caregiver' = activeUserAccount?.role || 'patient';
      const nowIso = new Date().toISOString();
      const acl = getAclArrays();

      const nextSnoozeCount =
        status === 'snoozed' ? (existingLog?.snoozeCount || 0) + 1 : existingLog?.snoozeCount || 0;
      const shouldEscalate = status === 'missed';

      if (status === 'snoozed') {
        const delayMs = (schedule.repeatIntervalMinutes || 10) * 60 * 1000;
        snoozedTimersRef.current[slot] = Date.now() + delayMs;
      } else {
        delete snoozedTimersRef.current[slot];
      }

      if (isDemoMode) {
        setDemoSandbox((prev) => {
          const updatedLogs = existingLog
            ? prev.logs.map((l) =>
                l.id === existingLog.id
                  ? {
                      ...l,
                      status,
                      actionAt: nowIso,
                      recordedByUid: actorUid,
                      recordedByRole: actorRole,
                      snoozeCount: nextSnoozeCount,
                      escalatedToCaregiver: l.escalatedToCaregiver || shouldEscalate,
                      notes: notes || l.notes,
                    }
                  : l
              )
            : [
                {
                  id: makeId('demo_log'),
                  patientId: activePatientId,
                  medicineId: schedule.medicineId,
                  medicineName: schedule.medicineName,
                  dosage: schedule.dosage,
                  scheduleId: schedule.id,
                  scheduledFor: slot,
                  status,
                  actionAt: nowIso,
                  recordedByUid: actorUid,
                  recordedByRole: actorRole,
                  snoozeCount: nextSnoozeCount,
                  escalatedToCaregiver: shouldEscalate,
                  notes,
                  ...acl,
                },
                ...prev.logs,
              ];

          let updatedMedicines = prev.medicines;
          const addedNotifications: NotificationItem[] = [];
          if (status === 'taken' && existingLog?.status !== 'taken' && med) {
            const newQty = Math.max(0, med.stockQuantity - 1);
            const medThreshold = med.refillThreshold ?? prev.patientProfile.defaultLowStockThreshold ?? 7;
            updatedMedicines = prev.medicines.map((m) =>
              m.id === med.id ? { ...m, stockQuantity: newQty } : m
            );
            if (newQty < medThreshold) {
              addedNotifications.push({
                id: makeId('demo_notif'),
                patientId: activePatientId,
                recipientUid: DEMO_CAREGIVER_UID,
                type: 'refill_low',
                title: `Low Stock: ${med.name} (${med.dosage})`,
                message: `Only ${newQty} remaining (below low stock threshold of ${medThreshold}).`,
                severity: 'warning',
                read: false,
                authorizedCaregiverIds: acl.authorizedCaregiverIds,
              });
            }
          }

          if (shouldEscalate) {
            addedNotifications.push({
              id: makeId('demo_notif'),
              patientId: activePatientId,
              recipientUid: DEMO_CAREGIVER_UID,
              type: 'missed_escalation',
              title: `Missed Dose Alert: ${schedule.medicineName}`,
              message: `${prev.patientProfile.fullName} marked ${schedule.medicineName} (${schedule.dosage}) for ${schedule.scheduledTime} as missed.`,
              severity: 'urgent',
              read: false,
              authorizedCaregiverIds: acl.authorizedCaregiverIds,
            });
          }

          return {
            ...prev,
            logs: updatedLogs,
            medicines: updatedMedicines,
            notifications: [...addedNotifications, ...prev.notifications],
          };
        });
        setActiveAlarm(null);
        stopSpeaking();
        return;
      }

      if (!firebaseUser || !canCurrentUserEditPatient) return;
      const safeNotes = notes?.trim() ? notes.trim().slice(0, 300) : '';
      try {
        const logId = existingLog?.id || makeId('log');
        const logRef = doc(db, 'medicationLogs', logId);
        if (existingLog) {
          await updateDoc(logRef, {
            status,
            actionAt: nowIso,
            recordedByUid: firebaseUser.uid,
            recordedByRole: actorRole,
            snoozeCount: nextSnoozeCount,
            escalatedToCaregiver: existingLog.escalatedToCaregiver || shouldEscalate,
            ...(safeNotes ? { notes: safeNotes } : {}),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(logRef, {
            id: logId,
            patientId: activePatientId,
            medicineId: schedule.medicineId,
            medicineName: schedule.medicineName.slice(0, 120),
            dosage: schedule.dosage.slice(0, 60),
            scheduleId: schedule.id,
            scheduledFor: slot.slice(0, 40),
            status,
            actionAt: nowIso,
            recordedByUid: firebaseUser.uid,
            recordedByRole: actorRole,
            snoozeCount: nextSnoozeCount,
            escalatedToCaregiver: shouldEscalate,
            ...(safeNotes ? { notes: safeNotes } : {}),
            ...acl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // Decrement stock ONLY when confirmed taken (and not already taken)
        if (status === 'taken' && existingLog?.status !== 'taken' && med) {
          const newQty = Math.max(0, med.stockQuantity - 1);
          const medThreshold = med.refillThreshold ?? activePatientProfile?.defaultLowStockThreshold ?? 7;
          await updateDoc(doc(db, 'medicines', med.id), {
            stockQuantity: newQty,
            updatedAt: serverTimestamp(),
          });
          if (newQty < medThreshold) {
            const notifId = makeId('notif');
            await setDoc(doc(db, 'notifications', notifId), {
              id: notifId,
              patientId: activePatientId,
              recipientUid: (acl.authorizedCaregiverIds[0] || activePatientId).slice(0, 128),
              type: 'refill_low',
              title: `Low Stock: ${med.name} (${med.dosage})`.slice(0, 120),
              message: `Only ${newQty} remaining (below low stock threshold of ${medThreshold}). Please arrange a refill.`.slice(0, 500),
              severity: 'warning',
              read: false,
              authorizedCaregiverIds: acl.authorizedCaregiverIds,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }

        if (shouldEscalate && acl.authorizedCaregiverIds.length > 0) {
          const notifId = makeId('notif');
          await setDoc(doc(db, 'notifications', notifId), {
            id: notifId,
            patientId: activePatientId,
            recipientUid: acl.authorizedCaregiverIds[0].slice(0, 128),
            type: 'missed_escalation',
            title: `Missed Dose Alert: ${schedule.medicineName}`.slice(0, 120),
            message: `${activePatientProfile?.fullName || 'Patient'} missed ${schedule.medicineName} (${schedule.dosage}) scheduled at ${schedule.scheduledTime}.`.slice(0, 500),
            severity: 'urgent',
            read: false,
            authorizedCaregiverIds: acl.authorizedCaregiverIds,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        setActiveAlarm(null);
        stopSpeaking();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'medicationLogs');
      }
    },
    [
      activePatientId,
      logs,
      medicines,
      isDemoMode,
      demoRole,
      firebaseUser,
      canCurrentUserEditPatient,
      activeUserAccount,
      getAclArrays,
      activePatientProfile,
    ]
  );

  // Trigger full-screen Smart Alarm
  const triggerAlarmForSchedule = useCallback(
    (schedule: MedicationSchedule) => {
      const med = medicines.find((m) => m.id === schedule.medicineId);
      const slot = `${getTodayDateStr()}T${schedule.scheduledTime}`;
      setActiveAlarm({
        schedule,
        medicine: med,
        scheduledFor: slot,
        triggeredAt: Date.now(),
        repeatCount: 0,
      });
      playGentleReminderChime();
      if (activePatientProfile?.voiceReadAloud !== false) {
        const mealText = t.meals[schedule.mealTiming as MealTiming] || schedule.mealTiming;
        const msg = `${t.alarm.spokenPrefix} ${schedule.medicineName}, ${schedule.dosage}. ${mealText}. ${schedule.instructions || med?.instructions || ''}`;
        speakText(msg, language);
      }

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(`${t.alarm.title}: ${schedule.medicineName}`, {
            body: `${schedule.dosage} — ${t.meals[schedule.mealTiming as MealTiming] || schedule.mealTiming}`,
            icon: '/pwa-192x192.png',
            tag: schedule.id,
          });
        } catch {
          // Ignore browser notification errors in sandboxed iframes
        }
      }
    },
    [medicines, activePatientProfile, t, language]
  );

  const triggerTestAlarm = useCallback(
    (schedule?: MedicationSchedule) => {
      const target = schedule || schedules[0];
      if (!target) return;
      triggerAlarmForSchedule(target);
    },
    [schedules, triggerAlarmForSchedule]
  );

  const dismissAlarm = useCallback(() => {
    stopSpeaking();
    setActiveAlarm(null);
  }, []);

  // Smart Reminder & Escalation Background Loop (runs every 15 seconds while app is open)
  useEffect(() => {
    if (!activePatientProfile || schedules.length === 0) return;
    if (activeUserAccount?.role !== 'patient') return;

    const tick = () => {
      const now = new Date();
      const nowMs = now.getTime();
      const todayStr = getTodayDateStr();
      const weekday = getTodayWeekday();
      const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      for (const sch of schedules) {
        if (!sch.isActive) continue;
        if (sch.daysOfWeek.length > 0 && !sch.daysOfWeek.includes(weekday)) continue;
        const slot = `${todayStr}T${sch.scheduledTime}`;
        const existingLog = logs.find(
          (l) => l.scheduleId === sch.id && l.scheduledFor === slot
        );
        if (existingLog && (existingLog.status === 'taken' || existingLog.status === 'missed')) {
          continue;
        }

        // Check snoozed trigger
        const snoozeDue = snoozedTimersRef.current[slot];
        if (snoozeDue && nowMs >= snoozeDue && !activeAlarm) {
          delete snoozedTimersRef.current[slot];
          triggerAlarmForSchedule(sch);
          break;
        }

        // Check exact scheduled time trigger
        if (sch.scheduledTime === nowHHMM && !triggeredSlotsRef.current.has(slot) && !activeAlarm) {
          triggeredSlotsRef.current.add(slot);
          triggerAlarmForSchedule(sch);
          break;
        }
      }

      // Check active unacknowledged alarm for repeat chime or caregiver escalation
      if (activeAlarm) {
        const repeatMs = (activeAlarm.schedule.repeatIntervalMinutes || 10) * 60 * 1000;
        const escalationMs = (activeAlarm.schedule.escalationDelayMinutes || 30) * 60 * 1000;
        const elapsed = nowMs - activeAlarm.triggeredAt;

        if (elapsed >= escalationMs) {
          recordDoseAction(
            activeAlarm.schedule,
            'missed',
            `Automatically escalated after ${activeAlarm.schedule.escalationDelayMinutes} min unacknowledged.`
          );
        } else if (elapsed >= repeatMs * (activeAlarm.repeatCount + 1)) {
          playGentleReminderChime();
          setActiveAlarm((prev) =>
            prev ? { ...prev, repeatCount: prev.repeatCount + 1 } : null
          );
        }
      }
    };

    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, [activePatientProfile, schedules, logs, activeAlarm, activeUserAccount, triggerAlarmForSchedule, recordDoseAction]);

  // Correct Medication Log with Audit History
  const correctMedicationLog = useCallback(
    async (log: MedicationLog, newStatus: DoseStatus, reason: string) => {
      if (!activePatientId || !reason.trim()) return;
      const actorUid = isDemoMode
        ? demoRole === 'patient'
          ? DEMO_PATIENT_UID
          : DEMO_CAREGIVER_UID
        : firebaseUser?.uid || activePatientId;
      const actorName = activeUserAccount?.displayName || 'User';
      const actorRole: 'patient' | 'caregiver' = activeUserAccount?.role || 'patient';
      const acl = getAclArrays();

      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          logs: prev.logs.map((l) =>
            l.id === log.id
              ? {
                  ...l,
                  status: newStatus,
                  correctionReason: reason.trim(),
                  actionAt: new Date().toISOString(),
                }
              : l
          ),
          auditLogs: [
            {
              id: makeId('demo_audit'),
              patientId: activePatientId,
              actorUid,
              actorName,
              actorRole,
              action: 'CORRECT_MEDICATION_LOG',
              targetCollection: 'medicationLogs',
              targetId: log.id,
              previousValue: log.status,
              newValue: newStatus,
              reason: reason.trim(),
              authorizedCaregiverIds: acl.authorizedCaregiverIds,
            },
            ...prev.auditLogs,
          ],
        }));
        return;
      }

      if (!firebaseUser || !canCurrentUserEditPatient) return;
      const safeReason = reason.trim().slice(0, 300);
      try {
        await updateDoc(doc(db, 'medicationLogs', log.id), {
          status: newStatus,
          correctionReason: safeReason,
          recordedByUid: firebaseUser.uid,
          recordedByRole: actorRole,
          actionAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });

        const auditId = makeId('audit');
        await setDoc(doc(db, 'auditLogs', auditId), {
          id: auditId,
          patientId: activePatientId,
          actorUid: firebaseUser.uid,
          actorName: actorName.trim().slice(0, 100) || 'User',
          actorRole,
          action: 'CORRECT_MEDICATION_LOG',
          targetCollection: 'medicationLogs',
          targetId: log.id.slice(0, 128),
          previousValue: String(log.status).slice(0, 200),
          newValue: String(newStatus).slice(0, 200),
          reason: safeReason,
          authorizedCaregiverIds: acl.authorizedCaregiverIds,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `medicationLogs/${log.id}`);
      }
    },
    [activePatientId, isDemoMode, demoRole, firebaseUser, canCurrentUserEditPatient, activeUserAccount, getAclArrays]
  );

  // Guided 4-step Onboarding completion
  const completeOnboarding: AppContextValue['completeOnboarding'] = useCallback(
    async ({ profile, initialMedicines, caregiverInvite }) => {
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          patientProfile: {
            ...prev.patientProfile,
            ...profile,
          },
        }));
        setLanguageState(profile.preferredLanguage);
        setRoute('dashboard');
        return;
      }

      if (!firebaseUser) return;
      const uid = firebaseUser.uid;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

      try {
        const profileRef = doc(db, 'patientProfiles', uid);
        const existingProfileSnap = await getDoc(profileRef);
        const existingAcls = existingProfileSnap.exists()
          ? {
              authorizedCaregiverIds: (existingProfileSnap.data().authorizedCaregiverIds as string[]) || [],
              caregiverCanEditIds: (existingProfileSnap.data().caregiverCanEditIds as string[]) || [],
            }
          : { authorizedCaregiverIds: [], caregiverCanEditIds: [] };

        // 1. Create or update Master Gate PatientProfile without resetting createdAt or caregiver ACLs
        if (existingProfileSnap.exists()) {
          await updateDoc(profileRef, {
            fullName: (profile.fullName.trim() || 'MediMitra Patient').slice(0, 100),
            age: Math.min(125, Math.max(1, Math.round(Number(profile.age) || 65))),
            conditions: profile.conditions.slice(0, 10),
            preferredLanguage: profile.preferredLanguage,
            reminderRepeatMinutes: Math.min(120, Math.max(1, Math.round(Number(profile.reminderRepeatMinutes) || 10))),
            escalationDelayMinutes: Math.min(240, Math.max(5, Math.round(Number(profile.escalationDelayMinutes) || 30))),
            voiceReadAloud: Boolean(profile.voiceReadAloud),
            bpHighThresholdSys: Math.min(220, Math.max(100, Math.round(Number(profile.bpHighThresholdSys) || 140))),
            bpHighThresholdDia: Math.min(140, Math.max(60, Math.round(Number(profile.bpHighThresholdDia) || 90))),
            glucoseFastingMax: Math.min(250, Math.max(80, Math.round(Number(profile.glucoseFastingMax) || 125))),
            glucosePostMealMax: Math.min(350, Math.max(100, Math.round(Number(profile.glucosePostMealMax) || 180))),
            primaryDoctorName: profile.primaryDoctorName.trim().slice(0, 100),
            primaryClinic: profile.primaryClinic.trim().slice(0, 120),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(profileRef, {
            patientId: uid,
            fullName: (profile.fullName.trim() || 'MediMitra Patient').slice(0, 100),
            age: Math.min(125, Math.max(1, Math.round(Number(profile.age) || 65))),
            conditions: profile.conditions.slice(0, 10),
            preferredLanguage: profile.preferredLanguage,
            reminderRepeatMinutes: Math.min(120, Math.max(1, Math.round(Number(profile.reminderRepeatMinutes) || 10))),
            escalationDelayMinutes: Math.min(240, Math.max(5, Math.round(Number(profile.escalationDelayMinutes) || 30))),
            defaultLowStockThreshold: 7,
            voiceReadAloud: Boolean(profile.voiceReadAloud),
            bpHighThresholdSys: Math.min(220, Math.max(100, Math.round(Number(profile.bpHighThresholdSys) || 140))),
            bpHighThresholdDia: Math.min(140, Math.max(60, Math.round(Number(profile.bpHighThresholdDia) || 90))),
            glucoseFastingMax: Math.min(250, Math.max(80, Math.round(Number(profile.glucoseFastingMax) || 125))),
            glucosePostMealMax: Math.min(350, Math.max(100, Math.round(Number(profile.glucosePostMealMax) || 180))),
            primaryDoctorName: profile.primaryDoctorName.trim().slice(0, 100),
            primaryClinic: profile.primaryClinic.trim().slice(0, 120),
            bloodGroup: '',
            allergies: '',
            authorizedCaregiverIds: [],
            caregiverCanEditIds: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // 2. Mark UserAccount onboarding complete
        await updateDoc(doc(db, 'users', uid), {
          displayName: (profile.fullName.trim() || 'MediMitra Patient').slice(0, 80),
          preferredLanguage: profile.preferredLanguage,
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        });
        setUserAccount((prev) =>
          prev
            ? {
                ...prev,
                displayName: (profile.fullName.trim() || 'MediMitra Patient').slice(0, 80),
                preferredLanguage: profile.preferredLanguage,
                onboardingCompleted: true,
              }
            : prev
        );
        setLanguageState(profile.preferredLanguage);

        // 3. Create initial Medicines & Schedules
        const todayStr = getTodayDateStr();
        const batch = writeBatch(db);
        for (const item of initialMedicines) {
          const medId = makeId('med');
          const schId = makeId('sch');
          batch.set(doc(db, 'medicines', medId), {
            id: medId,
            patientId: uid,
            name: (item.name.trim() || 'Prescribed Medicine').slice(0, 120),
            dosage: (item.dosage.trim() || '1 tablet').slice(0, 60),
            form: item.form,
            instructions: item.instructions.trim().slice(0, 300),
            frequency: 'Once daily',
            mealTimings: [item.mealTiming],
            customTimes: [item.scheduledTime],
            startDate: todayStr,
            endDate: '',
            stockQuantity: Math.min(5000, Math.max(0, Math.round(Number(item.stockQuantity) || 30))),
            refillThreshold: Math.min(500, Math.max(0, Math.round(Number(item.refillThreshold) || 7))),
            doctorRef: profile.primaryDoctorName.trim().slice(0, 120),
            isActive: true,
            ...existingAcls,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'medicationSchedules', schId), {
            id: schId,
            patientId: uid,
            medicineId: medId,
            medicineName: (item.name.trim() || 'Prescribed Medicine').slice(0, 120),
            dosage: (item.dosage.trim() || '1 tablet').slice(0, 60),
            mealTiming: item.mealTiming,
            scheduledTime: item.scheduledTime,
            daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            repeatIntervalMinutes: Math.min(120, Math.max(1, Math.round(Number(profile.reminderRepeatMinutes) || 10))),
            escalationDelayMinutes: Math.min(240, Math.max(5, Math.round(Number(profile.escalationDelayMinutes) || 30))),
            isActive: true,
            timezone: tz.slice(0, 64),
            instructions: item.instructions.trim().slice(0, 300),
            ...existingAcls,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // 4. Optional Caregiver Invite
        if (caregiverInvite && caregiverInvite.caregiverEmail.trim()) {
          const connId = makeId('conn');
          batch.set(doc(db, 'caregiverConnections', connId), {
            id: connId,
            patientId: uid,
            patientName: (profile.fullName.trim() || 'MediMitra Patient').slice(0, 100),
            patientEmail: (firebaseUser.email || `${uid}@medimitra.local`).trim().slice(0, 160),
            caregiverId: '',
            caregiverEmail: caregiverInvite.caregiverEmail.trim().toLowerCase().slice(0, 160),
            caregiverName: (caregiverInvite.caregiverName.trim() || 'Family Caregiver').slice(0, 100),
            relationship: (caregiverInvite.relationship.trim() || 'Family Member').slice(0, 60),
            status: 'pending',
            permissions: caregiverInvite.permissions,
            escalationDelayMinutes: Math.min(240, Math.max(5, Math.round(Number(profile.escalationDelayMinutes) || 30))),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        await batch.commit();
        setSelectedPatientId(uid);
        navigate('dashboard');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'onboarding_batch');
      }
    },
    [isDemoMode, firebaseUser, navigate]
  );

  const skipOnboarding = useCallback(async () => {
    if (isDemoMode) {
      navigate('dashboard');
      return;
    }
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    try {
      const profileRef = doc(db, 'patientProfiles', uid);
      const existingSnap = await getDoc(profileRef);
      if (!existingSnap.exists()) {
        const displayName = (userAccount?.displayName || firebaseUser.displayName || 'MediMitra Patient')
          .trim()
          .slice(0, 100);
        await setDoc(profileRef, {
          patientId: uid,
          fullName: displayName || 'MediMitra Patient',
          age: 65,
          conditions: [],
          preferredLanguage: languageRef.current,
          reminderRepeatMinutes: 10,
          escalationDelayMinutes: 30,
          defaultLowStockThreshold: 7,
          voiceReadAloud: true,
          bpHighThresholdSys: 140,
          bpHighThresholdDia: 90,
          glucoseFastingMax: 125,
          glucosePostMealMax: 180,
          primaryDoctorName: '',
          primaryClinic: '',
          bloodGroup: '',
          allergies: '',
          authorizedCaregiverIds: [],
          caregiverCanEditIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await updateDoc(doc(db, 'users', uid), {
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      });
      setUserAccount((prev) => (prev ? { ...prev, onboardingCompleted: true } : prev));
      setSelectedPatientId(uid);
      navigate('dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `patientProfiles/${uid}`);
    }
  }, [isDemoMode, firebaseUser, userAccount, navigate]);

  const updatePatientSettings = useCallback(
    async (updates: Partial<PatientProfile>) => {
      if (!activePatientId) return;
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          patientProfile: { ...prev.patientProfile, ...updates },
        }));
        return;
      }
      try {
        await updateDoc(doc(db, 'patientProfiles', activePatientId), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `patientProfiles/${activePatientId}`);
      }
    },
    [activePatientId, isDemoMode]
  );

  // Medicine + Schedule CRUD
  const saveMedicineWithSchedule: AppContextValue['saveMedicineWithSchedule'] = useCallback(
    async (input) => {
      if (!activePatientId) return;
      const acl = getAclArrays();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const medId = input.existingId || makeId('med');
      const repeatMin = activePatientProfile?.reminderRepeatMinutes || 10;
      const escMin = activePatientProfile?.escalationDelayMinutes || 30;

      if (isDemoMode) {
        setDemoSandbox((prev) => {
          const newMed: Medicine = {
            id: medId,
            patientId: activePatientId,
            name: input.name.trim(),
            dosage: input.dosage.trim(),
            form: input.form,
            instructions: input.instructions.trim(),
            frequency: input.frequency.trim(),
            mealTimings: input.mealTimings,
            customTimes: input.customTimes,
            startDate: input.startDate,
            endDate: input.endDate,
            stockQuantity: input.stockQuantity,
            refillThreshold: input.refillThreshold,
            doctorRef: input.doctorRef.trim(),
            isActive: input.isActive,
            ...acl,
          };
          const otherSchedules = prev.schedules.filter((s) => s.medicineId !== medId);
          const createdSchedules: MedicationSchedule[] = input.customTimes.map((time, idx) => ({
            id: makeId('demo_sch'),
            patientId: activePatientId,
            medicineId: medId,
            medicineName: input.name.trim(),
            dosage: input.dosage.trim(),
            mealTiming: input.mealTimings[idx] || input.mealTimings[0] || 'custom',
            scheduledTime: time,
            daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            repeatIntervalMinutes: repeatMin,
            escalationDelayMinutes: escMin,
            isActive: input.isActive,
            timezone: tz,
            instructions: input.instructions.trim(),
            ...acl,
          }));
          return {
            ...prev,
            medicines: input.existingId
              ? prev.medicines.map((m) => (m.id === medId ? newMed : m))
              : [newMed, ...prev.medicines],
            schedules: [...otherSchedules, ...createdSchedules],
          };
        });
        return;
      }

      if (!firebaseUser || !canCurrentUserEditPatient) return;
      const safeName = (input.name.trim() || 'Prescribed Medicine').slice(0, 120);
      const safeDosage = (input.dosage.trim() || '1 dose').slice(0, 60);
      const safeInstructions = input.instructions.trim().slice(0, 300);
      const safeFrequency = (input.frequency.trim() || 'Once daily').slice(0, 80);
      const safeMealTimings = input.mealTimings.slice(0, 10);
      const safeCustomTimes = input.customTimes.slice(0, 10);
      const safeStartDate = (input.startDate || '').slice(0, 20);
      const safeEndDate = (input.endDate || '').slice(0, 20);
      const safeStock = Math.min(5000, Math.max(0, Math.round(Number(input.stockQuantity) || 0)));
      const safeThreshold = Math.min(500, Math.max(0, Math.round(Number(input.refillThreshold) || 0)));
      const safeDoctorRef = input.doctorRef.trim().slice(0, 120);
      const safeRepeat = Math.min(120, Math.max(1, Math.round(Number(repeatMin) || 10)));
      const safeEsc = Math.min(240, Math.max(5, Math.round(Number(escMin) || 30)));
      const safeTz = tz.slice(0, 64) || 'UTC';

      try {
        const batch = writeBatch(db);
        const medRef = doc(db, 'medicines', medId);

        if (input.existingId) {
          batch.update(medRef, {
            name: safeName,
            dosage: safeDosage,
            form: input.form,
            instructions: safeInstructions,
            frequency: safeFrequency,
            mealTimings: safeMealTimings,
            customTimes: safeCustomTimes,
            startDate: safeStartDate,
            endDate: safeEndDate,
            stockQuantity: safeStock,
            refillThreshold: safeThreshold,
            doctorRef: safeDoctorRef,
            isActive: Boolean(input.isActive),
            updatedAt: serverTimestamp(),
          });

          // Query live Firestore schedules for this patient & filter to medicineId (no composite index needed)
          const patientSchSnap = await getDocs(
            query(collection(db, 'medicationSchedules'), where('patientId', '==', activePatientId))
          );
          patientSchSnap.docs.forEach((d) => {
            if (d.data().medicineId === medId) {
              batch.delete(d.ref);
            }
          });
        } else {
          batch.set(medRef, {
            id: medId,
            patientId: activePatientId,
            name: safeName,
            dosage: safeDosage,
            form: input.form,
            instructions: safeInstructions,
            frequency: safeFrequency,
            mealTimings: safeMealTimings,
            customTimes: safeCustomTimes,
            startDate: safeStartDate,
            endDate: safeEndDate,
            stockQuantity: safeStock,
            refillThreshold: safeThreshold,
            doctorRef: safeDoctorRef,
            isActive: Boolean(input.isActive),
            ...acl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        for (let idx = 0; idx < safeCustomTimes.length; idx++) {
          const schId = makeId('sch');
          const rawTime = (safeCustomTimes[idx] || '08:30').trim();
          const safeTime = rawTime.length >= 4 && rawTime.length <= 10 ? rawTime : '08:30';
          batch.set(doc(db, 'medicationSchedules', schId), {
            id: schId,
            patientId: activePatientId,
            medicineId: medId,
            medicineName: safeName,
            dosage: safeDosage,
            mealTiming: (safeMealTimings[idx] || safeMealTimings[0] || 'custom').slice(0, 40),
            scheduledTime: safeTime,
            daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            repeatIntervalMinutes: safeRepeat,
            escalationDelayMinutes: safeEsc,
            isActive: Boolean(input.isActive),
            timezone: safeTz,
            instructions: safeInstructions,
            ...acl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `medicines/${medId}`);
      }
    },
    [activePatientId, getAclArrays, activePatientProfile, isDemoMode, firebaseUser, canCurrentUserEditPatient]
  );

  const deleteMedicine = useCallback(
    async (medicineId: string) => {
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          medicines: prev.medicines.filter((m) => m.id !== medicineId),
          schedules: prev.schedules.filter((s) => s.medicineId !== medicineId),
        }));
        return;
      }
      if (!activePatientId || !canCurrentUserEditPatient) return;
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'medicines', medicineId));
        const patientSchSnap = await getDocs(
          query(collection(db, 'medicationSchedules'), where('patientId', '==', activePatientId))
        );
        patientSchSnap.docs.forEach((d) => {
          if (d.data().medicineId === medicineId) {
            batch.delete(d.ref);
          }
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `medicines/${medicineId}`);
      }
    },
    [isDemoMode, activePatientId, canCurrentUserEditPatient]
  );

  const restockMedicine = useCallback(
    async (medicineId: string, addQty: number) => {
      const med = medicines.find((m) => m.id === medicineId);
      if (!med) return;
      const nextQty = Math.min(5000, med.stockQuantity + addQty);
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          medicines: prev.medicines.map((m) =>
            m.id === medicineId ? { ...m, stockQuantity: nextQty } : m
          ),
        }));
        return;
      }
      try {
        await updateDoc(doc(db, 'medicines', medicineId), {
          stockQuantity: nextQty,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `medicines/${medicineId}`);
      }
    },
    [medicines, isDemoMode]
  );

  const updateLowStockThreshold = useCallback(
    async (threshold: number, applyToAllMedicines = false) => {
      if (!activePatientId) return;
      const safeThreshold = Math.min(500, Math.max(0, Math.round(Number(threshold) || 0)));

      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          patientProfile: {
            ...prev.patientProfile,
            defaultLowStockThreshold: safeThreshold,
          },
          medicines: applyToAllMedicines
            ? prev.medicines.map((m) => ({ ...m, refillThreshold: safeThreshold }))
            : prev.medicines,
        }));
        return;
      }

      try {
        const batch = writeBatch(db);
        if (firebaseUser?.uid === activePatientId) {
          batch.update(doc(db, 'patientProfiles', activePatientId), {
            defaultLowStockThreshold: safeThreshold,
            updatedAt: serverTimestamp(),
          });
        }
        if (applyToAllMedicines) {
          for (const med of medicines) {
            batch.update(doc(db, 'medicines', med.id), {
              refillThreshold: safeThreshold,
              updatedAt: serverTimestamp(),
            });
          }
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `patientProfiles/${activePatientId}`);
      }
    },
    [activePatientId, isDemoMode, firebaseUser, medicines]
  );

  const updateMedicineThreshold = useCallback(
    async (medicineId: string, threshold: number) => {
      const safeThreshold = Math.min(500, Math.max(0, Math.round(Number(threshold) || 0)));
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          medicines: prev.medicines.map((m) =>
            m.id === medicineId ? { ...m, refillThreshold: safeThreshold } : m
          ),
        }));
        return;
      }
      try {
        await updateDoc(doc(db, 'medicines', medicineId), {
          refillThreshold: safeThreshold,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `medicines/${medicineId}`);
      }
    },
    [isDemoMode]
  );

  // BP & Glucose readings
  const addHealthReading: AppContextValue['addHealthReading'] = useCallback(
    async (input) => {
      if (!activePatientId) return;
      const acl = getAclArrays();
      const id = makeId('hr');
      const evalRes =
        input.type === 'bp'
          ? evaluateBpFlag(input.systolic || 120, input.diastolic || 80, activePatientProfile)
          : evaluateGlucoseFlag(
              input.glucoseValue || 100,
              input.glucoseContext || 'fasting',
              activePatientProfile
            );

      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          readings: [
            {
              id,
              patientId: activePatientId,
              type: input.type,
              measuredAt: input.measuredAt,
              ...(input.type === 'bp'
                ? {
                    systolic: input.systolic,
                    diastolic: input.diastolic,
                    pulse: input.pulse,
                  }
                : {
                    glucoseValue: input.glucoseValue,
                    glucoseContext: input.glucoseContext,
                  }),
              flagged: evalRes.flagged,
              flagLevel: evalRes.flagLevel,
              notes: input.notes?.trim() || '',
              ...acl,
            },
            ...prev.readings,
          ],
        }));
        return;
      }

      if (!firebaseUser || !canCurrentUserEditPatient) return;

      const safeMeasuredAt = (input.measuredAt || new Date().toISOString()).slice(0, 40);
      const safeNotes = input.notes?.trim() ? input.notes.trim().slice(0, 300) : '';
      const safeSys = input.systolic != null ? Math.min(300, Math.max(40, Math.round(Number(input.systolic)))) : undefined;
      const safeDia = input.diastolic != null ? Math.min(200, Math.max(30, Math.round(Number(input.diastolic)))) : undefined;
      const rawPulse = input.pulse != null ? Math.round(Number(input.pulse)) : undefined;
      const safePulse = rawPulse != null && !Number.isNaN(rawPulse) ? Math.min(240, Math.max(25, rawPulse)) : undefined;
      const safeGlucose =
        input.glucoseValue != null ? Math.min(900, Math.max(20, Math.round(Number(input.glucoseValue)))) : undefined;

      try {
        await setDoc(doc(db, 'healthReadings', id), {
          id,
          patientId: activePatientId,
          type: input.type,
          measuredAt: safeMeasuredAt,
          ...(input.type === 'bp'
            ? {
                systolic: safeSys ?? 120,
                diastolic: safeDia ?? 80,
                ...(safePulse !== undefined ? { pulse: safePulse } : {}),
              }
            : {
                glucoseValue: safeGlucose ?? 100,
                glucoseContext: input.glucoseContext || 'fasting',
              }),
          flagged: evalRes.flagged,
          flagLevel: evalRes.flagLevel,
          ...(safeNotes ? { notes: safeNotes } : {}),
          ...acl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `healthReadings/${id}`);
      }
    },
    [activePatientId, getAclArrays, activePatientProfile, isDemoMode, firebaseUser, canCurrentUserEditPatient]
  );

  // Confirmed Prescription Save
  const saveConfirmedPrescription: AppContextValue['saveConfirmedPrescription'] = useCallback(
    async (input) => {
      if (!activePatientId) return;
      const acl = getAclArrays();
      const rxId = makeId('rx');
      const nowIso = new Date().toISOString();

      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          prescriptions: [
            {
              id: rxId,
              patientId: activePatientId,
              doctorName: input.doctorName,
              clinicName: input.clinicName,
              prescriptionDate: input.prescriptionDate,
              ocrRawText: input.ocrRawText,
              extractedMedicines: input.medicines,
              confirmedByUser: true,
              confirmedAt: nowIso,
              ...acl,
            },
            ...prev.prescriptions,
          ],
        }));
      } else {
        try {
          await setDoc(doc(db, 'prescriptions', rxId), {
            id: rxId,
            patientId: activePatientId,
            doctorName: input.doctorName.slice(0, 100),
            clinicName: input.clinicName.slice(0, 120),
            prescriptionDate: input.prescriptionDate.slice(0, 20),
            ocrRawText: input.ocrRawText.slice(0, 5000),
            extractedMedicines: input.medicines.slice(0, 15),
            confirmedByUser: true,
            confirmedAt: nowIso,
            ...acl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `prescriptions/${rxId}`);
        }
      }

      const defaultTimeMap: Record<MealTiming, string> = {
        before_breakfast: '07:30',
        after_breakfast: '08:30',
        before_lunch: '12:30',
        after_lunch: '13:30',
        before_dinner: '19:30',
        after_dinner: '20:30',
        bedtime: '22:00',
        custom: '09:00',
      };

      for (const m of input.medicines) {
        await saveMedicineWithSchedule({
          name: m.name,
          dosage: m.dosage,
          form: m.form,
          instructions: m.instructions,
          frequency: m.frequency || 'Once daily',
          mealTimings: [m.mealTiming],
          customTimes: [defaultTimeMap[m.mealTiming] || '08:30'],
          startDate: getTodayDateStr(),
          endDate: '',
          stockQuantity: 30,
          refillThreshold: activePatientProfile?.defaultLowStockThreshold ?? 7,
          doctorRef: input.doctorName,
          isActive: true,
        });
      }
    },
    [activePatientId, activePatientProfile, getAclArrays, isDemoMode, saveMedicineWithSchedule]
  );

  // Appointments CRUD
  const saveAppointment: AppContextValue['saveAppointment'] = useCallback(
    async (input) => {
      if (!activePatientId) return;
      const acl = getAclArrays();
      const id = input.id || makeId('apt');

      if (isDemoMode) {
        const record: Appointment = {
          id,
          patientId: activePatientId,
          doctorName: input.doctorName.trim(),
          specialty: input.specialty?.trim() || 'General Medicine',
          clinicName: input.clinicName.trim(),
          appointmentDate: input.appointmentDate,
          appointmentTime: input.appointmentTime,
          reminderEnabled: input.reminderEnabled ?? true,
          status: input.status || 'upcoming',
          notes: input.notes?.trim() || '',
          reportSummary: input.reportSummary?.trim() || '',
          ...acl,
        };
        setDemoSandbox((prev) => ({
          ...prev,
          appointments: input.id
            ? prev.appointments.map((a) => (a.id === id ? record : a))
            : [record, ...prev.appointments],
        }));
        return;
      }

      if (!firebaseUser || !canCurrentUserEditPatient) return;
      const safeDoctor = (input.doctorName.trim() || 'Doctor').slice(0, 100);
      const safeSpecialty = (input.specialty?.trim() || 'General Medicine').slice(0, 80);
      const safeClinic = (input.clinicName.trim() || 'Clinic').slice(0, 120);
      const safeDate = (input.appointmentDate || getTodayDateStr()).slice(0, 20);
      const safeTime = (input.appointmentTime || '10:00').slice(0, 12);
      const safeNotes = (input.notes?.trim() || '').slice(0, 1000);
      const safeReport = (input.reportSummary?.trim() || '').slice(0, 1500);

      try {
        if (input.id) {
          await updateDoc(doc(db, 'appointments', id), {
            doctorName: safeDoctor,
            specialty: safeSpecialty,
            clinicName: safeClinic,
            appointmentDate: safeDate,
            appointmentTime: safeTime,
            reminderEnabled: input.reminderEnabled ?? true,
            status: input.status || 'upcoming',
            notes: safeNotes,
            reportSummary: safeReport,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'appointments', id), {
            id,
            patientId: activePatientId,
            doctorName: safeDoctor,
            specialty: safeSpecialty,
            clinicName: safeClinic,
            appointmentDate: safeDate,
            appointmentTime: safeTime,
            reminderEnabled: input.reminderEnabled ?? true,
            status: input.status || 'upcoming',
            notes: safeNotes,
            reportSummary: safeReport,
            ...acl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `appointments/${id}`);
      }
    },
    [activePatientId, getAclArrays, isDemoMode, firebaseUser, canCurrentUserEditPatient]
  );

  const deleteAppointment = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          appointments: prev.appointments.filter((a) => a.id !== id),
        }));
        return;
      }
      if (!canCurrentUserEditPatient) return;
      try {
        await deleteDoc(doc(db, 'appointments', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `appointments/${id}`);
      }
    },
    [isDemoMode, canCurrentUserEditPatient]
  );

  // Emergency Contacts CRUD
  const saveEmergencyContact: AppContextValue['saveEmergencyContact'] = useCallback(
    async (input) => {
      if (!activePatientId) return;
      const acl = getAclArrays();
      const id = input.id || makeId('ec');

      if (isDemoMode) {
        const contact: EmergencyContact = {
          id,
          patientId: activePatientId,
          name: input.name.trim(),
          relationship: input.relationship.trim(),
          phone: input.phone.trim(),
          isPrimary: Boolean(input.isPrimary),
          ...acl,
        };
        setDemoSandbox((prev) => ({
          ...prev,
          emergencyContacts: input.id
            ? prev.emergencyContacts.map((c) => (c.id === id ? contact : c))
            : [contact, ...prev.emergencyContacts],
        }));
        return;
      }

      if (!firebaseUser || !canCurrentUserEditPatient) return;
      const safeName = (input.name.trim() || 'Emergency Contact').slice(0, 100);
      const safeRel = (input.relationship.trim() || 'Family').slice(0, 60);
      const rawPhone = input.phone.trim();
      if (rawPhone.length < 5) {
        throw new Error('Phone number must be at least 5 characters.');
      }
      const safePhone = rawPhone.slice(0, 24);

      try {
        if (input.id) {
          await updateDoc(doc(db, 'emergencyContacts', id), {
            name: safeName,
            relationship: safeRel,
            phone: safePhone,
            isPrimary: Boolean(input.isPrimary),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'emergencyContacts', id), {
            id,
            patientId: activePatientId,
            name: safeName,
            relationship: safeRel,
            phone: safePhone,
            isPrimary: Boolean(input.isPrimary),
            ...acl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `emergencyContacts/${id}`);
      }
    },
    [activePatientId, getAclArrays, isDemoMode, firebaseUser, canCurrentUserEditPatient]
  );

  const deleteEmergencyContact = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          emergencyContacts: prev.emergencyContacts.filter((c) => c.id !== id),
        }));
        return;
      }
      if (!canCurrentUserEditPatient) return;
      try {
        await deleteDoc(doc(db, 'emergencyContacts', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `emergencyContacts/${id}`);
      }
    },
    [isDemoMode, canCurrentUserEditPatient]
  );

  // Sync Caregiver ACL arrays across all patient documents in Firestore (chunked in 400-op batches)
  const syncPatientCaregiverAcls = useCallback(
    async (patientId: string, nextConnections: CaregiverConnection[]) => {
      const active = nextConnections.filter((c) => c.status === 'active' && c.caregiverId);
      const authorizedCaregiverIds = Array.from(new Set(active.map((c) => c.caregiverId))).slice(0, 10);
      const caregiverCanEditIds = Array.from(
        new Set(active.filter((c) => c.permissions.canManageSchedules).map((c) => c.caregiverId))
      ).slice(0, 10);

      const pendingUpdates: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [
        {
          ref: doc(db, 'patientProfiles', patientId),
          data: {
            authorizedCaregiverIds,
            caregiverCanEditIds,
            updatedAt: serverTimestamp(),
          },
        },
      ];

      const collectionsWithEdit = [
        'medicines',
        'medicationSchedules',
        'medicationLogs',
        'healthReadings',
        'prescriptions',
        'appointments',
        'emergencyContacts',
      ];
      for (const colName of collectionsWithEdit) {
        const snap = await getDocs(query(collection(db, colName), where('patientId', '==', patientId)));
        snap.docs.forEach((d) => {
          pendingUpdates.push({
            ref: d.ref,
            data: {
              authorizedCaregiverIds,
              caregiverCanEditIds,
              updatedAt: serverTimestamp(),
            },
          });
        });
      }

      const notifSnap = await getDocs(query(collection(db, 'notifications'), where('patientId', '==', patientId)));
      notifSnap.docs.forEach((d) => {
        pendingUpdates.push({
          ref: d.ref,
          data: { authorizedCaregiverIds, updatedAt: serverTimestamp() },
        });
      });

      const auditSnap = await getDocs(query(collection(db, 'auditLogs'), where('patientId', '==', patientId)));
      auditSnap.docs.forEach((d) => {
        pendingUpdates.push({
          ref: d.ref,
          data: { authorizedCaregiverIds },
        });
      });

      for (let i = 0; i < pendingUpdates.length; i += 400) {
        const chunk = pendingUpdates.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const op of chunk) {
          batch.update(op.ref, op.data);
        }
        await batch.commit();
      }
    },
    []
  );

  const inviteCaregiver: AppContextValue['inviteCaregiver'] = useCallback(
    async (input) => {
      if (!activePatientId || !activePatientProfile) return;
      const connId = makeId('conn');
      const newConn: CaregiverConnection = {
        id: connId,
        patientId: activePatientId,
        patientName: (activePatientProfile.fullName.trim() || 'MediMitra Patient').slice(0, 100),
        patientEmail: (activeUserAccount?.email || firebaseUser?.email || 'patient@medimitra.local')
          .trim()
          .slice(0, 160),
        caregiverId: '',
        caregiverEmail: input.caregiverEmail.trim().toLowerCase().slice(0, 160),
        caregiverName: (input.caregiverName.trim() || 'Family Caregiver').slice(0, 100),
        relationship: (input.relationship.trim() || 'Family Member').slice(0, 60),
        status: 'pending',
        permissions: input.permissions,
        escalationDelayMinutes: Math.min(240, Math.max(5, Math.round(Number(input.escalationDelayMinutes) || 30))),
      };

      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          caregiverConnections: [newConn, ...prev.caregiverConnections],
        }));
        return;
      }

      try {
        await setDoc(doc(db, 'caregiverConnections', connId), {
          ...newConn,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `caregiverConnections/${connId}`);
      }
    },
    [activePatientId, activePatientProfile, activeUserAccount, firebaseUser, isDemoMode]
  );

  const respondCaregiverInvite = useCallback(
    async (conn: CaregiverConnection, accept: boolean) => {
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          caregiverConnections: prev.caregiverConnections.map((c) =>
            c.id === conn.id
              ? { ...c, caregiverId: DEMO_CAREGIVER_UID, status: accept ? 'active' : 'revoked' }
              : c
          ),
        }));
        return;
      }
      if (!firebaseUser) return;
      try {
        await updateDoc(doc(db, 'caregiverConnections', conn.id), {
          caregiverId: firebaseUser.uid,
          caregiverName: firebaseUser.displayName || conn.caregiverName,
          status: accept ? 'active' : 'revoked',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `caregiverConnections/${conn.id}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const updateCaregiverPermissions = useCallback(
    async (conn: CaregiverConnection, permissions: CaregiverPermissions) => {
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          caregiverConnections: prev.caregiverConnections.map((c) =>
            c.id === conn.id ? { ...c, permissions } : c
          ),
        }));
        return;
      }
      try {
        await updateDoc(doc(db, 'caregiverConnections', conn.id), {
          permissions,
          updatedAt: serverTimestamp(),
        });
        const updatedConns = caregiverConnections.map((c) =>
          c.id === conn.id ? { ...c, permissions } : c
        );
        await syncPatientCaregiverAcls(conn.patientId, updatedConns);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `caregiverConnections/${conn.id}`);
      }
    },
    [isDemoMode, caregiverConnections, syncPatientCaregiverAcls]
  );

  const revokeCaregiver = useCallback(
    async (conn: CaregiverConnection) => {
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          caregiverConnections: prev.caregiverConnections.map((c) =>
            c.id === conn.id ? { ...c, status: 'revoked' } : c
          ),
          patientProfile: {
            ...prev.patientProfile,
            authorizedCaregiverIds: prev.patientProfile.authorizedCaregiverIds.filter(
              (id) => id !== conn.caregiverId
            ),
            caregiverCanEditIds: prev.patientProfile.caregiverCanEditIds.filter(
              (id) => id !== conn.caregiverId
            ),
          },
        }));
        return;
      }
      try {
        await updateDoc(doc(db, 'caregiverConnections', conn.id), {
          status: 'revoked',
          updatedAt: serverTimestamp(),
        });
        const updatedConns = caregiverConnections.map((c) =>
          c.id === conn.id ? { ...c, status: 'revoked' as const } : c
        );
        await syncPatientCaregiverAcls(conn.patientId, updatedConns);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `caregiverConnections/${conn.id}`);
      }
    },
    [isDemoMode, caregiverConnections, syncPatientCaregiverAcls]
  );

  // When a patient views caregiverConnections and notices a caregiver just accepted (active in connection, not yet in patientProfile ACL), auto-sync ACL!
  useEffect(() => {
    if (isDemoMode || !firebaseUser || userAccount?.role !== 'patient' || !fsPatientProfile) return;
    const activeIds = fsConnections
      .filter((c) => c.status === 'active' && c.caregiverId)
      .map((c) => c.caregiverId);
    const missingInProfile = activeIds.some(
      (id) => !fsPatientProfile.authorizedCaregiverIds.includes(id)
    );
    if (missingInProfile) {
      syncPatientCaregiverAcls(firebaseUser.uid, fsConnections).catch(() => {});
    }
  }, [isDemoMode, firebaseUser, userAccount, fsPatientProfile, fsConnections, syncPatientCaregiverAcls]);

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        setDemoSandbox((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        return;
      }
      try {
        await updateDoc(doc(db, 'notifications', id), {
          read: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
      }
    },
    [isDemoMode]
  );

  const registerPushNotifications = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (typeof Notification === 'undefined') {
      return { ok: false, message: 'This browser does not support web notifications.' };
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { ok: false, message: 'Notification permission was denied by the browser.' };
    }
    const fcmRes = await requestFCMToken();
    if (fcmRes.token && firebaseUser && !isDemoMode) {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        fcmToken: fcmRes.token,
        updatedAt: serverTimestamp(),
      });
      return { ok: true, message: 'Browser notifications and FCM push token enabled.' };
    }
    if (fcmRes.requiresVapidConfig) {
      return {
        ok: true,
        message:
          'Browser notifications enabled! To also mint live FCM Web Push tokens, add VITE_FIREBASE_VAPID_KEY to your environment variables.',
      };
    }
    return {
      ok: true,
      message: fcmRes.error
        ? `Browser notifications enabled. (${fcmRes.error})`
        : 'Browser notifications enabled.',
    };
  }, [firebaseUser, isDemoMode]);

  const value: AppContextValue = {
    route,
    navigate,
    authReady,
    firebaseUser,
    userAccount: activeUserAccount,
    isDemoMode,
    demoRole,
    language,
    setLanguage,
    t,
    darkMode,
    toggleDarkMode,
    seniorFontMode,
    toggleSeniorFontMode,
    firestoreOnline,
    selectedRoleForAuth,
    setSelectedRoleForAuth,
    signInWithGoogle,
    signOut,
    enterDemoMode,
    switchDemoRole,
    exitDemoMode,
    authError,
    clearAuthError: () => setAuthError(null),

    patientProfile: activePatientProfile,
    connectedPatients: isDemoMode ? [demoSandbox.patientProfile] : fsConnectedPatients,
    selectedPatientId: activePatientId,
    setSelectedPatientId,
    canCurrentUserEditPatient,
    activeCaregiverPermissions,
    caregiverConnections,
    medicines,
    schedules,
    logs,
    readings,
    prescriptions,
    appointments,
    emergencyContacts,
    notifications,
    auditLogs,

    activeAlarm,
    dismissAlarm,
    triggerTestAlarm,
    recordDoseAction,
    correctMedicationLog,
    completeOnboarding,
    skipOnboarding,
    updatePatientSettings,
    saveMedicineWithSchedule,
    deleteMedicine,
    restockMedicine,
    updateLowStockThreshold,
    updateMedicineThreshold,
    addHealthReading,
    saveConfirmedPrescription,
    saveAppointment,
    deleteAppointment,
    saveEmergencyContact,
    deleteEmergencyContact,
    inviteCaregiver,
    respondCaregiverInvite,
    updateCaregiverPermissions,
    revokeCaregiver,
    markNotificationRead,
    registerPushNotifications,
    getAuthTokenHeader,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
