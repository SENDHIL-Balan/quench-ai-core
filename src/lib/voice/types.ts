export type VoiceProvider = "elevenlabs" | "deepgram" | "auto";

export type SpeakRequestBody = {
  text: string;
  voice?: string;
  provider?: VoiceProvider;
};

export type TranscribeResponse = { ok: true; text: string } | { ok: false; error: string };

export type VoiceState = "idle" | "recording" | "transcribing" | "speaking" | "error";

export type VoiceOption = {
  id: string;
  name: string;
  provider: "elevenlabs" | "deepgram";
  description: string;
  gender: "male" | "female";
  recommended?: boolean;
};
