# MediMitra Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **PII Isolation (`users`)**: User account documents (`/users/{userId}`) contain email and phone PII. Only the owning `request.auth.uid == userId` may read or write their own account document. Blanket reads or list queries are forbidden.
2. **Master Gate (`patientProfiles`)**: `/patientProfiles/{patientId}` is owned by `patientId == request.auth.uid`. It stores the authoritative `authorizedCaregiverIds` (max 10) and `caregiverCanEditIds` (max 10) arrays.
3. **Caregiver Access Boundary**: A caregiver may only read patient data (`medicines`, `medicationSchedules`, `medicationLogs`, `healthReadings`, `prescriptions`, `appointments`, `emergencyContacts`, `notifications`, `auditLogs`) if their verified UID is present in `authorizedCaregiverIds`.
4. **Caregiver Write Restriction**: A caregiver may only create or modify `medicines` or `medicationSchedules` if their UID is present in the Master Gate `caregiverCanEditIds` on `/patientProfiles/{patientId}`. Caregivers cannot delete a patient profile or revoke another caregiver.
5. **Email Verification Guard**: Accepting a pending caregiver invitation via email matching requires `request.auth.token.email_verified == true`.
6. **Terminal State Locking**: Revoked caregiver connections (`status == 'revoked'`) cannot be transitioned back to `'active'` or `'pending'`.
7. **Temporal Integrity**: All `createdAt` fields must equal `request.time` on creation, and `updatedAt` fields must equal `request.time` on update. `createdAt` and `patientId` are immutable after creation.
8. **Immutable Audit Logs**: `auditLogs` can never be updated or deleted by any client.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Cross-Patient Read**: Caregiver/Patient B calls `get('/medicines/med_A')` where `patientId == 'patientA'` and B is not in `authorizedCaregiverIds`.
2. **Unverified Email Invite Hijack**: Attacker with `email_verified: false` matching `caregiverEmail` attempts `update('/caregiverConnections/conn1')` to set `status: 'active'`.
3. **Shadow Field Injection (User Role Escalation)**: User calls `create('/users/uid1')` with extra ghost field `isAdmin: true` or tries `update` changing `role` from `'patient'` to `'caregiver'`.
4. **Caregiver Read-Only Escalation**: Caregiver with `canViewLogs: true` but NOT in `caregiverCanEditIds` attempts `create('/medicines/med2')` for `patientA`.
5. **Orphaned Medicine Write**: User attempts `create('/medicines/med3')` referencing a non-existent `patientId: 'ghost_patient'`.
6. **ID Poisoning**: User attempts `create('/medicines/' + 'A'.repeat(200))` or ID containing `/` or spaces.
7. **Timestamp Forgery**: User attempts `create('/healthReadings/hr1')` with backdated `createdAt` instead of `request.time`.
8. **PatientId Reassignment**: Attacker attempts `update('/medicines/med1')` to reassign `patientId` to another UID.
9. **Audit Log Tampering**: User attempts `update('/auditLogs/log1')` or `delete('/auditLogs/log1')` to erase a correction entry.
10. **Revoked Connection Resurrection**: Revoked caregiver attempts `update('/caregiverConnections/conn_revoked')` to restore `status: 'active'`.
11. **Unbounded Array Resource Exhaustion**: User attempts `create('/patientProfiles/uid1')` with 25 entries in `conditions` or `authorizedCaregiverIds` (> 10 max).
12. **Blanket List Scraping**: Authenticated user queries `collection('medicines')` without filtering by `patientId == uid` or `authorizedCaregiverIds array-contains uid`.
