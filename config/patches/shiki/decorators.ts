/*
 * Small set of decorator utilities used by the Shiki highlighter factory.
 *
 * Purpose:
 * - Keep the core highlight executor minimal (just calls into Shiki) and implement auxiliary behavior as composable
 *   decorators. This keeps the logic testable and easier to reason about.
 *
 * Key APIs:
 * - composeDecorators(base, decorators): build a single executor by wrapping `base` with the provided decorators
 *   (right-to-left application).
 * - withAliasResolution: resolves language aliases (updates `state.resolvedLang`).
 * - withLanguageLoading: attempts to load a Shiki language on demand; falls back to `plaintext` when the language isn’t
 *   available.
 * - withTrailingNewlineTrim: removes a single trailing newline to avoid
 *   rendering an extra blank line in highlighted output.
 * - withDefaultTransformers: injects the default transformer as the first transformer so it always runs before
 *   user-provided transformers.
 */

import { isSpecialLang } from "shiki";
import { createDefaultTransformer } from "./transformers";
import type { HighlightDecorator, HighlightExecutor } from "./types";

/**
 * Compose a list of decorators around a base executor.
 * The decorators array is applied right-to-left so the first decorator in the list is the outermost wrapper.
 */
export function composeDecorators(
    base: HighlightExecutor,
    decorators: HighlightDecorator[],
): HighlightExecutor {
    return decorators.reduceRight((next, decorate) => decorate(next), base);
}

/**
 * Resolve language aliases before attempting to highlight. The decorator updates `state.resolvedLang` when an alias is
 * present. Downstream decorators/transformers should use `resolvedLang` when deciding behavior.
 */
export function withAliasResolution(): HighlightDecorator {
    return (next) => async (state) => {
        const resolvedAlias = state.langAlias[state.lang];
        if (resolvedAlias) {
            state.resolvedLang = resolvedAlias;
        }
        return next(state);
    };
}

/**
 * Ensure the requested language is loaded by the Shiki highlighter. If the language cannot be loaded, log a warning and
 * fall back to `plaintext`.
 *
 * Note: `isSpecialLang` checks for Shiki virtual languages (e.g. "diff") which may not require loading.
 */
export function withLanguageLoading(): HighlightDecorator {
    return (next) => async (state) => {
        const { highlighter, resolvedLang, lang } = state;
        const loadedLanguages = highlighter.getLoadedLanguages();

        if (!isSpecialLang(lang) && !loadedLanguages.includes(resolvedLang)) {
            try {
                // Load language on demand; most highlights will find the language already loaded but this supports
                // dynamic lists.
                await highlighter.loadLanguage(resolvedLang as any);
            } catch {
                const langStr = lang === resolvedLang
                    ? `"${lang}"`
                    : `"${lang}" (aliased to "${resolvedLang}")`;
                console.warn(
                    `[Shiki] The language ${langStr} doesn't exist, falling back to "plaintext".`,
                );
                // Mutate `state.lang` so downstream logic (e.g. default transformers) sees the fallback value.
                state.lang = "plaintext";
            }
        }

        return next(state);
    };
}

/**
 * Trim a single trailing newline from the input code. This prevents an extra empty line from appearing in the
 * highlighted output and keeps diff between raw files and rendered output minimal.
 */
export function withTrailingNewlineTrim(): HighlightDecorator {
    return (next) => async (state) => {
        state.code = state.code.replace(/(?:\r\n|\r|\n)$/u, "");
        return next(state);
    };
}

/**
 * Inject the primary/default transformer at the front of the transformers list. This ensures the default transformation
 * logic runs before any user-supplied transformers.
 */
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
