/**
 * Canonical semantic color tokens shared by components that need to express meaning like
 * "error"/"danger" outside a single component family.
 *
 * `ui/callouts/shared.ts`'s `danger` variant and `ui/code/txt/OutputBlock.astro`'s `"error"`
 * variant both derive their colors from here so the two stay in sync instead of carrying
 * independently-maintained copies of the same hex values.
 */
export const semanticColors = {
    error: {
        light: {
            border: "#e53e3e",
            foreground: "#c53030",
        },
        dark: {
            border: "#f87171",
            foreground: "#fca5a5",
        },
    },
} as const;

export type SemanticColorToken = keyof typeof semanticColors;
