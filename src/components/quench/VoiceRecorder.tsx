import { Volume2, VolumeX } from "lucide-react";

interface VoiceToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  speaking?: boolean;
  className?: string;
}

/** Mute/unmute control for auto-spoken assistant replies. */
export function VoiceToggle({ enabled, onToggle, speaking, className }: VoiceToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      aria-label={enabled ? "Mute voice replies" : "Unmute voice replies"}
      aria-pressed={enabled}
      className={`relative flex size-9 items-center justify-center rounded-full transition-colors ${
        enabled
          ? "bg-primary/15 text-primary hover:bg-primary/25"
          : "bg-accent/40 text-muted-foreground hover:bg-accent/60"
      } ${className ?? ""}`}
    >
      {enabled && speaking && (
        <span className="bg-primary/30 absolute inset-0 animate-ping rounded-full" />
      )}
      {enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}
