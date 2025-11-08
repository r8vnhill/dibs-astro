import { type JSX, useEffect, useId, useMemo } from "react";
import { todoImages } from "~/data/todo-images";
import { pickRandom } from "~/utils";

/**
 * Props for the <ToDo /> component.
 */
export interface ToDoProps {
    /**
     * Optional debug metadata (e.g., title, tasks, etc.).
     * This is not rendered in the UI but can help with debugging.
     */
    metadata?: Record<string, unknown>;

    /**
     * Optional message to display below the image.
     * Defaults to a friendly placeholder note.
     */
    message?: string;

    /**
     * Alternative text for the image.
     * Defaults to "Meme".
     */
    altText?: string;

    /** Callback fired once on mount with the reporting payload. */
    onReport?: (payload: ToDoReportPayload) => void;

    /**
     * Custom DOM event name to dispatch on `window` with the reporting payload.
     * Defaults to `"dibs:placeholder"`. Set to `null`/`undefined` to disable event dispatch.
     */
    reportEventName?: string | null;
}

export type ToDoReportPayload = {
    message: string;
    imageSrc: string | null;
    metadata?: Record<string, unknown>;
    timestamp: string;
};

/**
 * <ToDo /> is a visual placeholder component indicating that content is under construction.
 *
 * It displays:
 * - A randomly selected image from a predefined set.
 * - A default or custom message.
 * - A warning in the developer console to flag this component as a temporary stub.
 *
 * This component is client-only and picks its random image synchronously so the first paint already
 * shows the meme (avoiding hydration-induced layout shifts). It also dispatches an optional
 * analytics/debug hook to help track remaining placeholders.
 */
export default function ToDo({
    metadata,
    message = "TODO: Estamos (estoy) trabajando para ustedes c:",
    altText = "Meme",
    onReport,
    reportEventName = "dibs:placeholder",
}: ToDoProps): JSX.Element {
    // Stable identifier for the figcaption association
    const messageId = useId();

    // Pick the image synchronously so the first paint already shows the meme (no layout shift)
    const imageSrc = useMemo(() => pickRandom(todoImages) ?? null, []);

    // Warn once content mounts so placeholder usage is easy to spot during dev, and notify hooks
    useEffect(() => {
        const payload: ToDoReportPayload = {
            message,
            imageSrc,
            ...(metadata ? { metadata } : {}),
            timestamp: new Date().toISOString(),
        };

        console.warn(
            "⚠️ [ToDo]: This component is a placeholder. Replace it with real content.",
            metadata,
        );

        onReport?.(payload);

        if (typeof window !== "undefined" && reportEventName) {
            window.dispatchEvent(new CustomEvent(reportEventName, { detail: payload }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderImage = () => {
        if (!imageSrc) {
            return (
                <div className="text-sm text-red-600">
                    ⚠️ Imagen no disponible
                </div>
            );
        }

        return (
            <img
                src={imageSrc}
                alt={altText}
                className="w-full max-w-xs rounded shadow"
            />
        );
    };

    return (
        <figure
            aria-describedby={messageId}
            className="flex flex-col items-center gap-4 rounded border border-dashed border-primary p-4"
        >
            {/* Random meme or fallback message */}
            {renderImage()}

            {/* Display the custom or default message */}
            <figcaption
                id={messageId}
                className="text-center text-sm italic"
            >
                {message}<br />Esta sección podría estar incompleta :0
            </figcaption>
        </figure>
    );
}
