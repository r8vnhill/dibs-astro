export type NavigationNode = Readonly<{
    title: string;
    slug: string;
    href: string;
}>;

export type AutoNavigationNode = Readonly<{
    title: string;
    href: string;
}>;

export type NavigationResult = Readonly<{
    previous?: AutoNavigationNode;
    next?: AutoNavigationNode;
}>;

export interface INavigationService {
    resolveAutoNav(pathname: string): Promise<NavigationResult>;
}

export type TrailNode = Readonly<{
    title: string;
    href?: string;
}>;
