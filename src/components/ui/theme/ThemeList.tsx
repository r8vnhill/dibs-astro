import type { JSX } from "react";
import { applyTheme, type Theme } from "~/utils";
import { ThemeListItem } from "./ThemeListItem";
import { themeOptions } from "./ThemeOptions";
import type { ThemeLabels } from "./ThemeSwitcher";

/**
 * Props for the ThemeList component.
 */
type ThemeListProps = {
    /**
     * The currently selected theme.
     */
    theme: Theme;
    /**
     * Callback function to update the selected theme.
     */
    setTheme: (value: Theme) => void;
    /**
     * Function to close the theme list UI.
     */
    close: () => void;
    labels: ThemeLabels;
};

/**
 * Dropdown list component for selecting a theme.
 *
 * Renders a list of theme options using `ThemeListItem`, allowing the user to choose between them.
 * Each option includes a label and an icon. When selected, the corresponding theme is applied,
 * the theme state is updated, and the dropdown is closed.
 *
 * ## Accessibility:
 * - Uses `role="listbox"` to indicate a selectable list.
 * - Each item uses `role="option"` via `ThemeListItem`.
 *
 * @param theme The currently selected theme.
 * @param setTheme Callback to update the selected theme.
 * @param close Callback to close the dropdown.
 * @returns A rendered list of theme options.
 */
export function ThemeList({
    theme,
    setTheme,
    close,
    labels,
}: ThemeListProps): JSX.Element {
    // Converts the themeOptions object into a list of labeled theme entries
    const themeOptionsList = Object.entries(themeOptions) as [Theme, { icon: JSX.Element }][];

    return (
        <ul
            role="listbox"
            className="
        z-10
        w-max min-w-[9rem]
        mt-1
        bg-base-background
        border
        shadow-md
        absolute rounded
      "
        >
            {themeOptionsList.map(([value, { icon }]) => (
                <ThemeListItem
                    value={value}
                    isSelected={theme === value}
                    onSelect={(value) => {
                        setTheme(value); // Update theme state
                        applyTheme(value); // Apply to the document
                        close(); // Close the dropdown
                    }}
                    icon={icon}
                    label={labels[value]}
                />
            ))}
        </ul>
    );
}
