export type VoiceProvider = "sarvam" | "deepgram" | "elevenlabs" | "auto";

export type VoiceSetting = {
  voiceId: string;
  provider: VoiceProvider;
  autoSpeak: boolean;
  playbackSpeed?: number;
  handsFreeListen?: boolean;
};

export type SpeakRequestBody = {
  text: string;
  voice?: string;
  provider?: VoiceProvider;
  playbackSpeed?: number;
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
