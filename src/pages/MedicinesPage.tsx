import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Edit3, PackagePlus, Pill, Plus, ShieldAlert, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLocalDateString } from '../lib/dateUtils';
import { MealTiming, Medicine, MedicineForm } from '../types/medimitra';

const ThresholdInput: React.FC<{
  medId: string;
  initialThreshold: number;
  onCommit: (val: number) => void;
}> = ({ medId, initialThreshold, onCommit }) => {
  const [draft, setDraft] = useState(String(initialThreshold));

  useEffect(() => {
    setDraft(String(initialThreshold));
  }, [initialThreshold]);

  const commit = () => {
    const parsed = Number(draft);
    const safe = Number.isNaN(parsed) ? initialThreshold : Math.max(0, Math.min(500, Math.round(parsed)));
    setDraft(String(safe));
    if (safe !== initialThreshold) {
      onCommit(safe);
    }
  };

  return (
    <input
      id={`med-threshold-${medId}`}
      type="number"
      min={0}
      max={500}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className="w-16 min-h-[36px] px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
    />
  );
};

const MEAL_OPTIONS: MealTiming[] = [
  'before_breakfast',
  'after_breakfast',
  'before_lunch',
  'after_lunch',
  'before_dinner',
  'after_dinner',
  'bedtime',
  'custom',
];

const DEFAULT_TIMES: Record<MealTiming, string> = {
  before_breakfast: '07:30',
  after_breakfast: '08:30',
  before_lunch: '12:30',
  after_lunch: '13:30',
  before_dinner: '19:30',
  after_dinner: '20:30',
  bedtime: '22:00',
  custom: '10:00',
};

