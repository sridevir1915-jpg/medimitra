import { AppLanguage, MealTiming } from '../types/medimitra';

export interface TranslationBundle {
  brandName: string;
  tagline: string;
  nav: {
    dashboard: string;
    medicines: string;
    schedule: string;
    history: string;
    bpTracker: string;
    diabetesTracker: string;
    assistant: string;
    scanner: string;
    caregiver: string;
    reports: string;
    appointments: string;
    emergency: string;
    settings: string;
    signOut: string;
  };
  common: {
    taken: string;
    snooze: string;
    missed: string;
    pending: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    add: string;
    back: string;
    next: string;
    finish: string;
    readAloud: string;
    stopAudio: string;
    demoModeBanner: string;
    exitDemo: string;
    switchDemoRole: string;
    medicalDisclaimer: string;
    sosButton: string;
  };
  greeting: {
    morning: string;
    afternoon: string;
    evening: string;
  };
  dashboard: {
    todaySchedule: string;
    upcomingReminders: string;
    adherenceToday: string;
    takenCount: string;
    pendingCount: string;
    bpQuickEntry: string;
    glucoseQuickEntry: string;
    upcomingAppointments: string;
    lowStockAlerts: string;
    testAlarm: string;
    healthSummary: string;
  };
  alarm: {
    title: string;
    spokenPrefix: string;
    instructionsLabel: string;
    missedSafetyNote: string;
    browserLimitation: string;
  };
  meals: Record<MealTiming, string>;
  onboarding: {
    title: string;
    subtitle: string;
    step1Title: string;
    step2Title: string;
    step3Title: string;
    step4Title: string;
    step1Desc: string;
    step2Desc: string;
    step3Desc: string;
    step4Desc: string;
  };
}

