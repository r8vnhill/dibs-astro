import { isSpecialLang } from "shiki";
import { createDefaultTransformer } from "./transformers";
import type {
    HighlightExecutor,
    HighlightDecorator,
    HighlightState,
} from "./types";

export function composeDecorators(
    base: HighlightExecutor,
    decorators: HighlightDecorator[],
): HighlightExecutor {
    return decorators.reduceRight((next, decorate) => decorate(next), base);
}

export function withAliasResolution(): HighlightDecorator {
    return (next) => async (state) => {
        const resolvedAlias = state.langAlias[state.lang];
        if (resolvedAlias) {
            state.resolvedLang = resolvedAlias;
        }
        return next(state);
    };
}

export function withLanguageLoading(): HighlightDecorator {
    return (next) => async (state) => {
        const { highlighter, resolvedLang, lang } = state;
        const loadedLanguages = highlighter.getLoadedLanguages();

        if (!isSpecialLang(lang) && !loadedLanguages.includes(resolvedLang)) {
            try {
                await highlighter.loadLanguage(resolvedLang as any);
            } catch {
                const langStr = lang === resolvedLang
                    ? `"${lang}"`
                    : `"${lang}" (aliased to "${resolvedLang}")`;
                console.warn(
                    `[Shiki] The language ${langStr} doesn't exist, falling back to "plaintext".`,
                );
                state.lang = "plaintext";
            }
        }

        return next(state);
    };
}

export function withTrailingNewlineTrim(): HighlightDecorator {
    return (next) => async (state) => {
        state.code = state.code.replace(/(?:\r\n|\r|\n)$/u, "");
        return next(state);
    };
}

export function withDefaultTransformers(): HighlightDecorator {
    return (next) => async (state) => {
        const primaryTransformer = createDefaultTransformer({
            inline: state.inline,
            lang: state.lang,
            options: state.options,
            resolvedLang: state.resolvedLang,
        });

        state.transformers = [primaryTransformer, ...state.transformers];
        return next(state);
    };
}
