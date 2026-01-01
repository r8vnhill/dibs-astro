import clsx from "clsx";
import { type Dispatch, type JSX, type SetStateAction, useEffect, useRef, useState } from "react";
import { useDisclosure, useOutsideClick } from "~/hooks";
import * as utils from "~/utils";
import { applyTheme, type Theme } from "~/utils";
import { ThemeList } from "./ThemeList";
import { ThemeSwitcherButton } from "./ThemeSwitcherButton";

/**
 * <ThemeSwitcher /> is a dropdown component that allows users to toggle between themes (e.g.,
 * light, dark, system).
 *
 * Features:
 * - Initializes the current theme from local storage or system preferences.
 * - Detects outside clicks to close the dropdown.
 * - Syncs the theme state with other browser tabs.
 * - Displays a toggle button and a list of selectable themes.
 */
export default function ThemeSwitcher(): JSX.Element {
    const [theme, setTheme] = useState<Theme>(utils.theme.DEFAULT);

    // Reference to the dropdown wrapper to detect outside clicks
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { isOpen, toggle, close } = useDisclosure();

    useOutsideClick(dropdownRef, close);
    useInitializeTheme(setTheme);
    useAutoThemeSync(theme);

    return (
        <div
            className={clsx("relative", "inline-block", "text-left")}
            ref={dropdownRef}
        >
            {/* Toggle button for the theme dropdown */}
            <ThemeSwitcherButton theme={theme} toggle={toggle} isOpen={isOpen} />

            {/* Conditionally render the dropdown list of themes */}
            {isOpen && <ThemeList theme={theme} setTheme={setTheme} close={close} />}
        </div>
    );
}

/**
 * React hook to initialize the application's theme on first render.
 *
 * This hook retrieves the user's previously selected theme from `localStorage`.
 * If no theme is stored, it falls back to the default theme.
 * It then updates the internal state and applies the theme to the document.
 *
 * @param setTheme - State updater function to set the current theme.
 */
function useInitializeTheme(setTheme: Dispatch<SetStateAction<utils.Theme>>): void {
    useEffect(() => {
        const stored = (localStorage.getItem(utils.theme.STORAGE_KEY) as Theme)
            || utils.theme.DEFAULT;

        setTheme(stored);
        applyTheme(stored);
    }, []);
}

/**
 * React hook that keeps the theme in sync with the system preference when `'auto'` is selected.
 *
 * This hook listens for changes in the user's system color scheme (e.g., switching between light
 * and dark modes in the OS).
 * If the current theme is set to `'auto'`, the hook ensures the application reflects those changes
 * immediately.
 *
 * @param theme - The current theme selection.
 */
function useAutoThemeSync(theme: Theme): void {
    useEffect(() => {
        if (theme !== utils.theme.AUTO) return;

        const media = utils.getColorSchemeMediaQuery();

        // Define a listener that reapplies the 'auto' theme when the preference changes
        const listener = () => applyTheme(utils.theme.AUTO);

        const themeChangeEvent = "change";
        media.addEventListener(themeChangeEvent, listener);

        // Clean up the event listener on component unmount or dependency change
        return () => media.removeEventListener(themeChangeEvent, listener);
    }, [theme]);
}
