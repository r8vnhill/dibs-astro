/**
 * ReadingTime.tsx (Preact Island)
 * -------------------------------
 * Shows an estimated reading time for a content container.
 *
 * - Ignores collapsed <details> and elements with .exclude-from-reading-time
 * - Uses Tailwind for layout; no CSS module dependency.
 * - Can be dropped anywhere via the Astro wrapper.
 */
import type { FunctionalComponent } from "preact";
import { useReadingTime } from "./useReadingTime";
import { Clock } from "lucide-preact";

export interface ReadingTimeProps {
  /** Multiplier to scale minutes (e.g., 1.5 for denser content). Default 1.5. */
  multiplier?: number;
  /** Container selector to analyze. Default 'main'. */
  containerSelector?: string;
  /** Optional words-per-minute override (default: 250). */
  wpm?: number;
  /** Class for the outer wrapper. */
  className?: string;
  /** Accessible live region politeness. */
  ariaLive?: "off" | "polite" | "assertive";
  /** Optional custom icon element. If omitted, a Lucide Clock is used. */
  icon?: preact.ComponentChildren;
  /** Label shown before the minutes. */
  label?: string;
}

export const ReadingTime: FunctionalComponent<ReadingTimeProps> = ({
  multiplier = 1.5,
  containerSelector = "main",
  wpm,
  className = "",
  ariaLive = "polite",
  icon = <Clock size={20} aria-hidden />,
  label = "Dedicación recomendada",
}) => {
  const minutes = useReadingTime(multiplier, containerSelector, undefined, wpm);
  if (minutes == null) return null;

  return (
    <div
      class={`not-prose rounded-md ring-1 ring-inset ring-white/10 bg-blue-500/5 px-4 py-3 text-[var(--rt-fg,inherit)] shadow-sm ${className}`}
      aria-live={ariaLive}
    >
      <p class="mb-1 flex items-center gap-2 font-medium">
        <span class="text-primary">{icon}</span>
        {label}: {minutes} {minutes === 1 ? "minuto" : "minutos"}
      </p>
      <p class="m-0 text-sm opacity-80">
        Considera contenido visible y relevante; ignora texto colapsado u
        opcional.
      </p>
    </div>
  );
};

export default ReadingTime;