export const TRANSLATIONS: Record<AppLanguage, TranslationBundle> = {
  en: {
    brandName: 'MediMitra',
    tagline: 'Never miss a dose. Never feel alone in your healthcare journey.',
    nav: {
      dashboard: 'Dashboard',
      medicines: 'Medicines',
      schedule: 'Schedule & Alarms',
      history: 'History',
      bpTracker: 'BP Tracker',
      diabetesTracker: 'Diabetes Tracker',
      assistant: 'AI Companion',
      scanner: 'Scan Prescription',
      caregiver: 'Family Caregiver',
      reports: 'Health Reports',
      appointments: 'Appointments',
      emergency: 'Emergency SOS',
      settings: 'Settings',
      signOut: 'Sign Out',
    },
    common: {
      taken: 'Mark Taken',
      snooze: 'Snooze',
      missed: 'Missed',
      pending: 'Pending',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      add: 'Add',
      back: 'Back',
      next: 'Next Step',
      finish: 'Complete Setup',
      readAloud: 'Read Aloud',
      stopAudio: 'Stop Reading',
      demoModeBanner: 'Demo Sandbox Mode — Fictional sample records for exploration only',
      exitDemo: 'Exit Demo',
      switchDemoRole: 'Switch Role',
      medicalDisclaimer:
        'MediMitra helps track medicines and vitals. It is not a doctor and does not diagnose, prescribe, or replace medical care.',
      sosButton: 'Emergency SOS',
    },
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    dashboard: {
      todaySchedule: "Today's Medicine Schedule",
      upcomingReminders: 'Upcoming Reminders',
      adherenceToday: 'Daily Adherence',
      takenCount: 'Taken Today',
      pendingCount: 'Pending Today',
      bpQuickEntry: 'Quick BP Entry',
      glucoseQuickEntry: 'Quick Glucose Entry',
      upcomingAppointments: 'Upcoming Appointments',
      lowStockAlerts: 'Low Stock Alerts',
      testAlarm: 'Test Reminder Alarm',
      healthSummary: 'Health Summary',
    },
    alarm: {
      title: 'Time for Your Medicine',
      spokenPrefix: 'Hello! It is time for your prescribed medicine:',
      instructionsLabel: 'Instructions',
      missedSafetyNote:
        'Important safety rule: Do NOT automatically take a double or extra dose to make up for a missed pill. Contact your doctor or check your prescription instructions.',
      browserLimitation:
        'Note: Web browsers cannot ring alarms if the tab or browser is completely closed. For reliable closed-app alarms, use our native Android companion architecture.',
    },
    meals: {
      before_breakfast: 'Before Breakfast',
      after_breakfast: 'After Breakfast',
      before_lunch: 'Before Lunch',
      after_lunch: 'After Lunch',
      before_dinner: 'Before Dinner',
      after_dinner: 'After Dinner',
      bedtime: 'At Bedtime',
      custom: 'Custom Time',
    },
    onboarding: {
      title: 'Welcome to MediMitra',
      subtitle: 'Let us set up your care plan in 4 simple steps.',
      step1Title: 'Your Profile',
      step2Title: 'Your Medicines',
      step3Title: 'Reminder Times',
      step4Title: 'Family Caregiver',
      step1Desc: 'Tell us your name, age, and preferred language so everything feels comfortable.',
      step2Desc: 'Add your first medicines or pick common ones to get started quickly.',
      step3Desc: 'Choose when you prefer reminders and whether MediMitra should speak aloud.',
      step4Desc: 'Invite a trusted family member so they can stay informed if a dose is missed.',
    },
  },
  kn: {
    brandName: 'ಮೆಡಿಮಿತ್ರ',
    tagline: 'ಒಂದು ಮಾತ್ರೆಯನ್ನೂ ಮರೆಯಬೇಡಿ. ನಿಮ್ಮ ಆರೋಗ್ಯ ಪಯಣದಲ್ಲಿ ನೀವು ಒಬ್ಬಂಟಿಯಲ್ಲ.',
    nav: {
      dashboard: 'ಮುಖಪುಟ',
      medicines: 'ಔಷಧಿಗಳು',
      schedule: 'ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ಅಲಾರಾಂ',
      history: 'ಔಷಧಿ ಇತಿಹಾಸ',
      bpTracker: 'ಬಿಪಿ ಟ್ರ್ಯಾಕರ್',
      diabetesTracker: 'ಸಕ್ಕರೆ ಕಾಯಿಲೆ ಟ್ರ್ಯಾಕರ್',
      assistant: 'ಎಐ ಆರೋಗ್ಯ ಸಹಾಯಕ',
      scanner: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಸ್ಕ್ಯಾನ್',
      caregiver: 'ಕುಟುಂಬದ ಆರೈಕೆದಾರರು',
      reports: 'ಆರೋಗ್ಯ ವರದಿಗಳು',
      appointments: 'ವೈದ್ಯರ ಭೇಟಿಗಳು',
      emergency: 'ತುರ್ತು SOS',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      signOut: 'ಸೈನ್ ಔಟ್',
    },
    common: {
      taken: 'ತೆಗೆದುಕೊಂಡಿದ್ದೇನೆ',
      snooze: 'ಸ್ವಲ್ಪ ಸಮಯ ಮುಂದೂಡಿ',
      missed: 'ತಪ್ಪಿಹೋಗಿದೆ',
      pending: 'ಬಾಕಿ ಇದೆ',
      save: 'ಉಳಿಸಿ',
      cancel: 'ರದ್ದುಮಾಡಿ',
      edit: 'ತಿದ್ದುಪಡಿ',
      delete: 'ಅಳಿಸಿ',
      add: 'ಸೇರಿಸಿ',
      back: 'ಹಿಂದಕ್ಕೆ',
      next: 'ಮುಂದಿನ ಹಂತ',
      finish: 'ಸೆಟಪ್ ಪೂರ್ಣಗೊಳಿಸಿ',
      readAloud: 'ಗಟ್ಟಿಯಾಗಿ ಓದಿ',
      stopAudio: 'ಓದುವುದನ್ನು ನಿಲ್ಲಿಸಿ',
      demoModeBanner: 'ಡೆಮೊ ಮೋಡ್ — ಪರಿಶೀಲನೆಗಾಗಿ ಮಾದರಿ ದಾಖಲೆಗಳು ಮಾತ್ರ',
      exitDemo: 'ಡೆಮೊದಿಂದ ಹೊರಬನ್ನಿ',
      switchDemoRole: 'ಪಾತ್ರ ಬದಲಾಯಿಸಿ',
      medicalDisclaimer:
        'ಮೆಡಿಮಿತ್ರ ಔಷಧಿ ಮತ್ತು ಆರೋಗ್ಯ ದಾಖಲೆಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಇದು ವೈದ್ಯರಲ್ಲ ಮತ್ತು ರೋಗನಿರ್ಣಯ ಮಾಡುವುದಿಲ್ಲ.',
      sosButton: 'ತುರ್ತು ಸಹಾಯ SOS',
    },
    greeting: {
      morning: 'ಶುಭೋದಯ',
      afternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
      evening: 'ಶುಭ ಸಂಜೆ',
    },
    dashboard: {
      todaySchedule: 'ಇಂದಿನ ಔಷಧಿ ವೇಳಾಪಟ್ಟಿ',
      upcomingReminders: 'ಮುಂಬರುವ ಜ್ಞಾಪನೆಗಳು',
      adherenceToday: 'ಇಂದಿನ ನಿಯಮಿತತೆ',
      takenCount: 'ಇಂದು ತೆಗೆದುಕೊಂಡಿದ್ದು',
      pendingCount: 'ಇಂದು ಬಾಕಿ ಇರುವುದು',
      bpQuickEntry: 'ತ್ವರಿತ ಬಿಪಿ ದಾಖಲೆ',
      glucoseQuickEntry: 'ತ್ವರಿತ ಸಕ್ಕರೆ ಮಟ್ಟ ದಾಖಲೆ',
      upcomingAppointments: 'ಮುಂಬರುವ ವೈದ್ಯರ ಭೇಟಿಗಳು',
      lowStockAlerts: 'ಕಡಿಮೆ ಔಷಧಿ ಸ್ಟಾಕ್ ಎಚ್ಚರಿಕೆ',
      testAlarm: 'ಜ್ಞಾಪನೆ ಅಲಾರಾಂ ಪರೀಕ್ಷಿಸಿ',
      healthSummary: 'ಆರೋಗ್ಯ ಸಾರಾಂಶ',
    },
    alarm: {
      title: 'ನಿಮ್ಮ ಔಷಧಿಯ ಸಮಯವಾಗಿದೆ',
      spokenPrefix: 'ನಮಸ್ಕಾರ! ನಿಮ್ಮ ನಿಗದಿತ ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಳ್ಳುವ ಸಮಯವಾಗಿದೆ:',
      instructionsLabel: 'ಸೂಚನೆಗಳು',
      missedSafetyNote:
        'ಮುಖ್ಯ ಸುರಕ್ಷತಾ ಸೂಚನೆ: ತಪ್ಪಿಹೋದ ಮಾತ್ರೆಗಾಗಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಎರಡು ಮಾತ್ರೆಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
      browserLimitation:
        'ಸೂಚನೆ: ಬ್ರೌಸರ್ ಸಂಪೂರ್ಣವಾಗಿ ಮುಚ್ಚಿದ್ದರೆ ವೆಬ್ ಅಲಾರಾಂಗಳು ಕೆಲಸ ಮಾಡದಿರಬಹುದು.',
    },
    meals: {
      before_breakfast: 'ತಿಂಡಿಗೆ ಮುನ್ನ',
      after_breakfast: 'ತಿಂಡಿಯ ನಂತರ',
      before_lunch: 'ಮಧ್ಯಾಹ್ನದ ಊಟಕ್ಕೆ ಮುನ್ನ',
      after_lunch: 'ಮಧ್ಯಾಹ್ನದ ಊಟದ ನಂತರ',
      before_dinner: 'ರಾತ್ರಿ ಊಟಕ್ಕೆ ಮುನ್ನ',
      after_dinner: 'ರಾತ್ರಿ ಊಟದ ನಂತರ',
      bedtime: 'ಮಲಗುವ ಮುನ್ನ',
      custom: 'ಕಸ್ಟಮ್ ಸಮಯ',
    },
    onboarding: {
      title: 'ಮೆಡಿಮಿತ್ರಕ್ಕೆ ಸ್ವಾಗತ',
      subtitle: '4 ಸರಳ ಹಂತಗಳಲ್ಲಿ ನಿಮ್ಮ ಆರೋಗ್ಯ ಯೋಜನೆಯನ್ನು ಸಿದ್ಧಪಡಿಸೋಣ.',
      step1Title: 'ನಿಮ್ಮ ವಿವರಗಳು',
      step2Title: 'ನಿಮ್ಮ ಔಷಧಿಗಳು',
      step3Title: 'ಜ್ಞಾಪನೆ ಸಮಯಗಳು',
      step4Title: 'ಕುಟುಂಬದ ಆರೈಕೆದಾರರು',
      step1Desc: 'ನಿಮ್ಮ ಹೆಸರು, ವಯಸ್ಸು ಮತ್ತು ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ತಿಳಿಸಿ.',
      step2Desc: 'ನಿಮ್ಮ ಮೊದಲ ಔಷಧಿಗಳನ್ನು ಸೇರಿಸಿ.',
      step3Desc: 'ಜ್ಞಾಪನೆ ಸಮಯ ಮತ್ತು ಧ್ವನಿ ಓದುವಿಕೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
      step4Desc: 'ಕುಟುಂಬದ ಸದಸ್ಯರನ್ನು ಆಹ್ವಾನಿಸಿ.',
    },
  },
  hi: {
    brandName: 'मेडिमित्र',
    tagline: 'कभी कोई खुराक न चूकें। अपनी सेहत के सफर में कभी अकेला महसूस न करें।',
    nav: {
      dashboard: 'डैशबोर्ड',
      medicines: 'दवाइयाँ',
      schedule: 'समय और अलार्म',
      history: 'दवा इतिहास',
      bpTracker: 'बीपी ट्रैकर',
      diabetesTracker: 'शुगर ट्रैकर',
      assistant: 'AI स्वास्थ्य साथी',
      scanner: 'पर्चा स्कैन करें',
      caregiver: 'परिवार देखभालकर्ता',
      reports: 'स्वास्थ्य रिपोर्ट',
      appointments: 'डॉक्टर अपॉइंटमेंट',
      emergency: 'आपातकालीन SOS',
      settings: 'सेटिंग्स',
      signOut: 'साइन आउट',
    },
    common: {
      taken: 'दवा ले ली',
      snooze: 'थोड़ी देर बाद याद दिलाएं',
      missed: 'छूट गई',
      pending: 'बाकी है',
      save: 'सहेजें',
      cancel: 'रद्द करें',
      edit: 'संपादित करें',
      delete: 'हटाएं',
      add: 'जोड़ें',
      back: 'पीछे',
      next: 'अगला कदम',
      finish: 'सेटअप पूरा करें',
      readAloud: 'पढ़कर सुनाएं',
      stopAudio: 'पढ़ना बंद करें',
      demoModeBanner: 'डेमो सैंडबॉक्स मोड — केवल देखने के लिए नमूना रिकॉर्ड',
      exitDemo: 'डेमो से बाहर निकलें',
      switchDemoRole: 'भूमिका बदलें',
      medicalDisclaimer:
        'मेडिमित्र दवाओं और स्वास्थ्य रीडिंग को ट्रैक करने में मदद करता है। यह डॉक्टर नहीं है और न ही बीमारी की जांच या इलाज करता है।',
      sosButton: 'आपातकालीन SOS',
    },
    greeting: {
      morning: 'सुप्रभात',
      afternoon: 'नमस्कार',
      evening: 'शुभ संध्या',
    },
    dashboard: {
      todaySchedule: 'आज की दवाइयों का समय',
      upcomingReminders: 'आने वाले रिमाइंडर',
      adherenceToday: 'आज का पालन प्रतिशत',
      takenCount: 'आज ली गई दवाइयाँ',
      pendingCount: 'आज बाकी दवाइयाँ',
      bpQuickEntry: 'त्वरित बीपी दर्ज करें',
      glucoseQuickEntry: 'त्वरित शुगर दर्ज करें',
      upcomingAppointments: 'आने वाले डॉक्टर अपॉइंटमेंट',
      lowStockAlerts: 'कम स्टॉक चेतावनी',
      testAlarm: 'रिमाइंडर अलार्म टेस्ट करें',
      healthSummary: 'स्वास्थ्य सारांश',
    },
    alarm: {
      title: 'आपकी दवा का समय हो गया है',
      spokenPrefix: 'नमस्ते! आपकी निर्धारित दवा लेने का समय हो गया है:',
      instructionsLabel: 'निर्देश',
      missedSafetyNote:
        'महत्वपूर्ण सुरक्षा नियम: छूटी हुई खुराक की भरपाई के लिए अपने आप दोगुनी दवा न लें। कृपया अपने डॉक्टर से सलाह लें।',
      browserLimitation:
        'ध्यान दें: ब्राउज़र पूरी तरह बंद होने पर वेब अलार्म नहीं बज सकते। विश्वसनीय बैकग्राउंड अलार्म के लिए नेटिव एंड्रॉइड ऐप आर्किटेक्चर उपयोग करें।',
    },
    meals: {
      before_breakfast: 'नाश्ते से पहले',
      after_breakfast: 'नाश्ते के बाद',
      before_lunch: 'दोपहर के भोजन से पहले',
      after_lunch: 'दोपहर के भोजन के बाद',
      before_dinner: 'रात के खाने से पहले',
      after_dinner: 'रात के खाने के बाद',
      bedtime: 'सोने से पहले',
      custom: 'कस्टम समय',
    },
    onboarding: {
      title: 'मेडिमित्र में आपका स्वागत है',
      subtitle: 'आइए 4 आसान चरणों में आपकी देखभाल योजना सेट करें।',
      step1Title: 'आपकी प्रोफ़ाइल',
      step2Title: 'आपकी दवाइयाँ',
      step3Title: 'रिमाइंडर का समय',
      step4Title: 'परिवार देखभालकर्ता',
      step1Desc: 'अपना नाम, उम्र और पसंदीदा भाषा चुनें।',
      step2Desc: 'अपनी शुरुआती दवाइयाँ जोड़ें।',
      step3Desc: 'रिमाइंडर समय और आवाज़ में पढ़ना सेट करें।',
      step4Desc: 'अपने परिवार के किसी सदस्य को आमंत्रित करें।',
    },
  },
};

export function getTimeOfDayGreeting(lang: AppLanguage): string {
  const hour = new Date().getHours();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  if (hour < 12) return t.greeting.morning;
  if (hour < 17) return t.greeting.afternoon;
  return t.greeting.evening;
}
