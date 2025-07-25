import type { JSX } from 'preact/jsx-runtime';
import type { NavItem } from './nav-items';

/**
 * Props for the `DesktopNavList` component.
 *
 * Defines the structure of the props expected by a navigation list component intended for desktop
 * viewports.
 */
type DesktopNavListProps = {
  /** List of items to be displayed in the desktop navigation menu. */
  items: NavItem[];
};

/**
 * Renders a horizontal list of navigation links for desktop viewports.
 *
 * This component is hidden on small screens (`sm:hidden`) and visible on larger screens
 * (`sm:flex`).
 * It receives a list of navigation items and renders them as a horizontal navigation bar.
 *
 * @param items - The navigation items to display, each with a `href` and `label`.
 * @returns A JSX element representing the desktop navigation menu.
 */
export function DesktopNavList({ items }: DesktopNavListProps): JSX.Element {
  return (
    <ul className="desktop-nav-list" id="mainNavDesktop">
      {items.map((item) => (
        <li key={item.href}>
          <a href={item.href} className="desktop-nav-item">
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
