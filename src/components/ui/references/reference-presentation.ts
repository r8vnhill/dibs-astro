/**
 * Describes where a reference is rendered, rather than what the bibliography entry means.
 *
 * `default` preserves ordinary bibliography presentation. `guided` adds the structural hook and restrained surface
 * used by reading guides; it never changes canonical reference data or links.
 */
export type ReferencePresentation = "default" | "guided";

type ReferenceListItemProps = Readonly<{
    class: string;
    "data-guided-reference"?: "true";
}>;

const guidedSurfaceClasses = "rounded-lg border border-base-border/70 bg-base-background/60 p-4 sm:p-5";

/**
 * Builds root attributes shared by every typed reference renderer.
 *
 * Centralizing this mapping prevents `Book`, `ScholarlyArticle`, `WebPage`, `Video`, and `Thesis` from drifting
 * apart. The caller supplies only the type-specific layout classes that already belong to its renderer.
 */
export function referenceListItemProps(
    presentation: ReferencePresentation,
    baseClasses: string,
): ReferenceListItemProps {
    const className = presentation === "guided"
        ? `${baseClasses} ${guidedSurfaceClasses}`
        : baseClasses;

    return presentation === "guided"
        ? { class: className, "data-guided-reference": "true" }
        : { class: className };
}
