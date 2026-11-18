import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig: FirebaseAppletConfig = JSON.parse(
  fs.readFileSync(firebaseConfigPath, 'utf-8')
);

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0]
) {
  const attempts: Array<{ model: string; delayMs: number }> = [
    { model: params.model, delayMs: 0 },
    { model: params.model, delayMs: 1200 },
    { model: 'gemini-3.1-flash-lite', delayMs: 600 },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
    }
    try {
      return await ai.models.generateContent({
        ...params,
        model: attempt.model,
      });
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429');
      if (!isTransient) {
        throw err;
      }
    }
  }
  throw lastError;
}

interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isDemo: boolean;
}

async function verifyRequestAuth(req: express.Request): Promise<VerifiedUser | null> {
  const isDemoHeader = req.headers['x-medimitra-demo'] === 'true';
  if (isDemoHeader) {
    return {
      uid: 'demo_patient_ramesh',
      email: 'ramesh.demo@medimitra.example',
      emailVerified: true,
      isDemo: true,
    };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;

  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!lookupRes.ok) {
      return null;
    }
    const data = (await lookupRes.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: user.email || '',
      emailVerified: Boolean(user.emailVerified),
      isDemo: false,
    };
  } catch {
    return null;
  }
}

const URGENT_SYMPTOM_PATTERNS = [
  /chest\s*pain/i,
  /pressure\s*in\s*chest/i,
  /shortness\s*of\s*breath/i,
  /difficulty\s*breathing/i,
  /can'?t\s*breathe/i,
  /faint(ing|ed)?/i,
  /unconscious/i,
  /slurred\s*speech/i,
  /sudden\s*weakness/i,
  /suicidal/i,
  /overdose/i,
  /double\s*dose/i,
  /took\s*extra/i,
  /ಎದೆ\s*ನೋವು/i,
  /ಉಸಿರಾಟದ\s*ತೊಂದರೆ/i,
  /सीने\s*में\s*दर्द/i,
  /सांस\s*लेने\s*में/i,
];

