import clsx from 'clsx';
import { Sun, Moon, Monitor } from 'lucide-preact';
import type { JSX } from 'preact/jsx-runtime';
import type { Theme } from '~/utils';

/**
 * CSS class string used for styling icon elements with inline display, height of 1rem (h-4), and
 * width of 1rem (w-4).
 */
const ICON_CLASS = 'inline h-4 w-4';

/**
 * Represents a mapping of each `Theme` to its display options.
 * Each theme key is associated with an object containing a `label` (display name) and an `icon`
 * (JSX element representing the theme visually).
 *
 * @template Theme - The set of possible theme keys.
 */
export type ThemeOptions = {
  [key in Theme]: { label: string; icon: JSX.Element };
};

/**
 * An object mapping theme keys to their respective display options.
 */
export const themeOptions: ThemeOptions = {
  light: { label: 'Claro', icon: <Sun class={ICON_CLASS} /> },
  dark: { label: 'Oscuro', icon: <Moon class={ICON_CLASS} /> },
  auto: { label: 'Auto', icon: <Monitor class={ICON_CLASS} /> },
};
