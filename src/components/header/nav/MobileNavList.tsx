import clsx from 'clsx';
import type { JSX } from 'preact/jsx-runtime';
import type { NavItem } from './nav-items';

/**
 * Props for a navigation list component, typically used for mobile or collapsible menus.
 *
 * This type defines the structure of data passed to components that render a list of navigation
 * items, including control over visibility and optional click handling.
 */
type NavListProps = {
  /**
   * Whether the navigation list is currently visible.
   * Used to toggle animations or visibility logic.
   */
  isOpen: boolean;

  /**
   * The list of navigation items to be rendered as links.
   * Each item should conform to the `NavItem` interface.
   */
  items: NavItem[];

  /**
   * Optional callback triggered when a navigation item is clicked.
   * Useful for closing the menu, tracking events, etc.
   */
  onItemClick?: (item: NavItem) => void;
};

/**
 * Renders the mobile version of the navigation menu.
 *
 * Displays a slide-in/out animated `<ul>` that lists navigation links based on the provided items.
 * Each link is accessible via keyboard and screen readers, using appropriate ARIA roles.
 *
 * - Applies transition classes based on `isOpen`.
 * - Supports optional `onItemClick` callback for handling navigation behavior.
 * - Hides the list from assistive tech when closed via `aria-hidden`.
 *
 * @param isOpen - Whether the mobile navigation list is currently open.
 * @param items - List of navigation items to render.
 * @param onItemClick - Optional callback triggered when a nav item is clicked.
 * @returns A JSX element representing the mobile navigation menu.
 */
export function MobileNavList({ isOpen, items, onItemClick }: NavListProps): JSX.Element {
  return (
    <ul
      id="mainNavMobile"
      className={clsx('mobile-nav-list', isOpen ? 'slide-fade-in' : 'slide-fade-out')}
      aria-hidden={!isOpen}
      role="menu"
      aria-label="Mobile Navigation"
    >
      {items.map((item) => (
        <li key={item.href || item.label} role="none">
          <a
            href={item.href}
            className="mobile-nav-item"
            role="menuitem"
            onClick={() => onItemClick?.(item)}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
