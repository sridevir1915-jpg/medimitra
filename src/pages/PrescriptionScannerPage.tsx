import React, { useState } from 'react';
import { AlertTriangle, Check, FileText, ScanLine, ShieldAlert, Upload } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { useApp } from '../context/AppContext';
import { getLocalDateString } from '../lib/dateUtils';
import { ExtractedMedicineDraft, MealTiming, MedicineForm } from '../types/medimitra';

export const PrescriptionScannerPage: React.FC = () => {
  const {
    isDemoMode,
    getAuthTokenHeader,
    saveConfirmedPrescription,
    canCurrentUserEditPatient,
    language,
    navigate,
    t,
  } = useApp();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [statusLabel, setStatusLabel] = useState<string>('');
  const [ocrRawText, setOcrRawText] = useState<string>('');
  const [manualText, setManualText] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState(() => getLocalDateString());
  const [draftMeds, setDraftMeds] = useState<ExtractedMedicineDraft[]>([]);
  const [unclearWarnings, setUnclearWarnings] = useState<string[]>([]);
  const [summaryNote, setSummaryNote] = useState('');
  const [confirmedChecked, setConfirmedChecked] = useState(false);
  const [savedDone, setSavedDone] = useState(false);

  const runExtraction = async (imageBase64: string | null, rawText: string, imgMime: string) => {
    setProcessing(true);
    setError(null);
    setSavedDone(false);
    setConfirmedChecked(false);

    try {
      let combinedOcr = rawText;
      if (imageBase64 && !rawText) {
        setStatusLabel('Running OCR text recognition on prescription image...');
        setOcrProgress(15);
        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(15 + m.progress * 55));
            }
          },
        });
        const ret = await worker.recognize(imageBase64);
        combinedOcr = ret.data.text || '';
        setOcrRawText(combinedOcr);
        await worker.terminate();
      }

      setStatusLabel('Structuring prescription draft with Gemini AI (no guessing on unclear writing)...');
      setOcrProgress(85);

      const headers = await getAuthTokenHeader();
      const res = await fetch('/api/ai/prescription-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          imageBase64,
          mimeType: imgMime,
          ocrRawText: combinedOcr,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract prescription details.');
      }

      setDoctorName(data.doctorName || '');
      setClinicName(data.clinicName || '');
      setPrescriptionDate(data.prescriptionDate || getLocalDateString());
      setDraftMeds(Array.isArray(data.medicines) ? data.medicines : []);
      setUnclearWarnings(Array.isArray(data.unclearWarnings) ? data.unclearWarnings : []);
      setSummaryNote(data.summaryNote || '');
      setOcrProgress(100);
      setStatusLabel('Extraction ready for your mandatory review.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to scan prescription.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      setOcrRawText('');
      runExtraction(dataUrl, '', file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const handleTestSample = () => {
    const sampleText = [
      'Dr. Kavitha Deshmukh, MD (General Medicine)',
      'Jayanagar Senior Care Clinic',
      'Date: 2026-11-15',
      'Rx:',
      '1. Tab Metformin 500mg — 1-0-1 after meals (After Breakfast & After Dinner)',
      '2. Tab Amlodipine 5mg — 1-0-0 before breakfast',
      '3. [illegible handwritten line - 1 tablet nightly?]',
    ].join('\n');
    setPreviewUrl(null);
    setOcrRawText(sampleText);
    runExtraction(null, sampleText, 'text/plain');
  };

  const handleConfirmAndSave = async () => {
    if (!confirmedChecked || draftMeds.length === 0) return;
    setProcessing(true);
    try {
      await saveConfirmedPrescription({
        doctorName: doctorName || 'Prescribing Doctor',
        clinicName: clinicName || 'Clinic',
        prescriptionDate,
        ocrRawText,
        medicines: draftMeds,
      });
      setSavedDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save confirmed medicines.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <ScanLine className="w-6 h-6 text-teal-600" />
          <span>{t.nav.scanner}</span>
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Upload a prescription image to extract medicine names and schedules using OCR and Gemini AI. Every item requires your explicit review before saving.
        </p>
      </div>

      {!canCurrentUserEditPatient && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 p-4 text-sm text-amber-900 dark:text-amber-200">
          You currently have view-only access for this patient. Only the patient or an authorized caregiver with schedule editing permission can save extracted medicines.
        </div>
      )}

      {/* Upload & Sample Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <label className="block border-2 border-dashed border-teal-300 dark:border-teal-800 rounded-2xl p-6 text-center cursor-pointer hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition-colors">
            <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
            <span className="block text-sm font-bold text-slate-900 dark:text-white">
              Upload Prescription Photo
            </span>
            <span className="block text-xs text-slate-500 mt-1">
              JPG or PNG · Clear daylight photo works best
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <div className="space-y-2 pt-1">
            <label htmlFor="manual-rx-text" className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Or Paste Typed Prescription Text
            </label>
            <textarea
              id="manual-rx-text"
              rows={3}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste medication lines from a digital prescription or discharge summary..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!manualText.trim()) return;
                setPreviewUrl(null);
                setOcrRawText(manualText.trim());
                runExtraction(null, manualText.trim(), 'text/plain');
              }}
              disabled={processing || !manualText.trim()}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-xs font-bold text-white inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Extract From Pasted Text
            </button>
          </div>

          {isDemoMode && (
            <button
              type="button"
              onClick={handleTestSample}
              disabled={processing}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Demo Sandbox: Try Sample Prescription
            </button>
          )}

          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <img src={previewUrl} alt="Uploaded prescription preview" className="w-full max-h-64 object-contain bg-slate-100 dark:bg-slate-950" />
            </div>
          )}

          {ocrRawText && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">OCR Extracted Text</p>
              <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {ocrRawText}
              </pre>
            </div>
          )}
        </div>

        {/* Review Draft Panel */}
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          {processing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-teal-700 dark:text-teal-300">
                <span>{statusLabel || 'Processing...'}</span>
                <span className="tabular-nums">{ocrProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 p-4 text-sm text-rose-800 dark:text-rose-200">
              {error}
            </div>
          )}

          {savedDone && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center justify-between gap-4">
              <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Confirmed medicines and reminders saved securely!
              </div>
              <button
                type="button"
                onClick={() => navigate('medicines')}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                View Medicines
              </button>
            </div>
          )}

          {draftMeds.length === 0 && !processing ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Upload a prescription image or paste prescription text on the left to review extracted medicines here.
            </div>
          ) : (
            draftMeds.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Mandatory Human Verification:</strong> Never assume unclear handwriting is correct. Edit any field marked unclear before confirming.
                  </span>
                </div>

                {unclearWarnings.length > 0 && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Flagged Unclear Items:
                    </div>
                    {unclearWarnings.map((w, i) => (
                      <div key={i}>• {w}</div>
                    ))}
                  </div>
                )}

                {summaryNote && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">{summaryNote}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Doctor</label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Clinic</label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Date</label>
                    <input
                      type="text"
                      value={prescriptionDate}
                      onChange={(e) => setPrescriptionDate(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {draftMeds.map((med, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-2.5 ${
                        med.confidence === 'unclear'
                          ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold">
                          Extracted Item #{idx + 1} · Confidence: {med.confidence.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDraftMeds((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-600 font-semibold hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      {med.unclearNote && (
                        <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                          Note: {med.unclearNote}
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) =>
                            setDraftMeds((prev) =>
                              prev.map((m, i) => (i === idx ? { ...m, name: e.target.value } : m))
                            )
                          }
                          placeholder="Medicine name"
                          className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
                        />
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) =>
                            setDraftMeds((prev) =>
                              prev.map((m, i) => (i === idx ? { ...m, dosage: e.target.value } : m))
                            )
                          }
                          placeholder="Dosage"
                          className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                        />
                        <select
                          value={med.mealTiming}
                          onChange={(e) =>
                            setDraftMeds((prev) =>
                              prev.map((m, i) =>
                                i === idx ? { ...m, mealTiming: e.target.value as MealTiming } : m
                              )
                            )
                          }
                          className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                        >
                          {Object.entries(t.meals).map(([k, lbl]) => (
                            <option key={k} value={k}>
                              {lbl}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={med.form}
                          onChange={(e) =>
                            setDraftMeds((prev) =>
                              prev.map((m, i) =>
                                i === idx ? { ...m, form: e.target.value as MedicineForm } : m
                              )
                            )
                          }
                          className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                        >
                          <option value="tablet">Tablet</option>
                          <option value="capsule">Capsule</option>
                          <option value="syrup">Syrup</option>
                          <option value="injection">Injection</option>
                          <option value="drops">Drops</option>
                          <option value="inhaler">Inhaler</option>
                        </select>
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) =>
                            setDraftMeds((prev) =>
                              prev.map((m, i) =>
                                i === idx ? { ...m, instructions: e.target.value } : m
                              )
                            )
                          }
                          placeholder="Instructions"
                          className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {canCurrentUserEditPatient && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <label className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmedChecked}
                        onChange={(e) => setConfirmedChecked(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-teal-600"
                      />
                      <span>
                        I confirm I have carefully reviewed and verified every medicine name, dosage, and instruction above against the original prescription.
                      </span>
                    </label>

                    <button
                      type="button"
                      disabled={!confirmedChecked || processing}
                      onClick={handleConfirmAndSave}
                      className="w-full min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-5 h-5" />
                      Confirm & Add {draftMeds.length} Medicine(s) to Schedule
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
