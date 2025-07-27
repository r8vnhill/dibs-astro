import type { JSX } from 'astro/jsx-runtime';
import { DesktopNavList } from './DesktopNavList';
import { MobileNavList } from './MobileNavList';
import { navItems, type NavItem } from './nav-items';
import { ToggleButton } from './ToggleButton';
import { useDisclosure, useEscapeKey, useLockBodyScroll } from '~/hooks';

/**
 * Props for the `HeaderNav` component.
 */
export interface HeaderNavProps {
  /**
   * Optional array of navigation items to display in the header.
   */
  items?: NavItem[];
}

/**
 * Renders the main navigation component for the header, including both desktop and mobile variants.
 * It manages internal state for toggling the mobile menu and allows optional injection of custom
 * navigation items.
 *
 * @param items - Optional list of navigation items to display.
 *   Falls back to `navItems` if not provided.
 * @returns A JSX element containing the navigation UI.
 */
export default function HeaderNav({ items }: HeaderNavProps): JSX.Element {
  const { isOpen, toggle, close } = useDisclosure(false, {
    onOpen: () => useLockBodyScroll(true),
    onClose: () => useLockBodyScroll(false),
  });
  useEscapeKey(isOpen, close);
  const resolvedItems = items ?? navItems;

  return (
    <>
      {/* Button to toggle mobile menu */}
      <ToggleButton isOpen={isOpen} setIsOpen={toggle} />

      {/* Static desktop menu, always rendered */}
      <DesktopNavList items={resolvedItems} />

      {/* Semi-transparent overlay behind the mobile menu; clicking it closes the menu */}
      {isOpen && <Overlay onClick={close} />}

      {/* Mobile navigation menu, visible when `isOpen` is true */}
      <MobileNavList isOpen={isOpen} items={resolvedItems} onToggle={close} />
    </>
  );
}

/**
 * Overlay component used to dim the background and capture clicks outside a modal or mobile nav.
 *
 * This component is typically rendered when a navigation menu or modal is open, and clicking it
 * triggers the `onClick` handler to close the corresponding UI.
 *
 * @param onClick - Function to call when the overlay is clicked (e.g., to close a menu).
 * @returns A visually hidden, clickable background layer element.
 */
function Overlay({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <div
      role="presentation"
      tabIndex={-1}
      aria-hidden="true"
      className="mobile-nav-overlay"
      onClick={onClick}
    />
  );
}
