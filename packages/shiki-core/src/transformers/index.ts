/**
 * Internal barrel for Shiki transformer helpers.
 *
 * This module groups the transformer-related implementation units used by `@ravenhill/shiki-core`. It is kept as an 
 * internal composition point so the package root can expose a small, stable public API.
 *
 * Consumers should import from `@ravenhill/shiki-core`, not from this module.
 *
 * ## Export groups
 *
 * - **Class token helpers:** pure utilities for reading, normalizing, merging, and assigning CSS class tokens on 
 *   HAST-like nodes.
 * - **Tailwind class transformer:** a Shiki transformer factory that adds configured Tailwind classes to `<pre>` and 
 *   `<code>` nodes while preserving existing classes.
 * - **Line text color transformer:** a Shiki transformer factory for inline `[!code color:...]` directives, plus the 
 *   parsing, sanitization, metadata, and style helpers needed to implement it safely.
 *
 * ## Public import style
 *
 * Use the package root for application and consumer code:
 *
 * ```ts
 * import {
 *   createLineTextColorTransformer,
 *   createTailwindClassTransformer,
 * } from "@ravenhill/shiki-core";
 * ```
 *
 * Direct imports from this barrel are reserved for package-internal modules.
 */

export { type ClassableNode, type ClassValue } from "./class-tokens";
export { appendUniqueClasses, assignMergedClassName, splitClassTokens, toClassTokens } from "./class-tokens";

export {
    applyTailwindClasses,
    createTailwindClassTransformer,
    type TailwindClassTransformerOptions,
} from "./tailwind-classes";

export {
    appendInlineStyle,
    createLineTextColorTransformer,
    getMetaKey,
    type ParsedLineColorDirective,
    parseInlineLineColorDirective,
    sanitizeCssColor,
    transformerNotationLineTextColor,
} from "./line-text-color";
