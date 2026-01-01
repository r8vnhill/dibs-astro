/**
 * Represents the available color themes for the application.
 * - `'light'`: Light mode theme.
 * - `'dark'`: Dark mode theme.
 * - `'auto'`: Automatically selects the theme based on system preferences.
 */
export type Theme = "light" | "dark" | "auto";

export interface ThemeConstants {
    STORAGE_KEY: string;
    DEFAULT: Theme;
    LIGHT: "light";
    DARK: "dark";
    AUTO: "auto";
}

export const theme = {
    STORAGE_KEY: "theme",
    DEFAULT: "auto",
    LIGHT: "light",
    DARK: "dark",
    AUTO: "auto",
} satisfies ThemeConstants;

/**
 * Returns a MediaQueryList object representing the user's preferred color scheme.
 *
 * This function checks if the user has requested a dark color scheme using the
 * `(prefers-color-scheme: dark)` media query.
 * The returned MediaQueryList can be used to determine if dark mode is preferred and to listen for
 * changes.
 *
 * @returns {MediaQueryList} A MediaQueryList for the dark color scheme preference.
 */
export function getColorSchemeMediaQuery(): MediaQueryList {
    return window.matchMedia("(prefers-color-scheme: dark)");
}

/**
 * Determines whether the user prefers a dark color scheme based on their system settings.
 *
 * @returns {boolean} `true` if the user's system preference is set to dark mode, otherwise `false`.
 */
export function isDarkModePreferred(): boolean {
    return getColorSchemeMediaQuery().matches;
}

/**
 * Applies and persists the selected theme.
 *
 * This function updates the current theme both visually (by applying the appropriate class to the
 * `<html>` element) and persistently (by saving the preference in `localStorage`).
 *
 * @param value - The theme to apply (`'light'`, `'dark'`, or `'auto'`).
 */
export function applyTheme(value: Theme): void {
    persistTheme(value);
    applyThemeClass(value);
}

/**
 * Persists the selected theme in localStorage.
 *
 * Stores the given theme value under a predefined key to maintain user preferences across sessions
 * and page reloads.
 *
 * @param value - The selected theme to store (`'light'`, `'dark'`, or `'auto'`).
 */
function persistTheme(value: Theme): void {
    localStorage.setItem(theme.STORAGE_KEY, value);
}

/**
 * Applies the appropriate CSS class to the root HTML element based on the given theme.
 *
 * This function toggles the `dark` class on `<html>` depending on the selected theme.
 * If the theme is `'auto'`, it will follow the user's system preference (via `prefers-color-scheme: dark`).
 *
 * @param value - The selected theme value (`'light'`, `'dark'`, or `'auto'`).
 */
function applyThemeClass(value: Theme): void {
    const prefersDark = isDarkModePreferred();
    const shouldUseDark = value === theme.DARK || (value === theme.AUTO && prefersDark);
    document.documentElement.classList.toggle(theme.DARK, shouldUseDark);
}
