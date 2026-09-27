export type VoiceProvider = "sarvam" | "deepgram" | "elevenlabs" | "auto";

export type VoiceLanguage = "auto" | "ta" | "ml" | "kn" | "hi" | "te" | "en";

export interface VoiceLanguageOption {
  code: VoiceLanguage;
  name: string;
  nativeName: string;
  badge: string;
  shortLabel: string;
  description: string;
}

export const VOICE_LANGUAGES: VoiceLanguageOption[] = [
  {
    code: "auto",
    name: "Auto Detect",
    nativeName: "தானியங்கி / Auto",
    badge: "Smart",
    shortLabel: "Auto",
    description:
      "Automatically detects Indian languages (Tamil, Malayalam, Kannada, Hindi, Telugu) or English",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    badge: "இயற்கையான தமிழ்",
    shortLabel: "தமிழ்",
    description: "Natural conversational spoken Tamil (இயற்கையான பேச்சுத் தமிழ் & Tanglish)",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    badge: "സ്വാഭാവിക മലയാളം",
    shortLabel: "മലയാളം",
    description: "Natural conversational Malayalam (സ്വാഭാവിക മലയാളം & Manglish)",
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    badge: "ನೈಸರ್ಗಿಕ ಕನ್ನಡ",
    shortLabel: "ಕನ್ನಡ",
    description: "Natural conversational Kannada (ನೈಸರ್ಗಿಕ ಕನ್ನಡ & Kanglish)",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिंदी",
    badge: "प्राकृतिक हिंदी",
    shortLabel: "हिंदी",
    description: "Natural conversational spoken Hindi (बोलचाल की हिंदी & Hinglish)",
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    badge: "సహజ తెలుగు",
    shortLabel: "తెలుగు",
    description: "Natural conversational Telugu (సహజ సంభాషణ తెలుగు)",
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    badge: "Global",
    shortLabel: "EN",
    description: "Natural conversational & articulate Indian and Global English",
  },
];

export type VoiceSetting = {
  voiceId: string;
  provider: VoiceProvider;
  autoSpeak: boolean;
  playbackSpeed?: number;
  handsFreeListen?: boolean;
  language?: VoiceLanguage;
};

export type SpeakRequestBody = {
  text: string;
  voice?: string;
  provider?: VoiceProvider;
  playbackSpeed?: number;
  language?: VoiceLanguage;
};

export type TranscribeResponse = { ok: true; text: string } | { ok: false; error: string };

export type VoiceState = "idle" | "recording" | "transcribing" | "speaking" | "error";

export type VoiceOption = {
  id: string;
  name: string;
  provider: "sarvam" | "deepgram" | "elevenlabs";
  description: string;
  gender: "male" | "female";
  recommended?: boolean;
};
