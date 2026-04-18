import { describe, expect, it } from "vitest";
import type { Lesson as DomainLesson } from "~/data/course-structure";
import { LessonCatalogAdapter } from "../LessonCatalogAdapter";

describe("LessonCatalogAdapter", () => {
    describe("findTrailByHref with grouped sections", () => {
        /**
         * Fixture for grouped-section trail behavior:
         * - Apuntes (root, no href)
         *   - Section A (group without href)
         *     - Lesson A1 (/notes/section-a/lesson-a1/)
         *   - Section B (group with href /notes/section-b/)
         *     - Lesson B1 (/notes/section-b/lesson-b1/)
         */
        it("returns a trail for a nested lesson with ancestors", async () => {
            const testAdapter = adapterForGroupedSections();
            const trail = await testAdapter.findTrailByHref("/notes/section-a/lesson-a1/");

            expect(trail).toHaveLength(2);
            expect(trail[0]!.title).toBe("Section A");
            expect(trail[0]!.href).toBeUndefined();
            expect(trail[1]!.title).toBe("Lesson A1");
            expect(trail[1]!.href).toBe("/notes/section-a/lesson-a1/");
        });

        it("returns only the current lesson for a top-level lesson", async () => {
            const testAdapter = adapterForTopLevelLesson({
                rootId: "apuntes-root",
                lessonId: "top-level",
            });
            const trail = await testAdapter.findTrailByHref("/notes/top-level/");

            expect(trail).toHaveLength(1);
            expect(trail[0]!.title).toBe("Top Level Lesson");
            expect(trail[0]!.href).toBe("/notes/top-level/");
        });

        it("returns an empty trail for a missing lesson", async () => {
            const testAdapter = adapterForGroupedSections();
            const trail = await testAdapter.findTrailByHref("/notes/does-not-exist/");

            expect(trail).toHaveLength(0);
        });

        it("includes a group with href in the trail", async () => {
            const testAdapter = adapterForGroupedSections();
            const trail = await testAdapter.findTrailByHref("/notes/section-b/lesson-b1/");

            expect(trail).toHaveLength(2);
            expect(trail[0]!.title).toBe("Section B");
            expect(trail[0]!.href).toBe("/notes/section-b/");
            expect(trail[1]!.title).toBe("Lesson B1");
            expect(trail[1]!.href).toBe("/notes/section-b/lesson-b1/");
        });
    });

    describe("findTrailByHref with deep nesting", () => {
        it("returns the exact trail for a three-level nested lesson", async () => {
            const testAdapter = adapterForDeepNesting();
            const trail = await testAdapter.findTrailByHref("/notes/unit-1/section-1a/lesson-1a1/");

            expect(trail).toEqual([
                { title: "Unit 1", href: "/notes/unit-1/" },
                { title: "Section 1A" },
                { title: "Lesson 1A1", href: "/notes/unit-1/section-1a/lesson-1a1/" },
            ]);
        });

        it("prepends the Apuntes root when includeApuntesRoot is true", async () => {
            const testAdapter = adapterForDeepNesting();
            const defaultTrail = await testAdapter.findTrailByHref(
                "/notes/unit-1/section-1a/lesson-1a1/",
            );
            const trail = await testAdapter.findTrailByHref(
                "/notes/unit-1/section-1a/lesson-1a1/",
                { includeApuntesRoot: true },
            );

            expect(trail).toEqual([
                { title: "Apuntes", href: "/notes/" },
                ...defaultTrail,
            ]);
            expect(trail).toHaveLength(defaultTrail.length + 1);
        });

        it("excludes the Apuntes root when includeApuntesRoot is false", async () => {
            const testAdapter = adapterForDeepNesting();
            const trail = await testAdapter.findTrailByHref(
                "/notes/unit-1/section-1a/lesson-1a1/",
                { includeApuntesRoot: false },
            );

            expect(trail).toEqual([
                { title: "Unit 1", href: "/notes/unit-1/" },
                { title: "Section 1A" },
                { title: "Lesson 1A1", href: "/notes/unit-1/section-1a/lesson-1a1/" },
            ]);
        });

        it("resolves noisy href variants to the same trail", async () => {
            const testAdapter = adapterForDeepNesting();
            const canonicalHref = "/notes/unit-1/section-1a/lesson-1a1/";
            const canonicalTrail = await testAdapter.findTrailByHref(canonicalHref);

            for (const variant of noisyHrefVariants(canonicalHref)) {
                const trail = await testAdapter.findTrailByHref(variant);
                expect(trail).toEqual(canonicalTrail);
            }
        });

        it("returns an empty trail for a missing lesson", async () => {
            const testAdapter = adapterForDeepNesting();
            const trail = await testAdapter.findTrailByHref("/notes/does-not-exist/");

            expect(trail).toEqual([]);
        });

        it.each(["", "   "])(
            "throws for an invalid href: %j",
            async (invalidHref) => {
                const testAdapter = adapterForDeepNesting();

                await expect(testAdapter.findTrailByHref(invalidHref)).rejects.toThrow(
                    "LessonHref cannot be empty",
                );
            },
        );

        it("returns only the current lesson for a first-level lesson", async () => {
            const testAdapter = adapterForTopLevelLesson({
                rootId: "apuntes",
                lessonId: "top-lesson",
            });
            const trail = await testAdapter.findTrailByHref("/notes/top-lesson/");

            expect(trail).toEqual([
                { title: "Top Level Lesson", href: "/notes/top-lesson/" },
            ]);
        });
    });
});

