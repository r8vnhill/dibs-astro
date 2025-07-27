import { useEffect } from 'preact/hooks';
import type { RefObject } from 'preact';

export function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T>,
  onClickOutside: () => void
): void {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClickOutside]);
}
