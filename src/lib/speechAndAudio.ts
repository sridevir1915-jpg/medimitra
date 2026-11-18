import { AppLanguage } from '../types/medimitra';

const SPEECH_LANG_MAP: Record<AppLanguage, string> = {
  en: 'en-IN',
  kn: 'kn-IN',
  hi: 'hi-IN',
};

export function playGentleReminderChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 gentle triad
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.22);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + idx * 0.22 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.22 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.22);
      osc.stop(ctx.currentTime + idx * 0.22 + 0.6);
    });
  } catch {
    // Audio playback may be restricted prior to user gesture
  }
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(text: string, language: AppLanguage = 'en'): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = SPEECH_LANG_MAP[language] || 'en-IN';
    utterance.lang = targetLang;
    utterance.rate = 0.92; // Slightly slower, clearer pace for elderly listeners
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const matched = voices.find((v) => v.lang.toLowerCase().startsWith(targetLang.split('-')[0]));
    if (matched) {
      utterance.voice = matched;
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore synthesis failures gracefully
  }
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function startVoiceRecognition(
  language: AppLanguage,
  onTranscript: (transcript: string) => void,
  onError: (msg: string) => void,
  onEnd: () => void
): () => void {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  const RecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!RecognitionCtor) {
    onError('Voice input is not supported in this browser. Please type your question.');
    onEnd();
    return () => {};
  }

  const recognition = new RecognitionCtor();
  recognition.lang = SPEECH_LANG_MAP[language] || 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    if (transcript.trim()) {
      onTranscript(transcript.trim());
    }
  };

  recognition.onerror = (event) => {
    onError(event.error === 'not-allowed' ? 'Microphone permission was denied.' : `Voice input error: ${event.error}`);
  };

  recognition.onend = () => {
    onEnd();
  };

  try {
    recognition.start();
  } catch {
    onError('Unable to start microphone listening.');
    onEnd();
  }

  return () => {
    try {
      recognition.stop();
    } catch {
      // Ignore stop error
    }
  };
}
