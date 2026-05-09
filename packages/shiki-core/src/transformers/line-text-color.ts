/**
 * Line-based text color directives and transformer for Shiki.
 *
 * This module provides helpers for parsing and sanitizing inline color directives,
 * and a Shiki transformer factory that applies per-line text color customization.
 */

import type { ShikiTransformer } from "shiki";
import { assignMergedClassName } from "./class-tokens";

/**
 * Inline pattern for matching `[!code color:...]` directives.
 *
 * Captures:
 * - `content`: the code before the directive
 * - `color`: the CSS color value
 *
 * The directive can be preceded by a comment marker (`#`, `//`, `;`, or `--`) and trailing whitespace.
 */
const inlineLineColorPattern =
    /^(?<content>.*?)(?:\s+(?:#|\/\/|;|--)\s*)?\[!code\s+color:(?<color>[^\]]+)\]\s*$/u;

/**
 * Conservative pattern for validating CSS color values.
 *
 * Accepts:
 * - alphanumeric characters
 * - `#`, `()`, `,`, `.`, `%`, `/`, spaces, `+`, `-`
 * - maximum 64 characters
 *
 * Rejects values containing semicolons or other problematic characters.
 */
const conservativeCssColorPattern = /^[a-zA-Z0-9#(),.%/\s+-]{1,64}$/u;

/**
 * Fallback object used when metadata is not an object.
 *
 * This allows the WeakMap lookup to work consistently even when Shiki provides non-object metadata.
 */
const fallbackMetaKey = {};

/**
 * Parsed result from {@link parseInlineLineColorDirective}.
 */
export interface ParsedLineColorDirective {
    /**
     * The code content with the directive removed.
     */
    content: string;

    /**
     * The sanitized CSS color value.
     */
    color: string;
}

/**
 * Derives a stable cache key from Shiki metadata.
 *
 * If the metadata is an object, returns it directly (suitable for WeakMap keys).
 * Otherwise, returns a fallback object.
 *
 * @param meta the metadata value from Shiki
 * @returns a stable object suitable for use as a WeakMap key
 */
export const getMetaKey = (meta: unknown): object =>
    typeof meta === "object" && meta !== null ? meta : fallbackMetaKey;

/**
 * Sanitizes a CSS color value to prevent injection attacks.
 *
 * The validation:
 * - trims whitespace
 * - checks against the conservative color pattern
 * - rejects values containing semicolons
 *
 * @param value the raw color string
 * @returns the sanitized color, or null if validation fails
 */
export const sanitizeCssColor = (value: string): string | null => {
    const normalized = value.trim();
    if (!normalized) return null;
    if (!conservativeCssColorPattern.test(normalized)) return null;
    if (normalized.includes(";")) return null;
    return normalized;
};

/**
 * Parses an inline `[!code color:...]` directive from a source line.
 *
 * Extracts the code content and the color value, sanitizing the color through
 * {@link sanitizeCssColor}.
 *
 * @param line the source code line
 * @returns a parsed directive object, or null if the line does not contain a valid directive
 */
export const parseInlineLineColorDirective = (
    line: string,
): ParsedLineColorDirective | null => {
    const match = line.match(inlineLineColorPattern);
    if (!match) return null;

    const color = sanitizeCssColor(match.groups?.color ?? "");
    if (!color) return null;

    return {
        content: (match.groups?.content ?? "").replace(/\s+$/u, ""),
        color,
    };
};

/**
 * Appends a CSS declaration to an existing inline style string.
 *
 * Handles:
 * - missing or empty existing styles
 * - style strings with or without trailing semicolons
 *
 * @param existing the current style attribute value (or any type)
 * @param declaration the CSS declaration to append (e.g., `--var:value`)
 * @returns the merged style string with proper semicolon termination
 */
export const appendInlineStyle = (existing: unknown, declaration: string): string => {
    const style = typeof existing === "string" ? existing.trim() : "";
    if (!style) return `${declaration};`;
    const suffix = style.endsWith(";") ? "" : ";";
    return `${style}${suffix}${declaration};`;
};

/**
 * CSS class name applied to lines with a color directive.
 */
const LINE_COLOR_CLASS = "line-colored";

/**
 * Creates a Shiki transformer that accepts inline `[!code color:...]` directives.
 *
 * The transformer operates in two phases:
 *
 * **Preprocess phase:**
 * - Scans each source line for the inline directive
 * - Parses and sanitizes the color value
 * - Removes the directive from the source (so it does not appear in output)
 * - Stores the color indexed by line number and metadata key
 *
 * **Line mutation phase:**
 * - Receives the rendered line node from Shiki
 * - Looks up the stored color by line number and metadata
 * - Annotates the line with the `line-colored` class
 * - Appends a CSS custom property `--code-line-text-color` with the color value
 *
 * ## Example
 *
 * ```ts
 * import { createLineTextColorTransformer } from '@ravenhill/shiki-core';
 *
 * const transformer = createLineTextColorTransformer();
 *
 * shiki.codeToHtml(source, {
 *   lang: "ts",
 *   transformers: [transformer],
 * });
 * ```
 *
 * ## Inline Directive Syntax
 *
 * Lines can use any of these directive formats:
 *
 * ```ts
 * code here [!code color:#ff0000]
 * code here # [!code color:#ff0000]
 * code here // [!code color:#ff0000]
 * code here ; [!code color:#ff0000]
 * code here -- [!code color:#ff0000]
 * ```
 *
 * The color value is sanitized against a conservative pattern to prevent CSS injection.
 *
 * @returns a {@link ShikiTransformer} that processes line color directives
 */
export function createLineTextColorTransformer(): ShikiTransformer {
    const lineColorsByMeta = new WeakMap<object, Map<number, string>>();

    return {
        name: "notation-line-text-color",
        preprocess(code) {
            const lines = code.split("\n");
            const lineColors = new Map<number, string>();

            for (const [index, line] of lines.entries()) {
                const parsedDirective = parseInlineLineColorDirective(line);
                if (!parsedDirective) continue;

                lineColors.set(index + 1, parsedDirective.color);
                lines[index] = parsedDirective.content;
            }

            if (lineColors.size > 0) {
                lineColorsByMeta.set(getMetaKey(this.meta), lineColors);
            }

            return lines.join("\n");
        },
        line(node, lineNumber) {
            const metaKey = getMetaKey(this.meta);
            const lineColors = lineColorsByMeta.get(metaKey);
            const color = lineColors?.get(lineNumber);
            if (!color) return;

            assignMergedClassName(node, [LINE_COLOR_CLASS]);
            node.properties.style = appendInlineStyle(
                node.properties.style,
                `--code-line-text-color:${color}`,
            );
        },
    } satisfies ShikiTransformer;
}

/**
 * Backwards compatibility alias for {@link createLineTextColorTransformer}.
 *
 * @deprecated Use {@link createLineTextColorTransformer} instead.
 */
export function transformerNotationLineTextColor(): ShikiTransformer {
    return createLineTextColorTransformer();
}
