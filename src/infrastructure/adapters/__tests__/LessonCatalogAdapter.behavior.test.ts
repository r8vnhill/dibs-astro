/**
 * Behavior tests for {@link LessonCatalogAdapter}.
 *
 * This suite exercises `findTrailByHref(...)` through a small set of representative hierarchy shapes. Its main goal is
 * to verify the breadcrumb-style trail returned by the adapter, including:
 *
 * - ancestor inclusion for nested lessons;
 * - omission of the synthetic `Notes` root by default;
 * - optional inclusion of that root when requested;
 * - href normalization for equivalent path variants; and
 * - rejection of blank href inputs.
 *
 * The fixtures are intentionally small and explicit. Each one models a different catalog shape so the expected trail
 * can be read directly from the test data.
 */

import { describe, expect, it } from "vitest";
import type { Lesson as DomainLesson } from "~/data/course-structure";
import { LessonCatalogAdapter } from "../LessonCatalogAdapter";

describe("LessonCatalogAdapter", () => {
    describe("findTrailByHref with grouped sections", () => {
        it("returns the authored nested catalog trail without the notes root by default", async () => {
            const testAdapter = adapterForAuthoredNestedTrail();
            const trail = await testAdapter.findTrailByHref(
                "/notes/scripting/tasks-as-abstractions/",
            );

            expect(trail).toEqual([
                { title: "Build Systems", href: "/notes/scripting/" },
                {
                    title: "Tasks as Abstractions",
                    href: "/notes/scripting/tasks-as-abstractions/",
                },
            ]);
        });

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
                rootId: "notes-root",
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

        it("prepends the Notes root when includeNotesRoot is true", async () => {
            const testAdapter = adapterForDeepNesting();
            const defaultTrail = await testAdapter.findTrailByHref(
                "/notes/unit-1/section-1a/lesson-1a1/",
            );
            const trail = await testAdapter.findTrailByHref(
                "/notes/unit-1/section-1a/lesson-1a1/",
                { includeNotesRoot: true },
            );

            expect(trail).toEqual([
                { title: "Notes", href: "/notes/" },
                ...defaultTrail,
            ]);
            expect(trail).toHaveLength(defaultTrail.length + 1);
        });

        it("excludes the Notes root when includeNotesRoot is false", async () => {
            const testAdapter = adapterForDeepNesting();
            const trail = await testAdapter.findTrailByHref(
                "/notes/unit-1/section-1a/lesson-1a1/",
                { includeNotesRoot: false },
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
                rootId: "notes",
                lessonId: "top-lesson",
            });
            const trail = await testAdapter.findTrailByHref("/notes/top-lesson/");

            expect(trail).toEqual([
                { title: "Top Level Lesson", href: "/notes/top-lesson/" },
            ]);
        });
    });
});

/**
 * Creates a lesson node for the test fixtures.
 *
 * This helper centralizes the small amount of shape variation needed by the test data:
 *
 * - `link` nodes always receive an `href`, defaulting to
 *   `/notes/${id}/` when none is provided;
 * - non-link nodes always receive a `children` array; and
 * - group-like nodes include `href` only when it is explicitly authored.
 *
 * The helper keeps the fixtures compact while still making the final structure predictable in each test.
 *
 * @param params Raw lesson fields used by the fixtures.
 * @param params.id Stable identifier for the lesson node.
 * @param params.title Human-readable lesson title.
 * @param params.kind Lesson kind taken from the domain model.
 * @param params.href Optional authored href.
 * @param params.children Optional child lessons.
 * @returns A {@link DomainLesson} shaped for the adapter tests.
 */
const lessonNode = ({
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
}): DomainLesson =>
    kind === "link"
        ? {
            id,
            title,
            kind,
            href: href ?? `/notes/${id}/`,
            ...(children ? { children } : {}),
        }
        : {
            id,
            title,
            kind,
            ...(href ? { href } : {}),
            children: children ?? [],
        };

/**
 * Wraps a lesson list in the synthetic top-level `Notes` root used by the catalog.
 *
 * Most adapter scenarios begin below this root, and the adapter normally omits it from the returned trail unless
 * explicitly requested through `includeNotesRoot`.
 *
 * @param children Lessons that should appear under the root.
 * @param options Optional root overrides used by a few targeted tests.
 * @param options.id Root identifier override.
 * @param options.href Root href override.
 * @returns A single-element lesson list containing the synthetic root.
 */
const wrapInNotesRoot = (
    children: readonly DomainLesson[],
    options: { id?: string; href?: string } = {},
): readonly DomainLesson[] => [
    lessonNode({
        id: options.id ?? "notes-root",
        title: "Notes",
        kind: "group",
        ...(options.href ? { href: options.href } : {}),
        children,
    }),
];

