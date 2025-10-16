import clsx from "clsx";
import { type JSX, memo, useCallback } from "react";
import type { NavItem } from "./nav-items";

type NavListProps = {
    isOpen: boolean;
    items: NavItem[];
    onItemSelect?: (item: NavItem) => void;
    /** Optionally pass the id of the control (e.g., the hamburger button) for aria-controls symmetry */
    controllerId?: string;
    /** Optional className to extend styling */
    className?: string;
};

type MobileNavItemProps = Readonly<{
    item: NavItem;
    onSelect?: (item: NavItem) => void;
}>;

const MobileNavItem = memo(function MobileNavItem({ item, onSelect }: MobileNavItemProps) {
    const handleClick = useCallback(() => onSelect?.(item), [onSelect, item]);

    // External links: set rel when target=_blank
    const rel = item.target === "_blank" ? "noopener noreferrer" : undefined;

    return (
        <li key={item.id ?? `${item.href ?? ""}::${item.label}`}>
            <a
                href={item.href}
                onClick={handleClick}
                target={item.target}
                rel={rel}
                aria-current={item.active ? "page" : undefined}
                className={clsx(
                    "block rounded-xl px-4 py-3",
                    "focus:outline-none focus-visible:ring focus-visible:ring-primary/40",
                    "hover:bg-muted/60",
                    item.disabled
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer",
                )}
            >
                <span className="inline-flex items-center gap-2">
                    {item.icon ? <item.icon className="size-4" aria-hidden /> : null}
                    <span>{item.label}</span>
                </span>
            </a>
        </li>
    );
});

export function MobileNavList({
    isOpen,
    items,
    onItemSelect,
    controllerId,
    className,
}: NavListProps): JSX.Element | null {
    // Don’t keep focusable links in the tree when closed
    if (!isOpen) return null;

    return (
        <nav
            aria-label="Mobile navigation"
            aria-controls={controllerId}
            className={clsx("md:hidden", className)}
        >
            <ul
                id="mainNavMobile"
                data-state={isOpen ? "open" : "closed"}
                aria-hidden={!isOpen}
                className={clsx(
                    // container
                    "w-full space-y-1 rounded-2xl bg-background/95 p-2 shadow-lg ring-1 ring-border/60 backdrop-blur",
                    // animation
                    "transition-[transform,opacity] duration-200 ease-out",
                    "data-[state=closed]:pointer-events-none data-[state=closed]:-translate-y-2 data-[state=closed]:opacity-0",
                    "data-[state=open]:translate-y-0 data-[state=open]:opacity-100",
                    // reduce motion
                    "motion-reduce:transition-none",
                )}
            >
                {items.map((item) => (
                    <MobileNavItem
                        key={item.id ?? `${item.href ?? ""}::${item.label}`}
                        item={item}
                        {...(onItemSelect && { onSelect: onItemSelect })}
                    />
                ))}
            </ul>
        </nav>
    );
}
