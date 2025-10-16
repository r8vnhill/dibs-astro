/**
 * HeaderNav.tsx
 * --------------
 * Responsive navigation controller for the site header.
 *
 * Responsibilities:
 * - Manages "mobile menu" open/close state (via `useDisclosure`).
 * - Closes on Escape key (via `useEscapeKey`).
 * - Locks body scroll while the mobile menu is open to prevent background scroll.
 * - Renders Desktop and Mobile nav lists using a shared `NavItem[]` model.
 *
 * Notes:
 * - `items` can be overridden via props; otherwise defaults to the internal `navItems` list.
 * - This component only handles UI state; actual navigation items live in `./nav-items`.
 */
import { type JSX, useEffect } from "react";
import { useDisclosure, useEscapeKey, useLockBodyScroll } from "~/hooks";
import { DesktopNavList } from "./DesktopNavList";
import { MobileNavList } from "./MobileNavList";
import { type NavItem, navItems } from "./nav-items";
import { ToggleButton } from "./ToggleButton";

export interface HeaderNavProps {
    items?: NavItem[];
}

/**
 * Header navigation wrapper that orchestrates the desktop and mobile menus.
 *
 * - Mobile menu state is internal (uncontrolled).
 * - Provide `items` to supply a custom nav model; defaults to `navItems`.
 */
export default function HeaderNav({ items }: HeaderNavProps): JSX.Element {
    const { isOpen, toggle, close } = useDisclosure(false);
    // Close the mobile menu with the Escape key for accessibility
    useEscapeKey(isOpen, close);

    // Lock body scroll when mobile menu is open
    useLockBodyScroll(isOpen);

    // Side effects: logging open/close transitions
    useEffect(() => {
        if (isOpen) {
            console.log("Mobile menu opened");
        } else {
            console.log("Mobile menu closed");
        }
    }, [isOpen]);

    const resolvedItems = items ?? navItems;

    return (
        <>
            {/* Hamburger / close toggle for small screens */}
            <ToggleButton isOpen={isOpen} toggle={toggle} />

            {/* Persistent desktop navigation */}
            <DesktopNavList items={resolvedItems} />

            {/* Dimmed overlay catches outside clicks to close the mobile menu */}
            {isOpen && <Overlay onClick={close} />}

            {/* Slide-in mobile navigation */}
            <MobileNavList isOpen={isOpen} items={resolvedItems} onItemSelect={close} />
        </>
    );
}

/**
 * Full-screen, click-to-dismiss overlay shown behind the mobile nav.
 *
 * Accessibility:
 * - `role="presentation"` as it is purely decorative/click-capture.
 * - `aria-hidden` hides it from assistive tech.
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
