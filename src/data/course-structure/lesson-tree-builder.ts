import type { Lesson } from "../course-structure";

/**
 * Fluent builder for constructing small lesson subtrees inside `src/data/course-structure/`.
 *
 * The builder exists to keep course modules readable while still producing the exact
 * `Lesson` shape consumed by the public `course-structure` facade. It is intentionally internal:
 *
 * - callers build a local subtree with chained `link` and `group` calls;
 * - nested groups are composed from another `LessonTreeBuilder().build()` result;
 * - `build()` freezes only the top-level collection, matching the semantics expected by tests.
 */
export class LessonTreeBuilder {
    private lessons: Lesson[] = [];

    private createLink(
        id: string,
        title: string,
        href: string,
        children?: readonly Lesson[],
    ): Lesson {
        return {
            kind: "link",
            id,
            title,
            href,
            ...(children?.length ? { children } : {}),
        };
    }

    private createGroup(
        id: string,
        title: string,
        children: readonly Lesson[],
        href?: string,
    ): Lesson {
        return {
            kind: "group",
            id,
            title,
            children,
            ...(href ? { href } : {}),
        };
    }

    link(
        id: string,
        title: string,
        href: string,
        children?: readonly Lesson[],
    ): LessonTreeBuilder {
        this.lessons.push(this.createLink(id, title, href, children));
        return this;
    }

    /**
     * Appends a structural group entry to the current subtree.
     *
     * Groups receive their descendants as a prebuilt `readonly Lesson[]`, which keeps nested tree
     * construction explicit at the call site and avoids mixing builder instances implicitly.
     */
    group(
        id: string,
        title: string,
        children: readonly Lesson[],
        href?: string,
    ): LessonTreeBuilder {
        this.lessons.push(this.createGroup(id, title, children, href));
        return this;
    }

    /**
     * Finalizes the current subtree.
     *
     * The returned array is frozen to prevent accidental structural mutation after composition.
     */
    build(): readonly Lesson[] {
        return Object.freeze([...this.lessons]);
    }
}
