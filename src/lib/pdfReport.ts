import { jsPDF } from 'jspdf';
import {
  Appointment,
  HealthReading,
  MedicationLog,
  Medicine,
  PatientProfile,
} from '../types/medimitra';

export interface ReportExportPayload {
  profile: PatientProfile;
  periodLabel: string;
  adherencePercent: number;
  takenCount: number;
  missedCount: number;
  snoozedCount: number;
  medicines: Medicine[];
  logs: MedicationLog[];
  bpReadings: HealthReading[];
  glucoseReadings: HealthReading[];
  appointments: Appointment[];
  isDemo: boolean;
}

export function exportHealthReportPDF(payload: ReportExportPayload): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  const ensureSpace = (needed: number) => {
    if (y + needed > 780) {
      doc.addPage();
      y = 48;
    }
  };

  // Header
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageWidth, 84, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MediMitra Health & Medication Report', 40, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Generated: ${new Date().toLocaleString()}  |  Period: ${payload.periodLabel}${payload.isDemo ? '  |  DEMO SANDBOX DATA' : ''}`,
    40,
    58
  );

  y = 108;
  doc.setTextColor(15, 23, 42);

  // Patient Overview
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Patient Summary', 40, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${payload.profile.fullName} (Age: ${payload.profile.age})`, 40, y);
  y += 15;
  doc.text(`Conditions: ${payload.profile.conditions.join(', ') || 'None specified'}`, 40, y);
  y += 15;
  doc.text(
    `Primary Doctor: ${payload.profile.primaryDoctorName || 'Not set'}  |  Clinic: ${payload.profile.primaryClinic || 'Not set'}`,
    40,
    y
  );
  y += 24;

  // Adherence Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Medication Adherence Overview', 40, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Adherence Rate: ${payload.adherencePercent}%   |   Taken: ${payload.takenCount}   |   Snoozed: ${payload.snoozedCount}   |   Missed: ${payload.missedCount}`,
    40,
    y
  );
  y += 24;

  // Active Medicines
  ensureSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Prescribed Medications & Stock', 40, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  if (payload.medicines.length === 0) {
    doc.text('No active medications recorded.', 40, y);
    y += 16;
  } else {
    for (const med of payload.medicines) {
      ensureSpace(20);
      const medThreshold = med.refillThreshold ?? payload.profile.defaultLowStockThreshold ?? 7;
      const lowFlag = med.stockQuantity < medThreshold ? ' [LOW STOCK]' : '';
      doc.text(
        `- ${med.name} (${med.dosage}, ${med.form}) — ${med.frequency} | Stock: ${med.stockQuantity}${lowFlag}`,
        44,
        y
      );
      y += 14;
    }
  }
  y += 12;

  // BP Trends
  ensureSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Recent Blood Pressure Readings', 40, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  if (payload.bpReadings.length === 0) {
    doc.text('No blood pressure readings recorded in this period.', 40, y);
    y += 16;
  } else {
    for (const r of payload.bpReadings.slice(0, 10)) {
      ensureSpace(16);
      doc.text(
        `- ${new Date(r.measuredAt).toLocaleString()}: ${r.systolic}/${r.diastolic} mmHg (Pulse: ${r.pulse || '-'} bpm) [${r.flagLevel.toUpperCase()}]`,
        44,
        y
      );
      y += 14;
    }
  }
  y += 12;

  // Glucose Trends
  ensureSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Recent Blood Glucose Readings', 40, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  if (payload.glucoseReadings.length === 0) {
    doc.text('No blood glucose readings recorded in this period.', 40, y);
    y += 16;
  } else {
    for (const r of payload.glucoseReadings.slice(0, 10)) {
      ensureSpace(16);
      doc.text(
        `- ${new Date(r.measuredAt).toLocaleString()}: ${r.glucoseValue} mg/dL (${r.glucoseContext?.replace('_', ' ')}) [${r.flagLevel.toUpperCase()}]`,
        44,
        y
      );
      y += 14;
    }
  }
  y += 12;

  // Missed Dose Log
  const missedLogs = payload.logs.filter((l) => l.status === 'missed');
  ensureSpace(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Missed Medication History', 40, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  if (missedLogs.length === 0) {
    doc.text('No missed doses recorded in this period.', 40, y);
    y += 16;
  } else {
    for (const l of missedLogs.slice(0, 10)) {
      ensureSpace(16);
      doc.text(
        `- ${l.scheduledFor}: ${l.medicineName} (${l.dosage}) ${l.escalatedToCaregiver ? '[Escalated to Caregiver]' : ''}`,
        44,
        y
      );
      y += 14;
    }
  }

  // Footer Disclaimer
  ensureSpace(50);
  y += 14;
  doc.setDrawColor(203, 213, 225);
  doc.line(40, y, pageWidth - 40, y);
  y += 16;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Disclaimer: MediMitra is a medication adherence and health tracking companion. It does not diagnose medical conditions, prescribe medicines, or replace professional medical advice.',
    40,
    y,
    { maxWidth: pageWidth - 80 }
  );

  const safeName = payload.profile.fullName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`MediMitra_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
