/**
 * Maps keyboard navigation keys to directional values used for tab traversal.
 *
 * This utility function is used in keyboard event handlers to interpret which direction the user
 * intends to navigate in a tab list.
 *
 * ## Supported Keys:
 * - `ArrowRight`: move focus/selection forward (returns 1)
 * - `ArrowLeft`: move focus/selection backward (returns -1)
 * - `Home`: jump to the first tab (returns "start")
 * - `End`: jump to the last tab (returns "end")
 *
 * Any other key returns `undefined`.
 *
 * @param key - The keyboard key received from the event.
 * @return A numeric direction (`1` or `-1`) for linear navigation, a keyword (`"start"` or `"end"`)
 *   for edge jumps, or `undefined` if the key is irrelevant.
 */
export function resolveKeyDirection(
  key: string
): number | "start" | "end" | undefined {
  return {
    ArrowRight: 1,
    ArrowLeft: -1,
    Home: "start",
    End: "end",
  }[key] as number | "start" | "end" | undefined;
}
