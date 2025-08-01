import { Menu, X } from 'lucide-preact';
import type { SetStateAction } from 'preact/compat';
import type { Dispatch } from 'preact/hooks';
import type { JSX } from 'preact/jsx-runtime';

/**
 * Props used to control the open/close state of a UI component, such as a mobile navigation menu.
 */
type IsOpenProps = {
  /** Whether the navigation menu is currently open */
  isOpen: boolean;

  /** Setter to update the `isOpen` state, typically from `useState` */
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

/**
 * A button component that toggles the mobile navigation menu.
 *
 * It displays a hamburger (Menu) icon when closed and an "X" (Close) icon when open.
 * The button is hidden on larger screens (`sm:hidden`) and styled using Tailwind CSS.
 *
 * Accessibility attributes are included to enhance screen reader support.
 *
 * @param isOpen - Whether the mobile navigation menu is currently open.
 * @param setIsOpen - Function to toggle the `isOpen` state.
 * @returns A JSX button element that toggles the navigation state.
 */
export function ToggleButton({ isOpen, setIsOpen }: IsOpenProps): JSX.Element {
  return (
    <button
      type="button"
      aria-label={isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
      aria-controls="mainNavMobile" // ID of the nav container this button controls
      aria-expanded={isOpen} // Indicates the current state of the collapsible nav
      aria-haspopup="true" // Signals the presence of a popup-like component
      onClick={() => setIsOpen((prev) => !prev)} // Toggle the menu visibility
      className="toggle-button"
    >
      {isOpen ? <X size={24} /> : <Menu size={24} />}
    </button>
  );
}