function lessonNode({
    id,
    title,
    kind,
    href,
    children,
}: {
    id: string;
    title: string;
    kind: DomainLesson["kind"];
    href?: string;
    children?: readonly DomainLesson[];
}): DomainLesson {
    if (kind === "link") {
        return {
            id,
            title,
            kind,
            href: href ?? `/notes/${id}/`,
            ...(children ? { children } : {}),
        };
    }

    return {
        id,
        title,
        kind,
        ...(href ? { href } : {}),
        children: children ?? [],
    };
}

function wrapInApuntesRoot(
    children: readonly DomainLesson[],
    options: { id?: string; href?: string } = {},
): readonly DomainLesson[] {
    return [
        lessonNode({
            id: options.id ?? "apuntes-root",
            title: "Apuntes",
            kind: "group",
            ...(options.href ? { href: options.href } : {}),
            children,
        }),
    ];
}

function makeGroupedSectionsFixture(): readonly DomainLesson[] {
    return wrapInApuntesRoot([
        lessonNode({
            id: "section-a",
            title: "Section A",
            kind: "group",
            children: [
                lessonNode({
                    id: "lesson-a1",
                    title: "Lesson A1",
                    kind: "link",
                    href: "/notes/section-a/lesson-a1/",
                }),
            ],
        }),
        lessonNode({
            id: "section-b",
            title: "Section B",
            kind: "group",
            href: "/notes/section-b/",
            children: [
                lessonNode({
                    id: "lesson-b1",
                    title: "Lesson B1",
                    kind: "link",
                    href: "/notes/section-b/lesson-b1/",
                }),
            ],
        }),
    ]);
}

function makeDeepNestingFixture(): readonly DomainLesson[] {
    return wrapInApuntesRoot([
        lessonNode({
            id: "unit-1",
            title: "Unit 1",
            kind: "group",
            href: "/notes/unit-1/",
            children: [
                lessonNode({
                    id: "section-1a",
                    title: "Section 1A",
                    kind: "group",
                    children: [
                        lessonNode({
                            id: "lesson-1a1",
                            title: "Lesson 1A1",
                            kind: "link",
                            href: "/notes/unit-1/section-1a/lesson-1a1/",
                        }),
                    ],
                }),
            ],
        }),
    ]);
}

function makeTopLevelLessonFixture(options: {
    rootId: string;
    lessonId: string;
}): readonly DomainLesson[] {
    return wrapInApuntesRoot(
        [
            lessonNode({
                id: options.lessonId,
                title: "Top Level Lesson",
                kind: "link",
                href: `/notes/${options.lessonId}/`,
            }),
        ],
        { id: options.rootId, href: "/notes/" },
    );
}

function adapterForGroupedSections(): LessonCatalogAdapter {
    return new LessonCatalogAdapter(makeGroupedSectionsFixture());
}

function adapterForDeepNesting(): LessonCatalogAdapter {
    return new LessonCatalogAdapter(makeDeepNestingFixture());
}

function adapterForTopLevelLesson(options: {
    rootId: string;
    lessonId: string;
}): LessonCatalogAdapter {
    return new LessonCatalogAdapter(makeTopLevelLessonFixture(options));
}

function noisyHrefVariants(href: string): readonly string[] {
    return [
        `${href}?section=intro&lang=es`,
        `${href}#section`,
        href.replace(/\//g, "//"),
        `  ${href}  `,
    ];
}
