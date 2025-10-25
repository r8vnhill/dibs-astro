import { bundledLanguages, createHighlighter } from "shiki";
import type { BundledLanguage, BundledTheme, ShikiTransformer } from "shiki";

const languageAliases: Record<string, BundledLanguage | null> = {
  bash: "bash",
  c: "c",
  javascript: "javascript",
  json: "json",
  kotlin: "kotlin",
  markdown: "markdown",
  md: "markdown",
  powershell: "powershell",
  python: "python",
  py: "python",
  rust: "rust",
  scala: "scala",
  shell: "shell",
  sh: "bash",
  plaintext: null,
};

export const availableLanguages = Array.from(
  new Set(
    Object.values(languageAliases).filter((lang): lang is BundledLanguage => lang !== null),
  ),
);

export const supportedThemes = [
  "catppuccin-latte",
  "catppuccin-mocha",
] as const;

type SupportedTheme = (typeof supportedThemes)[number];

type HighlighterInstance = ReturnType<typeof createHighlighter>;

const globalCache = globalThis as typeof globalThis & {
  __dibsShikiHighlighter?: HighlighterInstance;
};

let highlighterPromise: HighlighterInstance | null = globalCache.__dibsShikiHighlighter ?? null;

export async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [...supportedThemes],
      langs: availableLanguages,
    });
    globalCache.__dibsShikiHighlighter = highlighterPromise;
  }
  return highlighterPromise;
}

type HighlightTheme = SupportedTheme | BundledTheme | string;

interface HighlightOptions {
  code: string;
  lang: string;
  theme: HighlightTheme;
  transformers?: ShikiTransformer[];
  fallbackPreClasses?: string[];
  fallbackCodeClasses?: string[];
}

export async function highlightToHtml({
  code,
  lang,
  theme,
  transformers = [],
  fallbackPreClasses = [],
  fallbackCodeClasses = [],
}: HighlightOptions) {
  const highlighter = await getHighlighter();
  const { resolvedLang, shouldWarn } = resolveLanguage(lang);

  if (resolvedLang) {
    return highlighter.codeToHtml(code, {
      lang: resolvedLang,
      theme,
      transformers,
    });
  }

  if (shouldWarn && !missingLanguageWarnings.has(lang)) {
    missingLanguageWarnings.add(lang);
    console.warn(`[shiki] language "${lang}" not recognized. Rendering as plain text.`);
  }

  return buildPlainHtml(code, fallbackPreClasses, fallbackCodeClasses);
}

const missingLanguageWarnings = new Set<string>();

function resolveLanguage(lang: string): { resolvedLang: BundledLanguage | null; shouldWarn: boolean } {
  const lower = lang.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(languageAliases, lower)) {
    const alias = languageAliases[lower];
    if (alias) {
      return { resolvedLang: alias, shouldWarn: false };
    }
    return { resolvedLang: null, shouldWarn: false };
  }
  if (lower in bundledLanguages) {
    return { resolvedLang: lower as BundledLanguage, shouldWarn: false };
  }
  return { resolvedLang: null, shouldWarn: true };
}

function buildPlainHtml(code: string, preClasses: string[], codeClasses: string[]) {
  const preClassAttr = ["shiki", ...preClasses].filter(Boolean).join(" ");
  const codeClassAttr = codeClasses.filter(Boolean).join(" ");
  const escaped = escapeHtml(code);
  return `<pre class="${preClassAttr}"><code class="${codeClassAttr}">${escaped}</code></pre>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}
