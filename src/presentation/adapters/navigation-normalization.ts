import { LessonHref } from "@ravenhill/content-core";

export type NavigationLinkInput = Readonly<{
    title: string;
    href: string;
}>;

function normalizeHref(href: string): string {
    return LessonHref.create(href).value;
}

export function normalizeNavigationLink(
    link: NavigationLinkInput | undefined,
): NavigationLinkInput | undefined {
    return link
        ? { ...link, href: normalizeHref(link.href) }
        : undefined;
}

export function normalizePreviousNavigation(
    previous: NavigationLinkInput | readonly NavigationLinkInput[] | undefined,
): readonly NavigationLinkInput[] {
    if (!previous) return [];

    const links = Array.isArray(previous) ? previous : [previous];
    return links.map((link) => ({ ...link, href: normalizeHref(link.href) }));
}

export function normalizeNavigation(
    next: NavigationLinkInput | undefined,
    previous: NavigationLinkInput | undefined,
) {
    return {
        normalizedNext: normalizeNavigationLink(next),
        normalizedPrevious: normalizeNavigationLink(previous),
    };
}
