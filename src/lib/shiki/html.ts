/*
 * Small helpers used to render plain (non-highlighted) code blocks. When a requested language cannot be resolved or
 * Shiki fails to load its highlighter, we render escaped HTML using the same class names that the highlighted output
 * uses (`shiki`) so CSS targeting code blocks remains consistent.
 */
export function buildPlainHtml(code: string, preClasses: string[], codeClasses: string[]) {
    const preClassAttr = ["shiki", ...preClasses].filter(Boolean).join(" ");
    const codeClassAttr = codeClasses.filter(Boolean).join(" ");
    const escaped = escapeHtml(code);
    return `<pre class="${preClassAttr}"><code class="${codeClassAttr}">${escaped}</code></pre>`;
}

/**
 * Escape text so it is safe to insert into HTML. We intentionally escape the minimal set of characters that would
 * break markup.
 */
function escapeHtml(value: string) {
    return value
        .replace(/&/gu, "&amp;")
        .replace(/</gu, "&lt;")
        .replace(/>/gu, "&gt;")
        .replace(/"/gu, "&quot;")
        .replace(/'/gu, "&#39;");
}
