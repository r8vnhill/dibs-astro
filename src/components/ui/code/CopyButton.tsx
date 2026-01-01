import { Check, Copy } from "phosphor-react";
import { useState } from "react";

type CopyButtonProps = {
    /**
     * The raw code string to be copied.
     */
    code: string;

    /**
     * Optional extra Tailwind classes for layout customization.
     */
    className?: string;

    /**
     * Accessible label and tooltip text for the button.
     */
    label?: string;
};

/**
 * A reusable React component for copying code to the clipboard.
 * Displays visual feedback and supports dark/light themes via Tailwind CSS.
 */
export function CopyButton({
    code,
    className = "",
    label = "Copy code",
}: CopyButtonProps) {
    // Track whether the code has been successfully copied.
    const [copied, setCopied] = useState(false);

    /**
     * Handles the copy button click event.
     * Copies the trimmed code string to the clipboard and shows temporary feedback.
     */
    const handleClick = async () => {
        if (copied || !code) return; // Prevent re-triggering if already copied

        try {
            await navigator.clipboard.writeText(code.trim());
            setCopied(true);

            // Reset the feedback message after 1.5 seconds
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            console.error("Copy failed:", e);
            setCopied(false);
        }
    };

    /**
     * Shared Tailwind classes for layout and styling.
     * Applies dark mode support, keyboard focus rings, and hover transitions.
     */
    const buttonClasses = `
    absolute top-2 right-2
    inline-flex items-center gap-1
    rounded px-2 py-1 text-xs font-medium
    border shadow-sm backdrop-blur-sm
    bg-white/90 dark:bg-gray-900/90
    hover:brightness-95 focus:outline-none focus-visible:ring-2
    transition
  `;

    return (
        <button
            onClick={handleClick}
            type="button"
            aria-label={label}
            title={label}
            className={`${buttonClasses} ${className}`}
        >
            {/* Display check icon and feedback message when copied */}
            {copied
                ? <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Copy"}</span>

            {/* Screen-reader feedback for accessibility */}
            <span className="sr-only" aria-live="polite">
                {copied ? "Code copied to clipboard" : ""}
            </span>
        </button>
    );
}

export default CopyButton;
