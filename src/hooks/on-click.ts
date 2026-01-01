import { type RefObject, useEffect } from "react";

/**
 * Detects clicks outside the specified element and invokes the provided callback.
 * Useful for closing dropdowns, modals, or popovers when the user clicks elsewhere on the page.
 *
 * @template T The type of HTML element being monitored (e.g., HTMLDivElement).
 * @param ref A ref to the DOM element to monitor for outside clicks.
 * @param onClickOutside A callback function triggered when a click occurs outside the element.
 */
export function useOutsideClick<T extends HTMLElement>(
    ref: RefObject<T | null>,
    onClickOutside: () => void,
): void {
    useEffect(() => {
        // Handler function that checks if the click target is outside the referenced element
        const handler = (event: MouseEvent) => {
            if (!ref.current?.contains(event.target as Node)) {
                onClickOutside(); // Trigger the callback when the click is outside
            }
        };

        const mousedownEvent = "mousedown";
        // Register the event listener on mount
        document.addEventListener(mousedownEvent, handler);

        // Clean up the listener on unmount
        return () => document.removeEventListener(mousedownEvent, handler);
    }, [ref, onClickOutside]);
}
