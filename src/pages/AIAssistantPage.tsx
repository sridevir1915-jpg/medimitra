import React, { useMemo, useRef, useState } from 'react';
import { Bot, Mic, MicOff, Send, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLocalDateString } from '../lib/dateUtils';
import {
  isSpeechRecognitionSupported,
  speakText,
  startVoiceRecognition,
  stopSpeaking,
} from '../lib/speechAndAudio';
import { AppLanguage } from '../types/medimitra';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  urgentAlert?: boolean;
}

const QUICK_QUESTIONS: Record<AppLanguage, string[]> = {
  en: [
    'What medicines should I take today?',
    'Have I missed any medicines?',
    'What is my next reminder?',
    'Show my BP history',
    'Show my glucose readings',
    'When is my next doctor appointment?',
  ],
  kn: [
    'ಇಂದು ನಾನು ಯಾವ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಬೇಕು?',
    'ನಾನು ಯಾವುದೇ ಔಷಧಿಯನ್ನು ತಪ್ಪಿಸಿದ್ದೇನೆಯೇ?',
    'ನನ್ನ ಮುಂದಿನ ಜ್ಞಾಪನೆ ಯಾವಾಗ?',
    'ನನ್ನ ಬಿಪಿ ಇತಿಹಾಸವನ್ನು ತೋರಿಸಿ',
    'ನನ್ನ ಸಕ್ಕರೆ ಮಟ್ಟದ ವರದಿ ತೋರಿಸಿ',
    'ನನ್ನ ಮುಂದಿನ ವೈದ್ಯರ ಭೇಟಿ ಯಾವಾಗ?',
  ],
  hi: [
    'आज मुझे कौन-सी दवाइयाँ लेनी हैं?',
    'क्या मेरी कोई दवाई छूट गई है?',
    'मेरा अगला रिमाइंडर कब है?',
    'मेरा बीपी इतिहास दिखाएं',
    'मेरी शुगर रीडिंग दिखाएं',
    'मेरा अगला डॉक्टर अपॉइंटमेंट कब है?',
  ],
};

