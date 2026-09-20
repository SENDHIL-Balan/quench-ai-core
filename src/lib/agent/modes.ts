<<<<<<< HEAD
export type ModeId = "chat" | "research" | "create" | "analyze" | "code" | "image";
=======
export type ModeId = "chat" | "research" | "create" | "analyze" | "code" | "image" | "more";
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39

export interface AgentMode {
  id: ModeId;
  label: string;
  /** Shown in the composer placeholder / hero context */
  hint: string;
<<<<<<< HEAD
  /** Extra instruction layered on top of the base Bravura AI identity */
=======
  /** Extra instruction layered on top of the base Quench AI identity */
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
  instruction: string;
  /** Modes without an LLM backend yet (e.g. image generation) */
  available: boolean;
}

<<<<<<< HEAD
const BASE_IDENTITY = `You are Bravura AI, the assistant inside the Bravura AI application.
Your identity is Bravura AI. When asked who you are, introduce yourself as Bravura AI.
If asked who founded Bravura AI or who the founder is, answer that the founder is Sendhil Balan.
Never claim to be ChatGPT, GPT-4, OpenAI, Gemini, Groq, or any other model/provider.
Do not describe another product or provider as the assistant the user is interacting with.
Tagline: "Curiosity, fully satisfied."
Answer clearly and directly. Default to a concise answer; expand only when the user asks or the task genuinely needs depth. Use Markdown where it improves readability.
Think through the task only as much as it requires. If you are unsure, say so instead of inventing facts.
=======
const BASE_IDENTITY = `You are Quench AI, an intelligent, precise and genuinely helpful assistant.
Tagline: "Curiosity, fully satisfied."
Answer clearly and directly. Use Markdown: headings, short paragraphs, lists, tables and fenced code blocks with a language tag.
Reason carefully before answering. If you are unsure, say so instead of inventing facts.
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
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
<<<<<<< HEAD
      "Mode: RESEARCH. Answer like a rigorous researcher: structure the answer, separate established facts from interpretation, note uncertainty and competing views, and end with key takeaways.",
=======
      "Mode: RESEARCH. Answer like a rigorous researcher: structure the answer, separate established facts from interpretation, note uncertainty and competing views, and end with key takeaways. You have no live web access — say so when a question needs up-to-date data.",
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
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
<<<<<<< HEAD
};

export const VISIBLE_MODES: ModeId[] = ["chat", "research", "create", "analyze", "code", "image"];

export interface BuildSystemPromptOptions {
  mode: ModeId;
  deepThink?: boolean;
  webSearch?: boolean;
}

export function buildSystemPrompt(
  modeOrOptions: ModeId | BuildSystemPromptOptions,
  deepThink = false,
): string {
  const options: BuildSystemPromptOptions =
    typeof modeOrOptions === "string"
      ? { mode: modeOrOptions, deepThink }
      : modeOrOptions;

  const m = AGENT_MODES[options.mode] ?? AGENT_MODES.chat;

  const deepThinkInstruction = options.deepThink
    ? "\n\nDeep Think is enabled. Analyze the problem carefully before answering, check assumptions and edge cases, and provide a more thorough, well-structured answer. Do not reveal private chain-of-thought or hidden reasoning; provide only a concise summary of the key reasoning that supports your answer."
    : "";

  // When web search is OFF, tell the model honestly that it has no live web access.
  // When ON, the search-results block appended later carries the live data, so we
  // do not include the "no web access" line.
  const webSearchInstruction = options.webSearch
    ? ""
    : "\n\nYou have no live web access. If a question needs up-to-date information, say so plainly instead of inventing current facts.";

  return `${BASE_IDENTITY}\n\n${m.instruction}${deepThinkInstruction}${webSearchInstruction}`;
}
=======
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
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
