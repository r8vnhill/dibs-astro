import { useEffect, useState } from 'preact/hooks';
import { navItems, type NavItem } from './nav-items';
import { DesktopNavList } from './DesktopNavList';
import { ToggleButton } from './ToggleButton';
import { MobileNavList } from './MobileNavList';

export default function HeaderNav({ items = navItems }: { items?: NavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
  }, [isOpen]);

  return (
    <>
      <ToggleButton isOpen={isOpen} setIsOpen={setIsOpen} />
      <DesktopNavList items={items} />

      {isOpen && (
        <div
          role="presentation"
          tabIndex={-1}
          aria-hidden="true"
          className="mobile-nav-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <MobileNavList isOpen={isOpen} items={items} onItemClick={() => setIsOpen(false)} />
    </>
  );
}
