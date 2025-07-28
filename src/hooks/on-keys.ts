import { useEffect } from "preact/hooks";

/**
 * Calls a callback function when the Escape key is pressed, if the `active` flag is true.
 * Useful for closing modals, dialogs, dropdowns, or any other dismissible component.
 *
 * @param active Whether the hook is active and should listen for Escape key events.
 * @param onEscape Callback to be invoked when Escape is pressed.
 */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    // Don't attach the listener if not active
    if (!active) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
      }
    };

    const keyDownEvent = "keydown";

    window.addEventListener(keyDownEvent, handler);

    // Clean up the event listener on unmount or when dependencies change
    return () => {
      window.removeEventListener(keyDownEvent, handler);
    };
  }, [active, onEscape]); // React to changes in `active` or `onEscape`
}
