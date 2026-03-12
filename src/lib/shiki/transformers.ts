/**
 * @file transformers.ts
 *
 * Public barrel for the project's custom Shiki transformers.
 *
 * This module intentionally re-exports the concrete transformer implementations from their
 * dedicated modules:
 *
 * - `applyTailwindClasses` injects normalized Tailwind utility classes into Shiki-generated
 *   `<pre>` and `<code>` nodes.
 * - `transformerNotationLineTextColor` parses inline `[!code color:...]` directives and applies a
 *   per-line text color via CSS custom properties.
 *
 * Keeping this file as a stable entrypoint preserves existing imports while allowing each
 * transformer to evolve in its own module with focused tests and helpers.
 */
export {
    applyTailwindClasses,
    type TailwindClassTransformerOptions,
} from "./tailwind-class-transformer";
export { transformerNotationLineTextColor } from "./line-text-color-transformer";