function detectUrgentContext(message: string, context: Record<string, unknown> | undefined): boolean {
  if (URGENT_SYMPTOM_PATTERNS.some((re) => re.test(message))) {
    return true;
  }
  const latestBp = context?.latestBp as { systolic?: number; diastolic?: number } | undefined;
  if (latestBp && ((latestBp.systolic ?? 0) >= 180 || (latestBp.diastolic ?? 0) >= 120)) {
    if (/bp|pressure|reading|high|urgent|ಬಿಪಿ|रक्तचाप/i.test(message)) {
      return true;
    }
  }
  const latestGlucose = context?.latestGlucose as { glucoseValue?: number } | undefined;
  if (latestGlucose && ((latestGlucose.glucoseValue ?? 100) < 55 || (latestGlucose.glucoseValue ?? 100) > 350)) {
    if (/sugar|glucose|diabetes|reading|ಸಕ್ಕರೆ|शुगर|ग्लूकोज/i.test(message)) {
      return true;
    }
  }
  return false;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  kn: 'Kannada (ಕನ್ನಡ)',
  hi: 'Hindi (हिन्दी)',
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'MediMitra API',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      fcmAdminConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
      projectId: firebaseConfig.projectId,
    });
  });

  app.get('/api/notifications/architecture', (_req, res) => {
    res.json({
      fcmServerConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
      vapidConfigured: Boolean(process.env.VITE_FIREBASE_VAPID_KEY),
      requiredEnvVars: [
        'VITE_FIREBASE_VAPID_KEY (Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates)',
        'FIREBASE_SERVICE_ACCOUNT_JSON (Firebase Admin SDK private key JSON for server-side FCM v1 dispatch & Cloud Scheduler cron)',
      ],
      browserLimitationNote:
        'Web browser tabs and service workers cannot guarantee exact wake-up alarms when the browser or device is completely closed. For mission-critical elderly medication alarms, pair this backend scheduler with a native Android companion app using AlarmManager (exact alarms) + WorkManager + high-priority FCM data messages.',
      androidBridgeContract: {
        scheduleSyncEndpoint: '/api/reminders/android-sync-spec',
        fcmPayloadFormat: {
          type: 'MEDICATION_ALARM',
          scheduleId: 'string',
          medicineName: 'string',
          dosage: 'string',
          scheduledTimeHHmm: 'string',
          repeatIntervalMinutes: 'number',
          escalationDelayMinutes: 'number',
        },
      },
    });
  });

  app.post('/api/notifications/fcm-send', async (req, res) => {
    const authUser = await verifyRequestAuth(req);
    if (!authUser) {
      res.status(401).json({ error: 'Authentication required to dispatch push notifications.' });
      return;
    }

    const { recipientToken, title, body } = req.body as {
      recipientToken?: string;
      title?: string;
      body?: string;
    };

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      res.status(200).json({
        dispatched: false,
        requiresConfig: true,
        requiredEnv: ['FIREBASE_SERVICE_ACCOUNT_JSON', 'VITE_FIREBASE_VAPID_KEY'],
        message:
          'FCM server credentials (FIREBASE_SERVICE_ACCOUNT_JSON) are not configured in this environment. Alert was recorded in Firestore and delivered via in-app & browser notifications.',
        preview: { recipientToken: recipientToken ? '***configured***' : 'none', title, body },
      });
      return;
    }

    res.status(200).json({
      dispatched: false,
      requiresConfig: true,
      message: 'Service account detected; connect Firebase Admin messaging().send() in production worker.',
    });
  });

  app.post('/api/ai/companion', async (req, res) => {
    const authUser = await verifyRequestAuth(req);
    if (!authUser) {
      res.status(401).json({ error: 'Please sign in to access the AI Health Companion.' });
      return;
    }

    const { message, language = 'en', history = [], patientContext } = req.body as {
      message?: string;
      language?: 'en' | 'kn' | 'hi';
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      patientContext?: Record<string, unknown>;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Please enter or speak a question.' });
      return;
    }

    const urgentAlert = detectUrgentContext(message, patientContext);
    const targetLangName = LANGUAGE_NAMES[language] || 'English';

    const systemInstruction = [
      `You are MediMitra's warm, gentle, elderly-friendly AI Health Companion.`,
      `CRITICAL SAFETY RULES:`,
      `1. You are NOT a doctor or licensed medical professional. Always remind the user gently when discussing health patterns that you are an AI companion, not a doctor.`,
      `2. NEVER diagnose diseases, NEVER prescribe medications, NEVER suggest changing dosages, NEVER tell a user to take a double or extra dose after a missed dose, and NEVER provide emergency medical treatment instructions.`,
      `3. If the user describes urgent symptoms (chest pain, severe breathing trouble, fainting, confusion) or dangerously high/low readings, immediately advise them to seek qualified medical care or call local emergency services (e.g. 108 / 112 in India or local emergency number) and contact their family caregiver.`,
      `4. Answer ONLY using the authorized patient health records JSON provided below. If something is not in the records, politely say you do not see it recorded yet.`,
      `5. Respond strictly in ${targetLangName}. Use short, simple, warm sentences with plain everyday words so elderly patients can easily read or listen to them aloud.`,
      `6. Format medication times, BP (mmHg), and glucose (mg/dL) clearly without overwhelming jargon.`,
      ``,
      `AUTHORIZED PATIENT CONTEXT (Scoped to ${authUser.isDemo ? 'Demo Sandbox Profile' : authUser.uid}):`,
      JSON.stringify(patientContext || {}, null, 2),
    ].join('\n');

    try {
      const ai = getGenAIClient();
      const conversationLines = (Array.isArray(history) ? history.slice(-6) : [])
        .map((h) => `${h.role === 'user' ? 'Patient/User' : 'MediMitra'}: ${h.text}`)
        .join('\n');

      const prompt = conversationLines
        ? `Previous messages:\n${conversationLines}\n\nCurrent question: ${message.trim()}`
        : message.trim();

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      const replyText = (response.text || '').trim();
      if (!replyText) {
        res.status(502).json({ error: 'The AI companion returned an empty response. Please try again.' });
        return;
      }

      res.json({
        reply: replyText,
        urgentAlert,
        language,
        scopedToUid: authUser.uid,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to contact Gemini API.';
      console.error('Gemini companion error:', errMsg);
      const isBusy = errMsg.includes('503') || errMsg.includes('UNAVAILABLE');
      res.status(isBusy ? 503 : 502).json({
        error: isBusy
          ? 'The AI companion is temporarily busy due to high demand. Please wait a moment and try again.'
          : `AI Companion unavailable: ${errMsg}.`,
      });
    }
  });

  app.post('/api/ai/prescription-extract', async (req, res) => {
    const authUser = await verifyRequestAuth(req);
    if (!authUser) {
      res.status(401).json({ error: 'Please sign in to extract prescriptions.' });
      return;
    }

    const { imageBase64, mimeType, ocrRawText = '', language = 'en' } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      ocrRawText?: string;
      language?: 'en' | 'kn' | 'hi';
    };

    if (!imageBase64 && !ocrRawText.trim()) {
      res.status(400).json({ error: 'Please upload a prescription image or provide OCR text.' });
      return;
    }

    const systemInstruction = [
      `You are a careful medical prescription transcription assistant for MediMitra.`,
      `STRICT ACCURACY & SAFETY RULES:`,
      `1. Extract ONLY medicine names, dosages, forms, frequencies, meal timings, and instructions that are clearly visible in the prescription image or OCR text.`,
      `2. NEVER guess, invent, or infer unclear handwriting or missing dosages. If a medicine name, dosage, or instruction is blurry or illegible, write "Unclear - Please verify" and set confidence to "unclear" with an explanation in unclearNote.`,
      `3. Do NOT recommend new medicines or modify prescribed dosages.`,
      `4. Output summaryNote and unclearWarnings in ${LANGUAGE_NAMES[language] || 'English'}.`,
    ].join('\n');

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    if (imageBase64 && mimeType) {
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }
    parts.push({
      text: `Extract structured prescription details. Tesseract OCR preliminary text (may contain OCR noise):\n${ocrRawText || '(No OCR text provided; inspect image directly)'}`,
    });

    try {
      const ai = getGenAIClient();
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              doctorName: { type: Type.STRING, description: 'Doctor name if visible, else empty or Unclear.' },
              clinicName: { type: Type.STRING, description: 'Clinic or hospital name if visible.' },
              prescriptionDate: { type: Type.STRING, description: 'Date on prescription if visible (YYYY-MM-DD or as written).' },
              medicines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    dosage: { type: Type.STRING },
                    form: { type: Type.STRING, description: 'tablet, capsule, syrup, injection, drops, or inhaler' },
                    frequency: { type: Type.STRING },
                    mealTiming: {
                      type: Type.STRING,
                      description: 'before_breakfast, after_breakfast, before_lunch, after_lunch, before_dinner, after_dinner, bedtime, or custom',
                    },
                    instructions: { type: Type.STRING },
                    confidence: { type: Type.STRING, description: 'high, medium, or unclear' },
                    unclearNote: { type: Type.STRING },
                  },
                },
              },
              unclearWarnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              summaryNote: { type: Type.STRING },
            },
          },
        },
      });

      const raw = (response.text || '{}').trim();
      const parsed = JSON.parse(raw);
      res.json({
        ...parsed,
        requiresHumanVerification: true,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to extract prescription.';
      console.error('Prescription extraction error:', errMsg);
      const isBusy = errMsg.includes('503') || errMsg.includes('UNAVAILABLE');
      res.status(isBusy ? 503 : 502).json({
        error: isBusy
          ? 'The prescription extraction service is temporarily busy. Please try again in a few seconds.'
          : `Prescription extraction failed: ${errMsg}.`,
      });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediMitra server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MediMitra server:', err);
  process.exit(1);
});
