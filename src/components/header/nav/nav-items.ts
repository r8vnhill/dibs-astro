// nav-items.ts
import type { JSX } from "react";

export type NavIcon = (props: {
    className?: string;
    "aria-hidden"?: boolean;
}) => JSX.Element;

export interface NavItem {
    label: string;
    href?: string;
    target?: string;
    id?: string;
    active?: boolean;
    disabled?: boolean;
    icon?: NavIcon;
}

/**
 * Navigation items for the main header menu.
 *
 * This array defines the structure of the primary navigation links and is intended to be consumed
 * by components such as `<Header />` or `<NavToggle />`.
 */
export const navItems: NavItem[] = [
    { href: "/", label: "Inicio" },
    { href: "/notes/", label: "Apuntes" },
    { href: "/lessons/", label: "Clases" },
    { href: "/syllabus/", label: "Temario" },
    { href: "/assignments/", label: "Tareas" },
];
