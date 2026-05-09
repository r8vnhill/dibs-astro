/**
 * Default Shiki theme names for light and dark mode rendering.
 */

/**
 * The default light mode theme for Shiki highlighting.
 */
export const DEFAULT_LIGHT_THEME = "catppuccin-latte";

/**
 * The default dark mode theme for Shiki highlighting.
 */
export const DEFAULT_DARK_THEME = "catppuccin-mocha";

/**
 * Pair of default light and dark themes for dual-mode rendering.
 *
 * Backwards compatibility alias for {@link DEFAULT_LIGHT_THEME} and {@link DEFAULT_DARK_THEME}.
 *
 * @deprecated Use {@link DEFAULT_LIGHT_THEME} and {@link DEFAULT_DARK_THEME} directly.
 */
export const SHIKI_DEFAULT_THEMES = Object.freeze({
    light: DEFAULT_LIGHT_THEME,
    dark: DEFAULT_DARK_THEME,
});
