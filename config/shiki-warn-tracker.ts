const originalWarn = console.warn.bind(console);

console.warn = (...args: unknown[]) => {
  const [first, ...rest] = args;
  if (typeof first === "string" && first.startsWith("[Shiki]")) {
    return;
  }

  originalWarn(first as unknown, ...rest);
};

void (async () => {
  try {
    const moduleUrl = new URL("../node_modules/@astrojs/markdown-remark/dist/shiki.js", import.meta.url);
    // @ts-expect-error - runtime patch for Astro's markdown highlighter
    const markdownRemarkShiki = await import(/* @vite-ignore */ moduleUrl.href);
    const originalCreate = markdownRemarkShiki.createShikiHighlighter;
    if (typeof originalCreate !== "function") return;

    const cache = new Map<string, Promise<unknown>>();
    const patched = (options?: unknown) => {
      const key = JSON.stringify(options ?? {});
      if (!cache.has(key)) {
        cache.set(key, Promise.resolve(originalCreate(options as any)));
      }
      return cache.get(key)!;
    };

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
