import clsx from 'clsx';
import type { JSX } from 'preact/jsx-runtime';
import type { Theme } from '~/utils';

/**
 * Represents a selectable item within a theme switcher dropdown.
 */
type ThemeListItemProps = {
  /**
   * The theme value represented by this item (e.g., 'light', 'dark', 'auto').
   */
  value: Theme;
  /**
   * Indicates if this item is currently selected.
   */
  isSelected: boolean;
  /**
   * Callback triggered when this item is selected.
   */
  onSelect: (value: Theme) => void;
  /**
   * Icon associated with the theme option.
   */
  icon: JSX.Element;
  /**
   * Display name for the theme option (e.g., 'Claro', 'Oscuro').
   */
  label: string;
};

/**
 * Renders a single selectable theme option as a list item with a button.
 *
 * This component is accessible and responsive, using semantic roles and ARIA attributes to indicate
 * selection state and intent.
 * It supports both light and dark themes, and provides visual feedback on hover and selection.
 *
 * @param props - The props object for the list item.
 * @returns A JSX list item representing the theme option.
 */
export function ThemeListItem({
  value,
  isSelected,
  onSelect,
  icon,
  label,
}: ThemeListItemProps): JSX.Element {
  return (
    <li role="option" aria-selected={isSelected}>
      <button
        type="button"
        onClick={() => onSelect(value)} // Notify parent of selection
        class={clsx(
          'flex w-full items-center gap-2 rounded px-3 py-1 text-left',
          'hover:bg-gray-300 dark:hover:bg-gray-700', // Visual feedback on hover
          isSelected && 'font-semibold' // Bold text if this is the selected theme
        )}
        aria-label={`Cambiar tema a ${label}`} // Accessibility label
      >
        {icon}
        <span>{label}</span>
      </button>
    </li>
  );
}