export const MedicinesPage: React.FC = () => {
  const {
    userAccount,
    isDemoMode,
    patientProfile,
    medicines,
    canCurrentUserEditPatient,
    saveMedicineWithSchedule,
    deleteMedicine,
    restockMedicine,
    updateLowStockThreshold,
    updateMedicineThreshold,
    t,
  } = useApp();

  const canEditPatientProfile = userAccount?.role === 'patient' || isDemoMode;
  const defaultThreshold = patientProfile?.defaultLowStockThreshold ?? 7;
  const [thresholdDraft, setThresholdDraft] = useState<number>(defaultThreshold);
  const [thresholdSaving, setThresholdSaving] = useState(false);
  const [thresholdSavedMsg, setThresholdSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setThresholdDraft(patientProfile?.defaultLowStockThreshold ?? 7);
  }, [patientProfile?.defaultLowStockThreshold]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState<MedicineForm>('tablet');
  const [instructions, setInstructions] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [mealTimings, setMealTimings] = useState<MealTiming[]>(['after_breakfast']);
  const [customTimes, setCustomTimes] = useState<string[]>(['08:30']);
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState('');
  const [stockQuantity, setStockQuantity] = useState(30);
  const [refillThreshold, setRefillThreshold] = useState(7);
  const [doctorRef, setDoctorRef] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openAdd = () => {
    setEditingMed(null);
    setName('');
    setDosage('');
    setForm('tablet');
    setInstructions('Take with water after meal.');
    setFrequency('Once daily');
    setMealTimings(['after_breakfast']);
    setCustomTimes(['08:30']);
    setStartDate(getLocalDateString());
    setEndDate('');
    setStockQuantity(30);
    setRefillThreshold(defaultThreshold);
    setDoctorRef('');
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (m: Medicine) => {
    setEditingMed(m);
    setName(m.name);
    setDosage(m.dosage);
    setForm(m.form);
    setInstructions(m.instructions);
    setFrequency(m.frequency);
    setMealTimings(m.mealTimings.length ? m.mealTimings : ['after_breakfast']);
    setCustomTimes(m.customTimes.length ? m.customTimes : ['08:30']);
    setStartDate(m.startDate);
    setEndDate(m.endDate);
    setStockQuantity(m.stockQuantity);
    setRefillThreshold(m.refillThreshold);
    setDoctorRef(m.doctorRef);
    setIsActive(m.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  const toggleMealTiming = (mt: MealTiming) => {
    if (mealTimings.includes(mt)) {
      if (mealTimings.length === 1) return;
      const idx = mealTimings.indexOf(mt);
      setMealTimings((prev) => prev.filter((item) => item !== mt));
      setCustomTimes((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setMealTimings((prev) => [...prev, mt]);
      setCustomTimes((prev) => [...prev, DEFAULT_TIMES[mt] || '09:00']);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !dosage.trim()) {
      setFormError('Medicine name and dosage are required.');
      return;
    }
    if (customTimes.some((tm) => !tm)) {
      setFormError('Please specify a valid time for every selected meal slot.');
      return;
    }
    setSaving(true);
    try {
      await saveMedicineWithSchedule({
        existingId: editingMed?.id,
        name,
        dosage,
        form,
        instructions,
        frequency,
        mealTimings,
        customTimes,
        startDate,
        endDate,
        stockQuantity,
        refillThreshold,
        doctorRef,
        isActive,
      });
      setModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unable to save medicine.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.nav.medicines}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Manage prescriptions, meal timings, and stock levels. Stock decreases automatically when doses are marked taken.
          </p>
        </div>
        {canCurrentUserEditPatient ? (
          <button
            type="button"
            onClick={openAdd}
            className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Add Medicine
          </button>
        ) : (
          <div className="text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 px-3.5 py-2 rounded-xl inline-flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            View-Only Caregiver Access
          </div>
        )}
      </div>

      {/* Low Stock Threshold Setting */}
      {patientProfile && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <SlidersHorizontal className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Low Stock Threshold</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Highlight medication cards and alert caregivers when remaining stock drops below each medicine&apos;s threshold.{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                  {medicines.filter((m) => m.stockQuantity < (m.refillThreshold ?? defaultThreshold)).length} of {medicines.length} medicines
                </span>{' '}
                currently need attention.
              </p>
            </div>

            {canCurrentUserEditPatient && (
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {[5, 7, 10, 14].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setThresholdDraft(preset)}
                      className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                        thresholdDraft === preset
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="global-low-stock-threshold" className="sr-only">
                    Low Stock Threshold
                  </label>
                  <input
                    id="global-low-stock-threshold"
                    type="number"
                    min={0}
                    max={500}
                    value={thresholdDraft}
                    onChange={(e) => setThresholdDraft(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
                    className="w-20 min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white tabular-nums"
                  />
                </div>

                {canEditPatientProfile && (
                  <button
                    type="button"
                    disabled={thresholdSaving}
                    onClick={async () => {
                      setThresholdSaving(true);
                      try {
                        await updateLowStockThreshold(thresholdDraft, false);
                        setThresholdSavedMsg(`Default set to ${thresholdDraft} units.`);
                        setTimeout(() => setThresholdSavedMsg(null), 3500);
                      } finally {
                        setThresholdSaving(false);
                      }
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    Save Default
                  </button>
                )}

                <button
                  type="button"
                  disabled={thresholdSaving || medicines.length === 0}
                  onClick={async () => {
                    setThresholdSaving(true);
                    try {
                      await updateLowStockThreshold(thresholdDraft, true);
                      setThresholdSavedMsg(`Applied threshold (${thresholdDraft}) to all medicines.`);
                      setTimeout(() => setThresholdSavedMsg(null), 3500);
                    } finally {
                      setThresholdSaving(false);
                    }
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  Apply to All
                </button>
              </div>
            )}
          </div>

          {thresholdSavedMsg && (
            <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              {thresholdSavedMsg}
            </p>
          )}
        </section>
      )}

      {medicines.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Pill className="w-10 h-10 text-teal-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No medicines added yet</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Add your prescribed medicines manually or scan a prescription to extract them.
          </p>
          {canCurrentUserEditPatient && (
            <button
              type="button"
              onClick={openAdd}
              className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold cursor-pointer"
            >
              Add First Medicine
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medicines.map((med) => {
            const medThreshold = med.refillThreshold ?? defaultThreshold;
            const isLow = med.stockQuantity < medThreshold;
            const isOut = med.stockQuantity === 0;
            const barDenominator = Math.max(medThreshold * 2, med.stockQuantity, 10);
            const barWidth = Math.min(100, Math.round((med.stockQuantity / barDenominator) * 100));

            return (
              <div
                key={med.id}
                className={`rounded-3xl border p-6 flex flex-col justify-between gap-4 transition-colors ${
                  isLow
                    ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-300 dark:border-amber-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {isLow && (
                    <div
                      role="status"
                      className="mb-3 rounded-2xl bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-3.5 py-2.5 flex items-center gap-2.5 text-amber-950 dark:text-amber-100"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold tabular-nums">
                        {isOut
                          ? `Out of Stock · Below low stock threshold (${medThreshold})`
                          : `Low Stock · Only ${med.stockQuantity} left (below threshold of ${medThreshold})`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {med.form.toUpperCase()} · {med.frequency}
                        {!med.isActive ? ' · PAUSED' : ''}
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                        {med.name}{' '}
                        <span className="text-base font-semibold text-teal-700 dark:text-teal-300">
                          {med.dosage}
                        </span>
                      </h3>
                    </div>
                    {canCurrentUserEditPatient && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(med)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          aria-label={`Edit ${med.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMedicine(med.id)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          aria-label={`Delete ${med.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{med.instructions}</p>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    <span>
                      Times: <strong className="text-slate-900 dark:text-slate-100">{med.customTimes.join(', ')}</strong>
                    </span>
                    <span>
                      Meals:{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        {med.mealTimings.map((mt) => t.meals[mt] || mt).join(', ')}
                      </strong>
                    </span>
                    {med.doctorRef && (
                      <span>
                        Doctor: <strong className="text-slate-900 dark:text-slate-100">{med.doctorRef}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 space-y-3">
                  {/* Visual Stock Meter */}
                  <div>
                    <div className="flex items-center justify-between text-xs tabular-nums mb-1.5">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Remaining Stock:{' '}
                        <strong
                          className={
                            isLow
                              ? 'text-rose-700 dark:text-rose-300 text-sm'
                              : 'text-slate-900 dark:text-white text-sm'
                          }
                        >
                          {med.stockQuantity} left
                        </strong>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">
                        Low Stock Threshold: {medThreshold}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOut
                            ? 'bg-rose-600'
                            : isLow
                              ? 'bg-amber-500'
                              : 'bg-teal-600'
                        }`}
                        style={{ width: `${Math.max(isLow && med.stockQuantity > 0 ? 12 : 0, barWidth)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {canCurrentUserEditPatient ? (
                      <div className="flex items-center gap-2 text-xs">
                        <label
                          htmlFor={`med-threshold-${med.id}`}
                          className="font-semibold text-slate-600 dark:text-slate-300"
                        >
                          Threshold:
                        </label>
                        <ThresholdInput
                          medId={med.id}
                          initialThreshold={medThreshold}
                          onCommit={(val) => updateMedicineThreshold(med.id, val)}
                        />
                      </div>
                    ) : (
                      <span />
                    )}

                    {canCurrentUserEditPatient && (
                      <button
                        type="button"
                        onClick={() => restockMedicine(med.id, 30)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <PackagePlus className="w-4 h-4" />
                        +30 Refill
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl my-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingMed ? 'Edit Medicine' : 'Add New Medicine'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 p-3 text-sm text-rose-800 dark:text-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Metformin"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g., 500 mg"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Form
                  </label>
                  <select
                    value={form}
                    onChange={(e) => setForm(e.target.value as MedicineForm)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="drops">Drops</option>
                    <option value="inhaler">Inhaler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="Once daily / Twice daily"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Doctor / Prescription Ref
                  </label>
                  <input
                    type="text"
                    value={doctorRef}
                    onChange={(e) => setDoctorRef(e.target.value)}
                    placeholder="Dr. Kavitha"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Meal Timings (Select one or more)
                </label>
                <div className="flex flex-wrap gap-2">
                  {MEAL_OPTIONS.map((mt) => {
                    const selected = mealTimings.includes(mt);
                    return (
                      <button
                        key={mt}
                        type="button"
                        onClick={() => toggleMealTiming(mt)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                          selected
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {t.meals[mt]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reminder Clock Times
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {mealTimings.map((mt, idx) => (
                    <div key={`${mt}-${idx}`} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        {t.meals[mt]}
                      </div>
                      <input
                        type="time"
                        value={customTimes[idx] || '08:30'}
                        onChange={(e) =>
                          setCustomTimes((prev) =>
                            prev.map((tm, i) => (i === idx ? e.target.value : tm))
                          )
                        }
                        className="w-full text-sm font-mono bg-transparent text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value) || 0)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={refillThreshold}
                    onChange={(e) => setRefillThreshold(Number(e.target.value) || 0)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Instructions
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g., Take with warm water after breakfast"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-teal-600"
                />
                <span>Active reminder schedule enabled</span>
              </label>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
                >
                  {saving ? 'Saving...' : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
