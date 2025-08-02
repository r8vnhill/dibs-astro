import clsx from 'clsx';
import { themeOptions } from './ThemeOptions';
import type { StyledComponent, Theme } from '~/utils';
import type { JSX } from 'react';

/**
 * Props for the ThemeSwitcherButton component.
 */
type ThemeSwitcherButtonProps = {
  /**
   * The current theme object.
   */
  theme: Theme;
  /**
   * Function to toggle between themes.
   */
  toggle: () => void;
  /**
   * Indicates if the theme switcher dropdown or menu is open.
   */
  isOpen: boolean;
  /**
   * Optional accessible label or tooltip for the button.
   */
  title?: string;
} & StyledComponent;

/**
 * Renders the theme switcher trigger button.
 *
 * This button displays the currently selected theme icon and label, and toggles the theme selector
 * dropdown when clicked.
 * It supports accessibility attributes and allows external styling through the `className` and
 * `title` props.
 *
 * @param theme - The currently selected theme (`'light'`, `'dark'`, or `'auto'`).
 * @param toggle - Callback to toggle the theme dropdown open or closed.
 * @param isOpen - Indicates whether the dropdown is currently open.
 * @param className - Optional additional CSS classes for the button.
 * @param title - Optional tooltip text (defaults to `"Cambiar tema"`).
 * @returns The JSX element representing the theme switcher button.
 */
export function ThemeSwitcherButton({
  theme,
  toggle,
  isOpen,
  className,
  title = 'Cambiar tema',
}: ThemeSwitcherButtonProps): JSX.Element {
  // Retrieve the label and icon for the current theme
  const option = themeOptions[theme] ?? { label: theme, icon: null };

  return (
    <button
      type="button"
      className={clsx(
        'bg-base-background inline-flex items-center gap-1 rounded border px-3 py-1',
        className // allows external class overrides
      )}
      onClick={toggle}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      title={title}
    >
      {option.icon}
      {/* Screen-reader only label for accessibility */}
      <span className="sr-only">Tema actual:</span>
      {option.label}
    </button>
  );
}
