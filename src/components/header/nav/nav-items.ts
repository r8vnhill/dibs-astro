/**
 * Represents a single navigation item used in the site's header.
 *
 * Each item defines a destination URL (`href`) and a human-readable label (`label`) to be rendered
 * as a link.
 * This interface ensures consistent structure across all navigation items.
 */
export interface NavItem {
  /** Destination URL for the navigation link (e.g., "/notes"). */
  href: string;

  /** Text label displayed to the user (e.g., "Apuntes"). */
  label: string;
}

/**
 * Navigation items for the main header menu.
 *
 * This array defines the structure of the primary navigation links and is intended to be consumed
 * by components such as `<Header />` or `<NavToggle />`.
 */
export const navItems: NavItem[] = [
  { href: '/', label: 'Inicio' },
  { href: '/notes/', label: 'Apuntes' },
  { href: '/lessons/', label: 'Clases' },
  { href: '/syllabus/', label: 'Temario' },
  { href: '/assignments/', label: 'Tareas' },
];
