import React, { useState } from 'react';
import { Copy, MapPin, PhoneCall, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const EmergencyPage: React.FC = () => {
  const { emergencyContacts, saveEmergencyContact, deleteEmergencyContact, canCurrentUserEditPatient, patientProfile } = useApp();

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [copiedLoc, setCopiedLoc] = useState(false);

  const handleRequestLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Location sharing is not supported in this browser.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setLocationLoading(false);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was declined. You can still call any contact directly.'
            : 'Unable to retrieve your current GPS coordinates.'
        );
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCopyLocationMsg = async () => {
    if (!locationCoords) return;
    const msg = `SOS Help Needed for ${patientProfile?.fullName || 'MediMitra Patient'}. Current location: https://maps.google.com/?q=${locationCoords.lat},${locationCoords.lng}`;
    await navigator.clipboard.writeText(msg);
    setCopiedLoc(true);
    setTimeout(() => setCopiedLoc(false), 3000);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    if (!name.trim() || phone.trim().length < 5) {
      setContactError('Please enter a contact name and a valid phone number (at least 5 digits).');
      return;
    }
    setSaving(true);
    try {
      await saveEmergencyContact({
        name,
        relationship: relationship || 'Family',
        phone,
        isPrimary,
      });
      setName('');
      setRelationship('');
      setPhone('');
      setIsPrimary(false);
    } catch (err: unknown) {
      setContactError(err instanceof Error ? err.message : 'Unable to save emergency contact.');
    } finally {
      setSaving(false);
    }
  };

  const sortedContacts = [...emergencyContacts].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary)
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Prominent SOS Banner */}
      <div className="rounded-3xl bg-rose-700 text-white p-6 sm:p-8 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-8 h-8 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Emergency SOS & Direct Calling</h2>
            <p className="mt-1.5 text-sm sm:text-base text-rose-100 leading-relaxed">
              Tap a button below to open your phone&apos;s dialer immediately. <strong>Important:</strong> MediMitra does NOT automatically contact emergency services on your behalf—please tap Call directly if you need urgent assistance.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="tel:112"
            className="min-h-[52px] px-6 py-3 rounded-2xl bg-white text-rose-800 hover:bg-rose-50 font-bold text-base inline-flex items-center gap-2 transition-colors"
          >
            <PhoneCall className="w-5 h-5" />
            Call Emergency Helpline (112)
          </a>

          {sortedContacts[0] && (
            <a
              href={`tel:${sortedContacts[0].phone.replace(/\s+/g, '')}`}
              className="min-h-[52px] px-6 py-3 rounded-2xl bg-rose-900 hover:bg-rose-950 border border-rose-400 text-white font-bold text-base inline-flex items-center gap-2 transition-colors"
            >
              <PhoneCall className="w-5 h-5" />
              Call {sortedContacts[0].name}
            </a>
          )}
        </div>
      </div>

      {/* Optional Permission-Based Location Sharing */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600" />
              <span>Optional Location Sharing</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Your location is accessed ONLY when you tap below and grant browser permission.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestLocation}
            disabled={locationLoading}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold cursor-pointer"
          >
            {locationLoading ? 'Locating...' : 'Share My Current Location'}
          </button>
        </div>

        {locationError && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{locationError}</p>
        )}

        {locationCoords && (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-teal-900 dark:text-teal-100">Coordinates ready: </span>
              <span className="font-mono tabular-nums text-teal-800 dark:text-teal-200">
                {locationCoords.lat}, {locationCoords.lng}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLocationMsg}
                className="px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedLoc ? 'Copied SOS Message!' : 'Copy SOS Location Message'}
              </button>
              {sortedContacts[0] && (
                <a
                  href={`sms:${sortedContacts[0].phone.replace(/\s+/g, '')}?body=${encodeURIComponent(
                    `SOS Help Needed. Location: https://maps.google.com/?q=${locationCoords.lat},${locationCoords.lng}`
                  )}`}
                  className="px-3.5 py-2 rounded-xl border border-teal-600 text-teal-800 dark:text-teal-200 text-xs font-bold"
                >
                  Send SMS
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Emergency Contacts List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Saved Emergency Contacts ({sortedContacts.length})
          </h3>
          {sortedContacts.length === 0 ? (
            <p className="text-sm text-slate-500">No emergency contacts added yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedContacts.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {c.name}{' '}
                      {c.isPrimary && (
                        <span className="text-xs text-teal-700 dark:text-teal-300">· Primary</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      {c.relationship} · {c.phone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${c.phone.replace(/\s+/g, '')}`}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Call
                    </a>
                    {canCurrentUserEditPatient && (
                      <button
                        type="button"
                        onClick={() => deleteEmergencyContact(c.id)}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 cursor-pointer"
                        aria-label={`Remove ${c.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {canCurrentUserEditPatient && (
          <form
            onSubmit={handleAddContact}
            className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-600" />
              <span>Add Emergency Contact</span>
            </h3>
            {contactError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 p-3 text-xs font-medium text-rose-800 dark:text-rose-200">
                {contactError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold mb-1">Contact Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ananya Rao"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Relationship *</label>
              <input
                type="text"
                required
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Daughter / Son / Neighbor / Doctor"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98450 12345"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <span>Mark as primary SOS contact</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[48px] rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
