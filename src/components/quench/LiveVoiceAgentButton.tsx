import { cn } from "@/lib/utils";

export function LiveVoiceAgentButton({
  onClick,
  disabled,
  className,
  isActive = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  isActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Talk in live with Bravura Voice Agent"
      title="Bravura Live Voice Agent — Talk in live"
      className={cn(
        "group relative flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 cursor-pointer",
        "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25",
        "hover:scale-105 active:scale-95",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
        isActive && "ring-2 ring-cyan-300 ring-offset-2 ring-offset-background",
        className,
      )}
    >
      {/* 4 Animated Waveform Bars */}
      <div className="flex items-center justify-center gap-[2.5px] h-4">
        <span
          className="w-[2.5px] rounded-full bg-white transition-all duration-300"
          style={{
            height: "8px",
            animation: "bravura-wave 1.2s ease-in-out infinite 0.1s",
          }}
        />
        <span
          className="w-[2.5px] rounded-full bg-white transition-all duration-300"
          style={{
            height: "16px",
            animation: "bravura-wave 1.2s ease-in-out infinite 0.3s",
          }}
        />
        <span
          className="w-[2.5px] rounded-full bg-white transition-all duration-300"
          style={{
            height: "12px",
            animation: "bravura-wave 1.2s ease-in-out infinite 0.5s",
          }}
        />
        <span
          className="w-[2.5px] rounded-full bg-white transition-all duration-300"
          style={{
            height: "6px",
            animation: "bravura-wave 1.2s ease-in-out infinite 0.2s",
          }}
        />
      </div>

      {/* Subtle outer glow ring on hover */}
      <span className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
