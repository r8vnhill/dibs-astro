/**
 * @file Utilities for rendering plain, non-highlighted code blocks.
 *
 * These helpers are used when syntax highlighting is unavailable, for example when a requested language cannot be
 * resolved or Shiki fails to create/load a highlighter. The fallback output intentionally mirrors the structural shape
 * and CSS hooks of highlighted Shiki output by always applying the `shiki` class to the outer `<pre>` element.
 *
 * The module keeps escaping context-specific:
 *
 * - code content is escaped for an HTML text node;
 * - class names are escaped for an HTML attribute value.
 *
 * The functions return HTML strings because this package is host-agnostic and should not depend on a browser DOM,
 * Astro runtime APIs, or server-side DOM serialization.
 */

/**
 * Escapes raw text for insertion into an HTML text node.
 *
 * This helper is intended for element text content, such as the body of a `<code>` element. It escapes only the
 * characters that can introduce or break markup in text-node context:
 *
 * - `&` as `&amp;`
 * - `<` as `&lt;`
 * - `>` as `&gt;`
 *
 * Quotes and apostrophes are intentionally left unchanged because they do not need escaping in HTML text-node context.
 *
 * @param value - Raw text to escape.
 * @returns Text safe to place directly between HTML tags.
 */
export const escapeHtmlText = (value: string): string =>
    value
        .replace(/&/gu, "&amp;")
        .replace(/</gu, "&lt;")
        .replace(/>/gu, "&gt;");

/**
 * Escapes raw text for insertion into a quoted HTML attribute value.
 *
 * Attribute context requires the same escaping as text-node context plus the  quote characters that can terminate or
 * corrupt quoted attributes:
 *
 * - `"` as `&quot;`
 * - `'` as `&#39;`
 *
 * Use this helper for generated attribute values, not for code text content.
 *
 * @param value - Raw attribute text to escape.
 * @returns Text safe to place inside a quoted HTML attribute value.
 */
export const escapeHtmlAttribute = (value: string): string =>
    escapeHtmlText(value)
        .replace(/"/gu, "&quot;")
        .replace(/'/gu, "&#39;");

/**
 * Converts caller-provided class strings into a normalized class attribute value.
 *
 * Each input string may contain one or more whitespace-separated class tokens. The helper trims each string, splits it
 * into tokens, drops empty tokens, escapes each token for attribute context, and joins the result with a single space.
 *
 * This keeps fallback rendering defensive without validating CSS identifier syntax. The goal is to produce safe HTML,
 * not to reject unusual but valid class names.
 *
 * @param values - Class strings or whitespace-separated class-token groups.
 * @returns A normalized, attribute-safe class value, or an empty string.
 */
const normalizeClassTokens = (values: readonly string[]): string =>
    values
        .flatMap((value) => value.trim().split(/\s+/u))
        .filter(Boolean)
        .map(escapeHtmlAttribute)
        .join(" ");

/**
 * Renders an HTML attribute only when it has a non-empty value.
 *
 * The returned string includes the leading space so callers can concatenate it directly after an element name.
 *
 * @param name - Attribute name to render.
 * @param value - Already-escaped attribute value.
 * @returns A complete attribute fragment, or an empty string.
 */
const renderAttribute = (name: string, value: string): string => value === "" ? "" : ` ${name}="${value}"`;

/**
 * Renders a plain fallback code block when syntax highlighting is unavailable.
 *
 * The fallback renderer preserves Shiki-compatible CSS targeting by always applying `shiki` to the outer `<pre>`
 * element. Additional `preClasses` and `codeClasses` are normalized as whitespace-separated class tokens and escaped
 * for attribute context before rendering.
 *
 * When `codeClasses` normalizes to an empty value, the inner `<code>` element is  rendered without a `class` attribute
 * instead of emitting `class=""`.
 *
 * @param code - Raw code text to render inside the fallback block.
 * @param preClasses - Optional classes to add to the outer `<pre>` element.
 * @param codeClasses - Optional classes to add to the inner `<code>` element.
 * @returns An HTML string containing escaped code wrapped in `<pre><code>`.
 */
export function renderFallbackCodeHtml(
    code: string,
    preClasses: readonly string[] = [],
    codeClasses: readonly string[] = [],
): string {
    const preClassAttr = normalizeClassTokens(["shiki", ...preClasses]);
    const codeClassAttr = normalizeClassTokens(codeClasses);
    const escapedCode = escapeHtmlText(code);

    return [
        `<pre class="${preClassAttr}">`,
        `<code${renderAttribute("class", codeClassAttr)}>`,
        escapedCode,
        "</code></pre>",
    ].join("");
}
