import {
  createCssVariablesTheme,
  createHighlighter,
  isSpecialLang,
} from "shiki";

let cachedCssTheme: ReturnType<typeof createCssVariablesTheme> | undefined;

const cssVariablesTheme = () =>
  cachedCssTheme ??
  (cachedCssTheme = createCssVariablesTheme({
    variablePrefix: "--astro-code-",
  }));

interface HighlighterOptions {
  langs?: string[];
  theme?: unknown;
  themes?: Record<string, unknown>;
  langAlias?: Record<string, string>;
}

export async function createShikiHighlighter({
  langs = [],
  theme = "github-dark",
  themes = {},
  langAlias = {},
}: HighlighterOptions = {}) {
  const resolvedTheme = theme === "css-variables" ? cssVariablesTheme() : theme;

  const highlighter = await createHighlighter({
    langs: ["plaintext", ...langs],
    langAlias,
    themes: Object.values(themes).length ? Object.values(themes) : [resolvedTheme],
    warnings: false,
  } as any);

  async function highlight(
    code: string,
    lang = "plaintext",
    options: Record<string, any> | undefined,
    to: "html" | "hast",
  ) {
  const resolvedLang = langAlias[lang] ?? lang;
    const loadedLanguages = highlighter.getLoadedLanguages();

    if (!isSpecialLang(lang) && !loadedLanguages.includes(resolvedLang)) {
      try {
  await highlighter.loadLanguage(resolvedLang as any);
      } catch {
        const langStr =
          lang === resolvedLang
            ? `"${lang}"`
            : `"${lang}" (aliased to "${resolvedLang}")`;
        console.warn(
          `[Shiki] The language ${langStr} doesn't exist, falling back to "plaintext".`,
        );
        lang = "plaintext";
      }
    }

    code = code.replace(/(?:\r\n|\r|\n)$/u, "");
    const themeOptions = Object.values(themes).length ? { themes } : { theme };
    const inline = options?.inline ?? false;

    return highlighter[to === "html" ? "codeToHtml" : "codeToHast"](code, {
      ...themeOptions,
      defaultColor: options?.defaultColor,
      lang,
      meta: options?.meta ? { __raw: options.meta } : undefined,
      transformers: [
        {
          pre(node: any) {
            if (inline) {
              node.tagName = "code";
            }

            const { class: attrClass, style: attrStyle, ...rest } =
              options?.attributes ?? {};
            Object.assign(node.properties, rest);

            const classValue = `${normalizePropAsString(
              node.properties.class,
            ) ?? ""}${attrClass ? ` ${attrClass}` : ""}`;
            const styleValue = `${normalizePropAsString(
              node.properties.style,
            ) ?? ""}${attrStyle ? `; ${attrStyle}` : ""}`;

            node.properties.class = classValue.replace(/shiki/gu, "astro-code");
            node.properties.dataLanguage = lang;

            if (options?.wrap === false || options?.wrap === undefined) {
              node.properties.style = `${styleValue}; overflow-x: auto;`;
            } else if (options.wrap === true) {
              node.properties.style = `${styleValue}; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;`;
            }
          },
          line(node: any) {
            if (resolvedLang === "diff") {
              const innerSpanNode = node.children[0];
              const innerSpanTextNode =
                innerSpanNode?.type === "element" && innerSpanNode.children?.[0];

              if (innerSpanTextNode && innerSpanTextNode.type === "text") {
                const start = innerSpanTextNode.value[0];
                if (start === "+" || start === "-") {
                  innerSpanTextNode.value = innerSpanTextNode.value.slice(1);
                  innerSpanNode.children.unshift({
                    type: "element",
                    tagName: "span",
                    properties: { style: "user-select: none;" },
                    children: [{ type: "text", value: start }],
                  });
                }
              }
            }
          },
          code(node: any) {
            if (inline) {
              return node.children[0];
            }
            return undefined;
          },
        },
        ...(options?.transformers ?? []),
      ],
    } as any);
  }

  return {
    codeToHast(code: string, lang: string, options: Record<string, any> = {}) {
      return highlight(code, lang, options, "hast");
    },
    codeToHtml(code: string, lang: string, options: Record<string, any> = {}) {
      return highlight(code, lang, options, "html");
    },
  };
}

function normalizePropAsString(value: unknown): string | undefined {
  return Array.isArray(value) ? value.join(" ") : (value as string | undefined);
}
