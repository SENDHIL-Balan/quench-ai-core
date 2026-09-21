import { ArrowRight, ChevronRight, LayoutGrid, LineChart, Bot } from "lucide-react";
import { AgentOnlineCard, AgentRunCard, type AgentState } from "./AgentStatus";
import { VoiceAgentPanel } from "./VoiceAgentPanel";
import { SlangContextCard } from "./SlangContextCard";
import { QuenchOrb } from "./QuenchOrb";
import type { ModeId } from "@/lib/agent/modes";

const PROJECTS = [
  { name: "Bravura AI", sub: "AI Agent Platform", icon: LayoutGrid },
  { name: "Software Engineer Agent", sub: "Autonomous Development", icon: Bot },
  { name: "Data Intelligence", sub: "Analytics Workspace", icon: LineChart },
];

export function RightPanel({
  state,
  mode,
  errorMessage,
  onSendTranscript,
  onOpenVoiceSettings,
}: {
  state: AgentState;
  mode: ModeId;
  errorMessage?: string | null | undefined;
  onSendTranscript?: (text: string) => void;
  onOpenVoiceSettings?: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4 xl:w-[330px]">
      <AgentOnlineCard state={state} />
      <AgentRunCard state={state} mode={mode} errorMessage={errorMessage} />

      {/* Real-time Voice Agent Panel with visual waveform & Deepgram Nova-2 transcription */}
      <VoiceAgentPanel
        onSendTranscript={onSendTranscript}
        onOpenVoiceSettings={onOpenVoiceSettings}
      />

      {/* Slang Knowledge Base & Context Layer */}
      <SlangContextCard />

      <section className="glass-panel rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Projects</h2>
          <button className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs cursor-pointer">
            View all <ArrowRight className="size-3" />
          </button>
        </div>
        <ul className="space-y-2">
          {PROJECTS.map(({ name, sub, icon: Icon }) => (
            <li key={name}>
              <button className="border-border bg-card/50 hover:border-primary/30 flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors cursor-pointer">
                <span className="bg-primary/12 text-primary flex size-9 items-center justify-center rounded-xl">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{name}</span>
                  <span className="text-muted-foreground block truncate text-xs">{sub}</span>
                </span>
                <ChevronRight className="text-muted-foreground size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel glow-ring relative overflow-hidden rounded-3xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <QuenchOrb className="size-5" />
          <p className="text-xs font-semibold tracking-[0.18em]">
            BRAVURA <span className="text-gradient-brand">CORE</span>
          </p>
        </div>
        <h3 className="max-w-[70%] text-xl leading-snug font-semibold">Turn ideas into impact.</h3>
        <p className="text-gradient-brand mt-1 text-sm font-medium">With Bravura AI.</p>
        <p className="text-muted-foreground mt-5 text-[10px] tracking-[0.22em]">
          A SMARTER
          <br />
          TOMORROW
        </p>
        <QuenchOrb className="absolute right-4 bottom-10 size-24 opacity-70" />
        <button
          className="border-border bg-card/70 hover:border-primary/40 absolute right-4 bottom-4 flex size-9 items-center justify-center rounded-full border transition-colors cursor-pointer"
          aria-label="Explore Bravura Core"
        >
          <ArrowRight className="size-4" />
        </button>
      </section>
    </div>
  );
}
