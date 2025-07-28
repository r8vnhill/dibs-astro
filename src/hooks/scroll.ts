import { useEffect } from "preact/hooks";

/**
 * Locks or unlocks the `<body>` scroll based on a boolean flag.
 * This is commonly used to prevent background scrolling when a modal, drawer, or fullscreen overlay
 * is open.
 *
 * @param lock If `true`, disables scrolling on the body. If `false`, restores original scroll behavior.
 */
export function useLockBodyScroll(lock: boolean): void {
  useEffect(() => {
    // Store the original overflow style so it can be restored later
    const original = document.body.style.overflow;

    if (lock) {
      // Lock scroll by setting overflow to 'hidden'
      document.body.style.overflow = "hidden";
    } else {
      // Restore previous overflow value
      document.body.style.overflow = original;
    }

    // Ensure body scroll is restored when the component unmounts or lock changes
    return () => {
      document.body.style.overflow = original;
    };
  }, [lock]);
}
