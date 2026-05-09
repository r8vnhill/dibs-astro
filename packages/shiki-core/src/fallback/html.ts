/**
 * Small helpers used to render plain (non-highlighted) code blocks.
 *
 * When a requested language cannot be resolved or Shiki fails to load its highlighter,
 * we render escaped HTML using the same class names that the highlighted output uses (`shiki`)
 * so CSS targeting code blocks remains consistent.
 */

/**
 * Escape text so it is safe to insert into HTML.
 *
 * We intentionally escape the minimal set of characters that would break markup:
 * - `&` to `&amp;`
 * - `<` to `&lt;`
 * - `>` to `&gt;`
 * - `"` to `&quot;`
 * - `'` to `&#39;`
 *
 * @param value the raw text to escape
 * @returns the escaped text safe for insertion into HTML
 */
export function escapeCodeHtml(value: string): string {
    return value
        .replace(/&/gu, "&amp;")
        .replace(/</gu, "&lt;")
        .replace(/>/gu, "&gt;")
        .replace(/"/gu, "&quot;")
        .replace(/'/gu, "&#39;");
}

/**
 * Renders a code block as plain HTML when syntax highlighting is not available.
 *
 * Uses the Shiki wrapper class name (`shiki`) alongside optional pre and code element classes
 * to maintain consistent CSS targeting across highlighted and fallback blocks.
 *
 * @param code the raw code to render
 * @param preClasses optional classes applied to the `<pre>` element
 * @param codeClasses optional classes applied to the inner `<code>` element
 * @returns an HTML string with the escaped code wrapped in `<pre>` and `<code>` elements
 */
export function renderFallbackCodeHtml(
    code: string,
    preClasses: string[] = [],
    codeClasses: string[] = [],
): string {
    const preClassAttr = ["shiki", ...preClasses].filter(Boolean).join(" ");
    const codeClassAttr = codeClasses.filter(Boolean).join(" ");
    const escaped = escapeCodeHtml(code);
    return `<pre class="${preClassAttr}"><code class="${codeClassAttr}">${escaped}</code></pre>`;
}

/**
 * Backwards compatibility alias for the canonical {@link renderFallbackCodeHtml}.
 *
 * @deprecated Use {@link renderFallbackCodeHtml} instead.
 */
export function buildPlainHtml(code: string, preClasses: string[], codeClasses: string[]) {
    return renderFallbackCodeHtml(code, preClasses, codeClasses);
}