/**
 * Builds a nested catalog whose authored titles do not mirror the route segments.
 *
 * This fixture locks the basic `findTrailByHref(...)` contract: the returned trail must come from the authored catalog
 * tree, preserving titles and hrefs, instead of deriving labels from URL segments.
 *
 * @returns A nested catalog rooted under `Notes`.
 */
const makeAuthoredNestedTrailFixture = (): readonly DomainLesson[] =>
    wrapInNotesRoot([
        lessonNode({
            id: "scripting-group",
            title: "Build Systems",
            kind: "group",
            href: "/notes/scripting/",
            children: [
                lessonNode({
                    id: "task-abstractions",
                    title: "Tasks as Abstractions",
                    kind: "link",
                    href: "/notes/scripting/tasks-as-abstractions/",
                }),
            ],
        }),
    ]);

/**
 * Builds a catalog with two grouped sections.
 *
 * The fixture models two important ancestor behaviors:
 *
 * - `Section A` has no authored `href`, so it should appear in the trail as a plain, non-clickable ancestor;
 * - `Section B` has an authored `href`, so it should remain clickable in the returned trail.
 *
 * @returns A grouped catalog rooted under `Notes`.
 */
const makeGroupedSectionsFixture = (): readonly DomainLesson[] =>
    wrapInNotesRoot([
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

/**
 * Builds a three-level hierarchy for trail traversal tests.
 *
 * This fixture is used to verify:
 *
 * - multi-level ancestor discovery;
 * - root inclusion and omission behavior; and
 * - href normalization against a deeply nested canonical lesson path.
 *
 * @returns A deeply nested catalog rooted under `Notes`.
 */
const makeDeepNestingFixture = (): readonly DomainLesson[] =>
    wrapInNotesRoot([
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

/**
 * Builds a catalog containing a single top-level lesson below the root.
 *
 * This fixture isolates the case where no intermediate ancestors should appear in the returned trail.
 *
 * @param options Fixture options used to vary root and lesson ids.
 * @param options.rootId Identifier assigned to the synthetic root.
 * @param options.lessonId Identifier assigned to the top-level lesson.
 * @returns A catalog with one top-level lesson under `Notes`.
 */
const makeTopLevelLessonFixture = (options: {
    rootId: string;
    lessonId: string;
}): readonly DomainLesson[] =>
    wrapInNotesRoot(
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

/**
 * Creates an adapter backed by the grouped-sections fixture.
 *
 * @returns A {@link LessonCatalogAdapter} configured for grouped-section traversal scenarios.
 */
const adapterForGroupedSections = (): LessonCatalogAdapter =>
    new LessonCatalogAdapter(makeGroupedSectionsFixture());

/**
 * Creates an adapter backed by the authored nested trail fixture.
 *
 * @returns A {@link LessonCatalogAdapter} configured for the basic authored-trail contract.
 */
const adapterForAuthoredNestedTrail = (): LessonCatalogAdapter =>
    new LessonCatalogAdapter(makeAuthoredNestedTrailFixture());

/**
 * Creates an adapter backed by the deep-nesting fixture.
 *
 * @returns A {@link LessonCatalogAdapter} configured for nested traversal, root inclusion, and href-normalization
 *   scenarios.
 */
const adapterForDeepNesting = (): LessonCatalogAdapter =>
    new LessonCatalogAdapter(makeDeepNestingFixture());

/**
 * Creates an adapter backed by the top-level-lesson fixture.
 *
 * @param options Fixture options forwarded to {@link makeTopLevelLessonFixture}.
 * @returns A {@link LessonCatalogAdapter} configured for top-level lesson scenarios.
 */
const adapterForTopLevelLesson = (options: {
    rootId: string;
    lessonId: string;
}): LessonCatalogAdapter => new LessonCatalogAdapter(makeTopLevelLessonFixture(options));

/**
 * Produces href variants that should remain semantically equivalent for lookup purposes.
 *
 * These variants model the normalization behavior expected from `findTrailByHref(...)`:
 *
 * - extra query parameters;
 * - hash fragments;
 * - repeated slashes; and
 * - surrounding whitespace.
 *
 * The helper is intentionally small and explicit because the goal is to validate known normalization rules, not to
 * fuzz arbitrary malformed input.
 *
 * @param href Canonical lesson href.
 * @returns Equivalent href variants expected to resolve to the same trail.
 */
const noisyHrefVariants = (href: string): readonly string[] => [
    `${href}?section=intro&lang=es`,
    `${href}#section`,
    href.replace(/\//g, "//"),
    `  ${href}  `,
];
