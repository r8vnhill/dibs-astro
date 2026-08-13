/**
 * ReadingTime.tsx (React Island)
 * -------------------------------
 * Shows an estimated reading time for a content container.
 *
 * - Ignores collapsed <details> and elements with .exclude-from-reading-time
 * - Uses Tailwind for layout; no CSS module dependency.
 * - Can be dropped anywhere via the Astro wrapper.
 */
import { clsx } from "clsx";
import { Clock } from "phosphor-react";
import type { FC, ReactNode } from "react";
import type { LocalizedString, Reading_Time_MinutesInputs } from "~/generated/i18n/messages";
import { useReadingTime } from "./useReadingTime";

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
    icon?: ReactNode;
    /** Localized label resolved by the Astro composition boundary. */
    label?: LocalizedString;
    /** Localized plural-aware minute label resolved by the Astro composition boundary. */
    minuteLabel?: (inputs: Reading_Time_MinutesInputs) => LocalizedString;
    /** Localized explanatory copy resolved by the Astro composition boundary. */
    helpText?: LocalizedString;
}

export const ReadingTime: FC<ReadingTimeProps> = ({
    multiplier = 1.5,
    containerSelector = "main",
    wpm,
    className = "",
    ariaLive = "polite",
    icon = <Clock className="w-5 h-5 text-primary" />,
    label,
    minuteLabel,
    helpText,
}) => {
    const minutes = useReadingTime(multiplier, containerSelector, undefined, wpm);
    if (minutes == null) return null;

    return (
        <div
            className={clsx(
                "not-prose",
                "rounded-md",
                "ring-1",
                "ring-inset",
                "ring-white/10",
                "bg-blue-500/5",
                "px-4",
                "py-3",
                "text-[var(--rt-fg,inherit)]",
                "shadow-sm",
                className,
            )}
            aria-live={ariaLive}
        >
            <p className="mb-1 flex items-center gap-2 font-medium">
                <span className="text-primary">{icon}</span>
                {label}: {minuteLabel?.({ count: minutes })}
            </p>
            <p className="m-0 text-sm opacity-80">
                {helpText}
            </p>
        </div>
    );
};

export default ReadingTime;
