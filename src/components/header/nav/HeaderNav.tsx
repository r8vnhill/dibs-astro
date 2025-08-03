import { useEffect, type JSX } from "react";
import { DesktopNavList } from "./DesktopNavList";
import { MobileNavList } from "./MobileNavList";
import { navItems, type NavItem } from "./nav-items";
import { ToggleButton } from "./ToggleButton";
import { useDisclosure, useEscapeKey } from "~/hooks";
import { useLockBodyScroll } from "~/hooks"; // suponiendo que está exportado desde allí

export interface HeaderNavProps {
  items?: NavItem[];
}

export default function HeaderNav({ items }: HeaderNavProps): JSX.Element {
  const { isOpen, toggle, close } = useDisclosure(false);
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
      <ToggleButton isOpen={isOpen} toggle={toggle} />

      <DesktopNavList items={resolvedItems} />

      {isOpen && <Overlay onClick={close} />}

      <MobileNavList isOpen={isOpen} items={resolvedItems} onToggle={close} />
    </>
  );
}

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
