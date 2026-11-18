import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Check,
  HeartHandshake,
  ShieldCheck,
  UserPlus,
  UserX,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CaregiverPermissions } from '../types/medimitra';

export const CaregiverDashboardPage: React.FC = () => {
  const {
    userAccount,
    patientProfile,
    connectedPatients,
    selectedPatientId,
    setSelectedPatientId,
    activeCaregiverPermissions,
    caregiverConnections,
    medicines,
    logs,
    readings,
    appointments,
    notifications,
    inviteCaregiver,
    respondCaregiverInvite,
    updateCaregiverPermissions,
    revokeCaregiver,
    navigate,
    t,
  } = useApp();

  const isCaregiver = userAccount?.role === 'caregiver';
  const canViewLogs = activeCaregiverPermissions ? activeCaregiverPermissions.canViewLogs : true;
  const canViewVitals = activeCaregiverPermissions ? activeCaregiverPermissions.canViewVitals : true;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [cgName, setCgName] = useState('');
  const [cgEmail, setCgEmail] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [escalationDelay, setEscalationDelay] = useState(30);
  const [perms, setPerms] = useState<CaregiverPermissions>({
    canViewLogs: true,
    canViewVitals: true,
    canManageSchedules: false,
    receiveMissedDoseAlerts: true,
    receiveRefillAlerts: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const pendingInvites = caregiverConnections.filter((c) => c.status === 'pending');
  const activeConnections = caregiverConnections.filter((c) => c.status === 'active');

  const adherencePercent = useMemo(() => {
    if (logs.length === 0) return 100;
    const taken = logs.filter((l) => l.status === 'taken').length;
    return Math.round((taken / logs.length) * 100);
  }, [logs]);

  const missedAlerts = logs.filter((l) => l.status === 'missed');
  const defaultThreshold = patientProfile?.defaultLowStockThreshold ?? 7;
  const lowStock = medicines.filter((m) => m.stockQuantity < (m.refillThreshold ?? defaultThreshold));
  const latestBp = readings
    .filter((r) => r.type === 'bp')
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  const latestGlucose = readings
    .filter((r) => r.type === 'glucose')
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!cgName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cgEmail.trim())) {
      setInviteError('Please enter a valid caregiver name and email address.');
      return;
    }
    setSubmitting(true);
    try {
      await inviteCaregiver({
        caregiverName: cgName,
        caregiverEmail: cgEmail,
        relationship,
        escalationDelayMinutes: escalationDelay,
        permissions: perms,
      });
      setInviteOpen(false);
      setCgName('');
      setCgEmail('');
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Unable to send invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <HeartHandshake className="w-6 h-6 text-teal-600" />
            <span>{t.nav.caregiver}</span>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {isCaregiver
              ? 'Monitor connected patients, review missed-dose escalations, and support daily care within granted permissions.'
              : 'Authorize trusted family caregivers, control exact permissions, or revoke access anytime.'}
          </p>
        </div>

        {!isCaregiver && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            Invite Family Caregiver
          </button>
        )}
      </div>

      {/* Caregiver View: Pending Invitations */}
      {isCaregiver && pendingInvites.length > 0 && (
        <div className="rounded-3xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-6 space-y-3">
          <h3 className="text-base font-bold text-sky-950 dark:text-sky-100">
            Pending Patient Caregiver Invitations ({pendingInvites.length})
          </h3>
          {pendingInvites.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {inv.patientName} invited you ({inv.relationship})
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permissions: View Logs {inv.permissions.canViewLogs ? '✓' : '✕'} · View Vitals{' '}
                  {inv.permissions.canViewVitals ? '✓' : '✕'} · Manage Schedules{' '}
                  {inv.permissions.canManageSchedules ? '✓' : '✕'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => respondCaregiverInvite(inv, true)}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Approve & Connect
                </button>
                <button
                  type="button"
                  onClick={() => respondCaregiverInvite(inv, false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Caregiver Monitoring Overview (Shown to Caregiver when connected, or Patient previewing shared status) */}
      {isCaregiver && connectedPatients.length === 0 ? (
        activeConnections.length > 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 space-y-4">
            <div className="flex items-center gap-3">
              <HeartHandshake className="w-7 h-7 text-teal-600 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Connected &amp; Awaiting Initial Sync
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  You approved the caregiver connection. Patient health records will appear automatically as soon as the patient opens MediMitra to complete initial encryption/access key sync.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {activeConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{conn.patientName}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Relationship: {conn.relationship} · Status: Active
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-teal-800 dark:text-teal-200">
                    Waiting for patient&apos;s device to sync permissions
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
            <HeartHandshake className="w-10 h-10 text-teal-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No connected patients yet
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Ask your family member to invite your signed-in Google email from their MediMitra Caregiver settings. Invitations appear right here for approval.
            </p>
          </div>
        )
      ) : (
        patientProfile && (
          <div className="space-y-6">
            {isCaregiver && connectedPatients.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {connectedPatients.map((p) => (
                  <button
                    key={p.patientId}
                    type="button"
                    onClick={() => setSelectedPatientId(p.patientId)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border cursor-pointer ${
                      selectedPatientId === p.patientId
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {p.fullName}
                  </button>
                ))}
              </div>
            )}

            {/* Connected Patient KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-xs font-semibold text-slate-500">Patient Overview</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {patientProfile.fullName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Age {patientProfile.age} · {patientProfile.conditions.join(', ') || 'General Care'}
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-xs font-semibold text-slate-500">Overall Adherence</p>
                <p className="mt-1 text-3xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
                  {canViewLogs ? `${adherencePercent}%` : 'Hidden'}
                </p>
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  {canViewLogs
                    ? `${missedAlerts.length} missed dose(s) recorded`
                    : 'Logs hidden by patient privacy'}
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-xs font-semibold text-slate-500">Latest BP & Glucose</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {!canViewVitals
                    ? 'Hidden by privacy'
                    : `${latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '—'} mmHg · ${latestGlucose ? `${latestGlucose.glucoseValue}` : '—'} mg/dL`}
                </p>
                {canViewVitals && (
                  <button
                    type="button"
                    onClick={() => navigate('bp-tracker')}
                    className="mt-1 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                  >
                    Inspect charts →
                  </button>
                )}
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-xs font-semibold text-slate-500">Refill & Alerts</p>
                <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  {lowStock.length} low stock
                </p>
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  {notifications.filter((n) => !n.read).length} unread alerts
                </p>
              </div>
            </div>

            {/* Missed Reminders & Escalations + Upcoming Appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white mb-4">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span>Missed Reminders & Escalations</span>
                </div>
                {!canViewLogs ? (
                  <p className="text-sm text-slate-500">Medication log visibility is disabled in patient privacy settings.</p>
                ) : missedAlerts.length === 0 ? (
                  <p className="text-sm text-slate-500">No missed doses or escalations recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {missedAlerts.slice(0, 6).map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-sm"
                      >
                        <div className="font-bold text-rose-950 dark:text-rose-100">
                          {m.medicineName} ({m.dosage})
                        </div>
                        <div className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 tabular-nums">
                          Scheduled: {m.scheduledFor} ·{' '}
                          {m.escalatedToCaregiver ? 'Escalated to Caregiver' : 'Marked Missed'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
                    <CalendarDays className="w-5 h-5 text-teal-600" />
                    <span>Upcoming Appointments</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('appointments')}
                    className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                  >
                    Manage →
                  </button>
                </div>
                {appointments.filter((a) => a.status === 'upcoming').length === 0 ? (
                  <p className="text-sm text-slate-500">No upcoming doctor appointments.</p>
                ) : (
                  <div className="space-y-2.5">
                    {appointments
                      .filter((a) => a.status === 'upcoming')
                      .map((a) => (
                        <div
                          key={a.id}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
                        >
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {a.doctorName} ({a.specialty})
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 tabular-nums">
                            {a.appointmentDate} at {a.appointmentTime} · {a.clinicName}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* Patient Privacy & Access Management Table */}
      {!isCaregiver && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white mb-4">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <span>Authorized Caregivers & Privacy Controls</span>
          </div>

          {caregiverConnections.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              You have not invited any family caregivers yet. Click &ldquo;Invite Family Caregiver&rdquo; above to share access securely.
            </p>
          ) : (
            <div className="space-y-4">
              {caregiverConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {conn.caregiverName}
                      </span>
                      <span className="text-xs text-slate-500">
                        · {conn.relationship} · {conn.caregiverEmail}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase ${
                          conn.status === 'active'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : conn.status === 'revoked'
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        · {conn.status}
                      </span>
                    </div>

                    {conn.status !== 'revoked' && (
                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        {(
                          [
                            ['canViewLogs', 'View Logs'],
                            ['canViewVitals', 'View Vitals'],
                            ['canManageSchedules', 'Manage Schedules'],
                            ['receiveMissedDoseAlerts', 'Missed Alerts'],
                            ['receiveRefillAlerts', 'Refill Alerts'],
                          ] as Array<[keyof CaregiverPermissions, string]>
                        ).map(([key, label]) => (
                          <label key={key} className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={conn.permissions[key]}
                              onChange={(e) =>
                                updateCaregiverPermissions(conn, {
                                  ...conn.permissions,
                                  [key]: e.target.checked,
                                })
                              }
                              className="w-4 h-4 accent-teal-600"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {conn.status !== 'revoked' && (
                    <button
                      type="button"
                      onClick={() => revokeCaregiver(conn)}
                      className="min-h-[40px] px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 self-start lg:self-center cursor-pointer"
                    >
                      <UserX className="w-4 h-4" />
                      Revoke Access
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Invite Family Caregiver
              </h3>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="mb-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 p-3 text-xs text-rose-800 dark:text-rose-200">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Caregiver Full Name *</label>
                <input
                  type="text"
                  required
                  value={cgName}
                  onChange={(e) => setCgName(e.target.value)}
                  placeholder="e.g., Ananya Rao"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Google Email *</label>
                  <input
                    type="email"
                    required
                    value={cgEmail}
                    onChange={(e) => setCgEmail(e.target.value)}
                    placeholder="caregiver@gmail.com"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Relationship</label>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="Daughter / Son / Spouse"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  Missed-Dose Escalation Delay (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={escalationDelay}
                  onChange={(e) => setEscalationDelay(Number(e.target.value) || 30)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-2 text-xs">
                <p className="font-bold">Permissions:</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={perms.canManageSchedules}
                    onChange={(e) =>
                      setPerms((p) => ({ ...p, canManageSchedules: e.target.checked }))
                    }
                    className="w-4 h-4 accent-teal-600"
                  />
                  <span>Allow caregiver to edit medicine schedules</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={perms.receiveMissedDoseAlerts}
                    onChange={(e) =>
                      setPerms((p) => ({ ...p, receiveMissedDoseAlerts: e.target.checked }))
                    }
                    className="w-4 h-4 accent-teal-600"
                  />
                  <span>Receive missed-dose escalation alerts</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
                >
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
