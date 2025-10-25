/*
 * Runtime helper used during local development and builds to reduce noisy console output and to patch Astro's shipped 
 * markdown-shiki factory with a small caching wrapper.
 *
 * Why this exists:
 * - Shiki sometimes emits repeated, non-actionable warnings prefixed with "[Shiki]" which clutter build logs and CI 
 *   output. We suppress those specific warnings to keep logs focused on actionable issues.
 * - Astro's `@astrojs/markdown-remark` plugin exposes a `createShikiHighlighter` factory that can be invoked multiple 
 *   times with the same options. That can trigger repeated work and, in some cases, duplicated warnings. We patch that 
 *   factory at runtime to cache returned highlighter promises by options stringification, reducing redundant work.
 *
 * Safety notes:
 * - This module patches `console.warn` globally for the running process; the filter is intentionally narrow (only 
 *   messages starting with "[Shiki]").
 * - The attempt to patch Astro's internal module is wrapped in a try/catch and will silently no-op if the internal 
 *   module layout changes or the import fails. This makes the helper safe to keep in the repo.
 */

// Preserve the original console.warn for non-Shiki warnings.
const originalWarn = console.warn.bind(console);

// Ignore only warnings that begin with the Shiki prefix. This keeps other
// warnings intact while silencing noisy Shiki messages.
console.warn = (...args: unknown[]) => {
  const [first, ...rest] = args;
  if (typeof first === "string" && first.startsWith("[Shiki]")) {
    return;
  }

  originalWarn(first as unknown, ...rest);
};

// Immediately-invoked async function tries to patch Astro's markdown shiki module to memoize `createShikiHighlighter` 
// calls keyed by options. We use `@vite-ignore` when importing by URL to avoid bundler warnings about the dynamic path.
void (async () => {
  try {
    const moduleUrl = new URL("../node_modules/@astrojs/markdown-remark/dist/shiki.js", import.meta.url);
    // runtime patch for Astro's markdown highlighter
    const markdownRemarkShiki = await import(/* @vite-ignore */ moduleUrl.href);
    const originalCreate = markdownRemarkShiki.createShikiHighlighter;
    if (typeof originalCreate !== "function") return;

    // Cache promises by a stable stringified options key so repeated calls with the same options return the same
    // promise instance.
    const cache = new Map<string, Promise<unknown>>();
    const patched = (options?: unknown) => {
      const key = JSON.stringify(options ?? {});
      if (!cache.has(key)) {
        cache.set(key, Promise.resolve(originalCreate(options as any)));
      }
      return cache.get(key)!;
    };

    // Replace the exported factory in-place. This is intentionally non-invasive: we only redefine the property if 
    // possible.
    Object.defineProperty(markdownRemarkShiki, "createShikiHighlighter", {
      value: patched,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  } catch {
    // Ignore patch failures; fallback to default behavior.
  }
})();