export const AIAssistantPage: React.FC = () => {
  const {
    patientProfile,
    medicines,
    schedules,
    logs,
    readings,
    appointments,
    language,
    setLanguage,
    getAuthTokenHeader,
    navigate,
  } = useApp();

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        language === 'kn'
          ? 'ನಮಸ್ಕಾರ! ನಾನು ಮೆಡಿಮಿತ್ರ AI ಆರೋಗ್ಯ ಸಹಾಯಕ. ನಾನು ವೈದ್ಯನಲ್ಲ, ಆದರೆ ನಿಮ್ಮ ಇಂದಿನ ಔಷಧಿಗಳು, ಬಿಪಿ, ಸಕ್ಕರೆ ಮಟ್ಟ ಮತ್ತು ವೈದ್ಯರ ಭೇಟಿಗಳ ಬಗ್ಗೆ ಸರಳವಾಗಿ ಮಾಹಿತಿ ನೀಡಬಲ್ಲೆ.'
          : language === 'hi'
            ? 'नमस्ते! मैं मेडिमित्र AI स्वास्थ्य साथी हूँ। मैं डॉक्टर नहीं हूँ, लेकिन मैं आपकी आज की दवाइयों, बीपी, शुगर और डॉक्टर अपॉइंटमेंट के बारे में सरल जानकारी दे सकता हूँ।'
            : 'Hello! I am your MediMitra AI Health Companion. I am not a doctor and cannot diagnose or prescribe, but I can gently answer questions about your saved medicines, reminders, BP, glucose, and appointments.',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const stopRecRef = useRef<(() => void) | null>(null);

  const authorizedContext = useMemo(() => {
    const bpList = readings
      .filter((r) => r.type === 'bp')
      .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
      .slice(0, 7);
    const glList = readings
      .filter((r) => r.type === 'glucose')
      .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
      .slice(0, 7);

    return {
      currentTimeLocal: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      todayDate: getLocalDateString(),
      patient: {
        name: patientProfile?.fullName || 'Patient',
        age: patientProfile?.age,
        conditions: patientProfile?.conditions || [],
      },
      medicines: medicines.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        mealTimings: m.mealTimings,
        instructions: m.instructions,
        stockQuantity: m.stockQuantity,
        refillThreshold: m.refillThreshold,
      })),
      schedules: schedules.map((s) => ({
        medicineName: s.medicineName,
        dosage: s.dosage,
        scheduledTime: s.scheduledTime,
        mealTiming: s.mealTiming,
        isActive: s.isActive,
      })),
      recentLogs: logs.slice(0, 15).map((l) => ({
        medicineName: l.medicineName,
        scheduledFor: l.scheduledFor,
        status: l.status,
        escalatedToCaregiver: l.escalatedToCaregiver,
      })),
      latestBp: bpList[0] || null,
      bpHistory: bpList.map((r) => ({
        measuredAt: r.measuredAt,
        systolic: r.systolic,
        diastolic: r.diastolic,
        pulse: r.pulse,
        flagLevel: r.flagLevel,
      })),
      latestGlucose: glList[0] || null,
      glucoseHistory: glList.map((r) => ({
        measuredAt: r.measuredAt,
        glucoseValue: r.glucoseValue,
        context: r.glucoseContext,
        flagLevel: r.flagLevel,
      })),
      upcomingAppointments: appointments
        .filter((a) => a.status === 'upcoming')
        .map((a) => ({
          doctorName: a.doctorName,
          specialty: a.specialty,
          clinicName: a.clinicName,
          date: a.appointmentDate,
          time: a.appointmentTime,
        })),
    };
  }, [patientProfile, medicines, schedules, logs, readings, appointments]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setVoiceError(null);
    const userMsg: ChatMsg = { id: `u_${Date.now()}`, role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const headers = await getAuthTokenHeader();
      const res = await fetch('/api/ai/companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          message: trimmed,
          language,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          patientContext: authorizedContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to reach AI Companion.');
      }

      const replyMsg: ChatMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        urgentAlert: Boolean(data.urgentAlert),
      };
      setMessages((prev) => [...prev, replyMsg]);
      if (autoSpeak) {
        speakText(data.reply, language);
      }
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Could not contact Gemini API.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    setVoiceError(null);
    if (listening) {
      stopRecRef.current?.();
      setListening(false);
      return;
    }
    setListening(true);
    stopRecRef.current = startVoiceRecognition(
      language,
      (transcript) => {
        setInput(transcript);
        sendMessage(transcript);
      },
      (errMsg) => setVoiceError(errMsg),
      () => setListening(false)
    );
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-teal-600" />
            <span>AI Health Companion</span>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            Ask by voice or text in English, ಕನ್ನಡ, or हिन्दी. Scoped strictly to your authorized records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
            {(['en', 'kn', 'hi'] as AppLanguage[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  language === l ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {l === 'en' ? 'EN' : l === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (autoSpeak) stopSpeaking();
              setAutoSpeak((v) => !v);
            }}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
              autoSpeak
                ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            Voice {autoSpeak ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Mandatory Medical Disclaimer Banner */}
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong>Not a Medical Professional:</strong> MediMitra AI explains your recorded schedule and general health terms in simple language. It never diagnoses conditions, prescribes medicines, or changes dosages. For urgent symptoms, seek qualified medical care immediately.
        </p>
      </div>

      {/* Suggested Senior Questions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_QUESTIONS[language].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendMessage(q)}
            disabled={loading}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Thread */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 min-h-[320px] max-h-[480px] overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-teal-600 text-white'
                  : m.urgentAlert
                    ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}
            >
              {m.urgentAlert && (
                <div className="mb-2 pb-2 border-b border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                    URGENT MEDICAL CARE GUIDANCE
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('emergency')}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Open Emergency SOS
                  </button>
                </div>
              )}
              {m.text}
            </div>
            {m.role === 'assistant' && (
              <button
                type="button"
                onClick={() => speakText(m.text, language)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline px-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Listen
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-sm text-slate-500 dark:text-slate-400 italic">
            MediMitra is reviewing your schedule and readings...
          </div>
        )}
      </div>

      {voiceError && (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{voiceError}</p>
      )}

      {/* Input & Voice Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex items-center gap-2.5"
      >
        {isSpeechRecognitionSupported() && (
          <button
            type="button"
            onClick={toggleMic}
            className={`min-h-[52px] min-w-[52px] rounded-2xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              listening
                ? 'bg-rose-600 text-white'
                : 'bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-100 border border-sky-200 dark:border-sky-800'
            }`}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          >
            {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
        )}

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            listening
              ? 'Listening... please speak clearly'
              : 'Ask about your medicines, missed doses, BP, glucose, or appointments...'
          }
          className="flex-1 min-h-[52px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base text-slate-900 dark:text-white"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="min-h-[52px] px-5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold inline-flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Send className="w-5 h-5" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
    </div>
  );
};
