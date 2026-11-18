export type UserRole = 'patient' | 'caregiver';
export type AppLanguage = 'en' | 'kn' | 'hi';

export type PageRoute =
  | 'landing'
  | 'login'
  | 'register'
  | 'onboarding'
  | 'dashboard'
  | 'medicines'
  | 'schedule'
  | 'history'
  | 'bp-tracker'
  | 'diabetes-tracker'
  | 'assistant'
  | 'scanner'
  | 'caregiver'
  | 'reports'
  | 'appointments'
  | 'emergency'
  | 'settings';

export type MedicineForm = 'tablet' | 'capsule' | 'syrup' | 'injection' | 'drops' | 'inhaler';

export type MealTiming =
  | 'before_breakfast'
  | 'after_breakfast'
  | 'before_lunch'
  | 'after_lunch'
  | 'before_dinner'
  | 'after_dinner'
  | 'bedtime'
  | 'custom';

export type DoseStatus = 'pending' | 'taken' | 'snoozed' | 'missed';
export type GlucoseContext = 'fasting' | 'before_meal' | 'after_meal' | 'bedtime';
export type ReadingFlagLevel = 'normal' | 'elevated' | 'high' | 'urgent' | 'low';

export const SCHEMA_LIMITS = {
  ID_MAX: 128,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  NAME_MAX: 100,
  DISPLAY_NAME_MAX: 80,
  EMAIL_MAX: 160,
  PHONE_MAX: 24,
  DOSAGE_MAX: 60,
  INSTRUCTIONS_MAX: 300,
  NOTES_MAX: 300,
  CLINIC_MAX: 120,
  ARRAY_MAX: 10,
  STOCK_MAX: 5000,
  REFILL_MAX: 500,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  preferredLanguage: AppLanguage;
  onboardingCompleted: boolean;
  phone?: string;
  fcmToken?: string;
  darkMode?: boolean;
  seniorFontMode?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PatientProfile {
  patientId: string;
  fullName: string;
  age: number;
  conditions: string[];
  preferredLanguage: AppLanguage;
  reminderRepeatMinutes: number;
  escalationDelayMinutes: number;
  defaultLowStockThreshold?: number;
  voiceReadAloud: boolean;
  bpHighThresholdSys: number;
  bpHighThresholdDia: number;
  glucoseFastingMax: number;
  glucosePostMealMax: number;
  primaryDoctorName?: string;
  primaryClinic?: string;
  bloodGroup?: string;
  allergies?: string;
  authorizedCaregiverIds: string[];
  caregiverCanEditIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CaregiverPermissions {
  canViewLogs: boolean;
  canViewVitals: boolean;
  canManageSchedules: boolean;
  receiveMissedDoseAlerts: boolean;
  receiveRefillAlerts: boolean;
}

export interface CaregiverConnection {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  caregiverId: string;
  caregiverEmail: string;
  caregiverName: string;
  relationship: string;
  status: 'pending' | 'active' | 'revoked';
  permissions: CaregiverPermissions;
  escalationDelayMinutes: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Medicine {
  id: string;
  patientId: string;
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
  authorizedCaregiverIds: string[];
  caregiverCanEditIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MedicationSchedule {
  id: string;
  patientId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  mealTiming: MealTiming | string;
  scheduledTime: string; // HH:mm
  daysOfWeek: string[]; // ['Mon','Tue',...]
  repeatIntervalMinutes: number;
  escalationDelayMinutes: number;
  isActive: boolean;
  timezone: string;
  instructions?: string;
  authorizedCaregiverIds: string[];
  caregiverCanEditIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MedicationLog {
  id: string;
  patientId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduleId: string;
  scheduledFor: string; // ISO date + time slot e.g. 2026-11-17T08:00
  status: DoseStatus;
  actionAt: string;
  recordedByUid: string;
  recordedByRole: 'patient' | 'caregiver' | 'system';
  snoozeCount: number;
  escalatedToCaregiver: boolean;
  notes?: string;
  correctionReason?: string;
  authorizedCaregiverIds: string[];
  caregiverCanEditIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface HealthReading {
  id: string;
  patientId: string;
  type: 'bp' | 'glucose';
  measuredAt: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucoseValue?: number;
  glucoseContext?: GlucoseContext;
  flagged: boolean;
  flagLevel: ReadingFlagLevel;
  notes?: string;
  authorizedCaregiverIds: string[];
  caregiverCanEditIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExtractedMedicineDraft {
  name: string;
  dosage: string;
  form: MedicineForm;
  frequency: string;
  mealTiming: MealTiming;
  instructions: string;
  confidence: 'high' | 'medium' | 'unclear';
  unclearNote: string;
}

export interface PrescriptionRecord {
  id: string;
  patientId: string;
  doctorName: string;
  clinicName: string;
  prescriptionDate: string;
  ocrRawText: string;
  extractedMedicines: ExtractedMedicineDraft[];
  confirmedByUser: boolean;
  confirmedAt: string;
  authorizedCaregiverIds: string[];
  caregiverCanEditIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  specialty: string;
  clinicName: string;
  appointmentDate: string;
  appointmentTime: string;
  reminderEnabled: boolean;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
  reportSummary?: string;
  authorizedCaregiverIds: string[];
  caregiverCanEditIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EmergencyContact {
  id: string;
  patientId: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  authorizedCaregiverIds: string[];
  caregiverCanEditIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationItem {
  id: string;
  patientId: string;
  recipientUid: string;
  type: 'reminder' | 'missed_escalation' | 'refill_low' | 'appointment' | 'caregiver_invite' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  read: boolean;
  authorizedCaregiverIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  patientId: string;
  actorUid: string;
  actorName: string;
  actorRole: 'patient' | 'caregiver' | 'system';
  action: string;
  targetCollection: string;
  targetId: string;
  previousValue: string;
  newValue: string;
  reason: string;
  authorizedCaregiverIds: string[];
  createdAt?: unknown;
}

export interface ActiveAlarm {
  schedule: MedicationSchedule;
  medicine?: Medicine;
  scheduledFor: string;
  triggeredAt: number;
  repeatCount: number;
  snoozedUntil?: number;
}
