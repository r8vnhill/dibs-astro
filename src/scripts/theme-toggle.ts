/**
 * Applies the preferred theme (light/dark) to the document based on localStorage
 * and the user's system preferences.
 *
 * This script is intended to run as early as possible (ideally inline in <head>) to avoid a flash
 * of incorrect theme (FOUC).
 */

import * as utils from "~/utils";

(function() {
    // Retrieve the user-saved theme from localStorage (can be 'dark', 'light', or 'auto')
    const theme = localStorage.theme;

    // Determine if dark mode should be applied:
    // - Explicitly if 'dark'
    // - Or if 'auto' and the user's system prefers dark mode
    const isDark = theme === utils.theme.DARK
        || (theme === utils.theme.AUTO && utils.isDarkModePreferred());

    // Apply or remove the 'dark' class on <html> to enable dark mode styling via Tailwind
    document.documentElement.classList.toggle(utils.theme.DARK, isDark);
})();
