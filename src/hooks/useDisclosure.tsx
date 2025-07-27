import { useCallback, useEffect, useState } from 'preact/hooks';

/**
 * Represents the return type of the `useDisclosure` hook.
 *
 * This type provides a simple interface for managing a binary open/closed state, commonly used for
 * toggling UI components like modals, drawers, menus, or dropdowns.
 */
type UseDisclosureReturn = {
  /** Whether the disclosure state is currently open */
  isOpen: boolean;

  /** Opens the disclosure (sets `isOpen` to `true`) */
  open: () => void;

  /** Closes the disclosure (sets `isOpen` to `false`) */
  close: () => void;

  /** Toggles the disclosure (switches `isOpen` between `true` and `false`) */
  toggle: () => void;
};

/**
 * A reusable hook to manage open/closed UI state.
 *
 * @param defaultOpen Whether to start open
 * @param options Optional lifecycle callbacks
 */
export function useDisclosure(
  defaultOpen = false,
  options?: {
    onOpen?: () => void;
    onClose?: () => void;
  }
) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    if (isOpen) options?.onOpen?.();
    else options?.onClose?.();
  }, [isOpen]);

  return { isOpen, open, close, toggle } satisfies UseDisclosureReturn;
}
