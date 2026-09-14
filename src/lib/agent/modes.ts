export type ModeId = "chat" | "research" | "create" | "analyze" | "code" | "image" | "more";

export interface AgentMode {
  id: ModeId;
  label: string;
  /** Shown in the composer placeholder / hero context */
  hint: string;
  /** Extra instruction layered on top of the base Quench AI identity */
  instruction: string;
  /** Modes without an LLM backend yet (e.g. image generation) */
  available: boolean;
}

const BASE_IDENTITY = `You are Quench AI, an intelligent, precise and genuinely helpful assistant.
Tagline: "Curiosity, fully satisfied."
Answer clearly and directly. Use Markdown: headings, short paragraphs, lists, tables and fenced code blocks with a language tag.
Reason carefully before answering. If you are unsure, say so instead of inventing facts.
Keep the conversation context in mind so follow-up questions resolve against earlier turns.`;

export const AGENT_MODES: Record<ModeId, AgentMode> = {
  chat: {
    id: "chat",
    label: "Chat",
    hint: "General-purpose assistant",
    instruction: "Mode: CHAT. Be a general-purpose assistant: conversational, warm and concise.",
    available: true,
  },
  research: {
    id: "research",
    label: "Research",
    hint: "Deep, sourced explanations",
    instruction:
      "Mode: RESEARCH. Answer like a rigorous researcher: structure the answer, separate established facts from interpretation, note uncertainty and competing views, and end with key takeaways. You have no live web access — say so when a question needs up-to-date data.",
    available: true,
  },
  create: {
    id: "create",
    label: "Create",
    hint: "Creative generation",
    instruction:
      "Mode: CREATE. Be a creative collaborator: vivid, original writing and ideas. Offer a few distinct directions when useful, then develop the strongest one.",
    available: true,
  },
  analyze: {
    id: "analyze",
    label: "Analyze",
    hint: "Analytical reasoning",
    instruction:
      "Mode: ANALYZE. Break the input down methodically: assumptions, structure, patterns, risks, and a clear conclusion. Prefer tables and bullet structure. Show the reasoning steps that matter.",
    available: true,
  },
  code: {
    id: "code",
    label: "Code",
    hint: "Programming assistant",
    instruction:
      "Mode: CODE. Be a senior engineer. Give working, idiomatic code in fenced blocks with a language tag, explain the key decisions briefly, and call out edge cases, complexity and pitfalls.",
    available: true,
  },
  image: {
    id: "image",
    label: "Image",
    hint: "Image generation (coming soon)",
    instruction: "Mode: IMAGE.",
    available: false,
  },
  more: {
    id: "more",
    label: "More",
    hint: "More modes",
    instruction: "Mode: CHAT.",
    available: true,
  },
};

export const VISIBLE_MODES: ModeId[] = [
  "chat",
  "research",
  "create",
  "analyze",
  "code",
  "image",
  "more",
];

export function buildSystemPrompt(mode: ModeId): string {
  const m = AGENT_MODES[mode] ?? AGENT_MODES.chat;
  return `${BASE_IDENTITY}\n\n${m.instruction}`;
}
