export type SpeakRequestBody = {
  text: string;
  voice?: string;
};

export type TranscribeResponse =
  | { ok: true; text: string }
  | { ok: false; error: string };

export type VoiceState = "idle" | "recording" | "transcribing" | "speaking" | "error";