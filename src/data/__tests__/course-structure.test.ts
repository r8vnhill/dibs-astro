import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    courseStructure,
    flattenLessons,
    type Lesson,
    validateCourseStructure,
    walkLessons,
} from "../course-structure";

describe("Course Structure Types & Validation", () => {
    /**
     * Data-Driven Tests (DDT): Test specific tree shapes and invariants.
     */
    describe("flattenLessons / walkLessons (DDT)", () => {
        it("should flatten a single link node", () => {
            const tree: readonly Lesson[] = [
                {
                    kind: "link",
                    id: "single",
                    title: "Single Link",
                    href: "/single/",
                },
            ];

            const flattened = flattenLessons(tree);

            expect(flattened).toHaveLength(1);
            expect(flattened[0]).toMatchObject({
                id: "single",
                depth: 0,
                parents: [],
                parentIds: [],
            });
        });

        it("should flatten a deep chain (single path)", () => {
            const tree: readonly Lesson[] = [
                {
                    kind: "link",
                    id: "a",
                    title: "A",
                    href: "/a/",
                    children: [
                        {
                            kind: "link",
                            id: "b",
                            title: "B",
                            href: "/b/",
                            children: [
                                {
                                    kind: "link",
                                    id: "c",
                                    title: "C",
                                    href: "/c/",
                                },
                            ],
                        },
                    ],
                },
            ];

            const flattened = flattenLessons(tree);

            expect(flattened).toHaveLength(3);
            expect(flattened[0]?.depth).toBe(0);
            expect(flattened[1]?.depth).toBe(1);
            expect(flattened[2]?.depth).toBe(2);

            expect(flattened[1]?.parents).toEqual(["A"]);
            expect(flattened[1]?.parentIds).toEqual(["a"]);

            expect(flattened[2]?.parents).toEqual(["A", "B"]);
            expect(flattened[2]?.parentIds).toEqual(["a", "b"]);
        });

        it("should flatten wide siblings in pre-order", () => {
            const tree: readonly Lesson[] = [
                {
                    kind: "group",
                    id: "parent",
                    title: "Parent",
                    children: [
                        {
                            kind: "link",
                            id: "child1",
                            title: "Child 1",
                            href: "/child1/",
                        },
                        {
                            kind: "link",
                            id: "child2",
                            title: "Child 2",
                            href: "/child2/",
                        },
                        {
                            kind: "link",
                            id: "child3",
                            title: "Child 3",
                            href: "/child3/",
                        },
                    ],
                },
            ];

            const flattened = flattenLessons(tree);

            expect(flattened).toHaveLength(4);
            expect(flattened.map((l) => l.id)).toEqual([
                "parent",
                "child1",
                "child2",
                "child3",
            ]);

            // All children at same depth and parentage
            expect(flattened[1]?.depth).toBe(1);
            expect(flattened[2]?.depth).toBe(1);
            expect(flattened[3]?.depth).toBe(1);
        });

        it("should handle group with optional href (overview page)", () => {
            const tree: readonly Lesson[] = [
                {
                    kind: "group",
                    id: "group-with-overview",
                    title: "Unit",
                    href: "/unit/",
                    children: [
                        {
                            kind: "link",
                            id: "lesson1",
                            title: "Lesson 1",
                            href: "/unit/lesson1/",
                        },
                    ],
                },
            ];

            const flattened = flattenLessons(tree);

            expect(flattened).toHaveLength(2);
            expect(flattened[0]?.kind).toBe("group");
            expect(flattened[0]?.href).toBe("/unit/");
            expect(flattened[1]?.kind).toBe("link");
        });

        it("should flatten link with children (pages with subpages)", () => {
            const tree: readonly Lesson[] = [
                {
                    kind: "link",
                    id: "page",
                    title: "Page with Subpages",
                    href: "/page/",
                    children: [
                        {
                            kind: "link",
                            id: "subpage",
                            title: "Subpage",
                            href: "/page/subpage/",
                        },
                    ],
                },
            ];

            const flattened = flattenLessons(tree);

            expect(flattened).toHaveLength(2);
            expect(flattened[0]?.kind).toBe("link");
            // Children in the first entry point to the original input children
            expect(flattened[0]?.children?.[0]?.id).toBe("subpage");
            expect(flattened[1]?.parents).toEqual(["Page with Subpages"]);
        });

        it("should preserve pre-order traversal with complex tree", () => {
            const tree: readonly Lesson[] = [
                {
                    kind: "group",
                    id: "unit",
                    title: "Unit",
                    children: [
                        {
                            kind: "link",
                            id: "lesson1",
                            title: "Lesson 1",
                            href: "/lesson1/",
                        },
                        {
                            kind: "group",
                            id: "subunit",
                            title: "Subunit",
                            children: [
                                {
                                    kind: "link",
                                    id: "sublesson1",
                                    title: "Sublesson 1",
                                    href: "/sublesson1/",
                                },
                                {
                                    kind: "link",
                                    id: "sublesson2",
                                    title: "Sublesson 2",
                                    href: "/sublesson2/",
                                },
                            ],
                        },
                        {
                            kind: "link",
                            id: "lesson2",
                            title: "Lesson 2",
                            href: "/lesson2/",
                        },
                    ],
                },
            ];

            const flattened = flattenLessons(tree);

            const ids = flattened.map((l) => l.id);
            expect(ids).toEqual([
                "unit",
                "lesson1",
                "subunit",
                "sublesson1",
                "sublesson2",
                "lesson2",
            ]);
        });

        it("should return immutable (frozen) arrays", () => {
            const tree: readonly Lesson[] = [
                {
                    kind: "link",
                    id: "link1",
                    title: "Link",
                    href: "/link/",
                },
            ];

            const flattened = flattenLessons(tree);

            expect(Object.isFrozen(flattened)).toBe(true);
        });
    });

    describe("Validation", () => {
        it("should pass validation for courseStructure", () => {
            expect(() => {
                validateCourseStructure(courseStructure);
            }).not.toThrow();
        });

        it("should reject duplicate IDs", () => {
            const invalid: readonly Lesson[] = [
                {
                    kind: "link",
                    id: "dup",
                    title: "First",
                    href: "/first/",
                },
                {
                    kind: "link",
                    id: "dup",
                    title: "Second",
                    href: "/second/",
                },
            ];

            expect(() => {
                validateCourseStructure(invalid);
            }).toThrow(/Duplicate lesson ID/);
        });

        it("should reject duplicate hrefs", () => {
            const invalid: readonly Lesson[] = [
                {
                    kind: "link",
                    id: "a",
                    title: "First",
                    href: "/same/",
                },
                {
                    kind: "link",
                    id: "b",
                    title: "Second",
                    href: "/same/",
                },
            ];

            expect(() => {
                validateCourseStructure(invalid);
            }).toThrow(/Duplicate href/);
        });

        it("should reject hrefs without trailing slashes", () => {
            const invalid: readonly Lesson[] = [
                {
                    kind: "link",
                    id: "no-slash",
                    title: "No Slash",
                    href: "/no-slash",
                },
            ];

            expect(() => {
                validateCourseStructure(invalid);
            }).toThrow(/must end with trailing slash/);
        });

        it("should reject empty groups", () => {
            const invalid: readonly Lesson[] = [
                {
                    kind: "group",
                    id: "empty",
                    title: "Empty",
                    children: [],
                },
            ];

            expect(() => {
                validateCourseStructure(invalid);
            }).toThrow(/no children/);
        });

        it("should detect nested violations", () => {
            const invalid: readonly Lesson[] = [
                {
                    kind: "group",
                    id: "parent",
                    title: "Parent",
                    children: [
                        {
                            kind: "link",
                            id: "dup",
                            title: "First Child",
                            href: "/first/",
                        },
                        {
                            kind: "link",
                            id: "dup",
                            title: "Second Child",
                            href: "/second/",
                        },
                    ],
                },
            ];

            expect(() => {
                validateCourseStructure(invalid);
            }).toThrow(/Duplicate lesson ID/);
        });
    });

    /**
     * Property-Based Tests (PBT): Use fast-check to generate random trees and verify invariants.
     */
    describe("Invariants (Property-Based with fast-check)", () => {
        /**
         * Arbitraries for generating lesson trees.
         */
        const arbLinkLesson = (): fc.Arbitrary<Lesson> =>
            fc
                .tuple(
                    fc.string({ minLength: 4, maxLength: 10 }).map((s) =>
                        s.toLowerCase().replace(/[^a-z0-9]/g, "_")
                    ),
                    fc.lorem({ maxCount: 3, mode: "words" }),
                    fc.lorem({ maxCount: 2, mode: "words" }),
                )
                .map(([id, title, path]) => ({
                    kind: "link" as const,
                    id: id.slice(0, 10) || "id_default",
                    title: title.charAt(0).toUpperCase()
                        + title.slice(1),
                    href: `/${
                        path
                            .toLowerCase()
                            .replace(/\s+/g, "-")
                            .replace(/[^a-z0-9-]/g, "")
                    }/`,
                }));

        const arbGroupLesson = (): fc.Arbitrary<Lesson> =>
            fc
                .tuple(
                    fc.string({ minLength: 4, maxLength: 10 }).map((s) =>
                        s.toLowerCase().replace(/[^a-z0-9]/g, "_")
                    ),
                    fc.lorem({ maxCount: 3, mode: "words" }),
                    fc.array(arbLinkLesson(), { minLength: 1, maxLength: 3 }),
                )
                .map(([id, title, children]) => ({
                    kind: "group" as const,
                    id: id.slice(0, 10) || "grp_default",
                    title: title.charAt(0).toUpperCase()
                        + title.slice(1),
                    children,
                }));

        const arbLesson = (): fc.Arbitrary<Lesson> => fc.oneof(arbLinkLesson(), arbGroupLesson());

        const arbShallowTree = (): fc.Arbitrary<readonly Lesson[]> =>
            fc.array(arbLesson(), { minLength: 1, maxLength: 5 });

        it("should flatten without mutation", () => {
            fc.assert(
                fc.property(arbShallowTree(), (tree) => {
                    const original = JSON.parse(JSON.stringify(tree));
                    flattenLessons(tree);
                    expect(tree).toStrictEqual(original);
                }),
            );
        });

        it("should not lose nodes during flattening", () => {
            fc.assert(
                fc.property(arbShallowTree(), (tree) => {
                    const flattened = flattenLessons(tree);

                    // Count all nodes in original tree
                    function countNodes(lessons: readonly Lesson[]): number {
                        return lessons.reduce(
                            (sum, lesson) =>
                                sum
                                + 1
                                + (lesson.children
                                    ? countNodes(lesson.children)
                                    : 0),
                            0,
                        );
                    }

                    expect(flattened).toHaveLength(countNodes(tree));
                }),
            );
        });

        it("should maintain pre-order: parents before children", () => {
            fc.assert(
                fc.property(arbShallowTree(), (tree) => {
                    const flattened = flattenLessons(tree);
                    const idToIndex = new Map(
                        flattened.map((l, i) => [l.id, i]),
                    );

                    for (const lesson of flattened) {
                        if (lesson.children?.length) {
                            const parentIdx = idToIndex.get(lesson.id)!;
                            for (const child of lesson.children) {
                                const childIdx = idToIndex.get(child.id)!;
                                expect(parentIdx).toBeLessThan(childIdx);
                            }
                        }
                    }
                }),
            );
        });

        it("should correctly set depth and parents", () => {
            fc.assert(
                fc.property(arbShallowTree(), (tree) => {
                    const flattened = flattenLessons(tree);

                    for (const lesson of flattened) {
                        // Depth and parents length should match
                        expect(lesson.parents).toHaveLength(lesson.depth);
                        expect(lesson.parentIds).toHaveLength(lesson.depth);

                        // At depth 0, parents should be empty
                        if (lesson.depth === 0) {
                            expect(lesson.parents).toHaveLength(0);
                            expect(lesson.parentIds).toHaveLength(0);
                        }
                    }
                }),
            );
        });

        it("should maintain ancestry path integrity", () => {
            fc.assert(
                fc.property(arbShallowTree(), (tree) => {
                    const flattened = flattenLessons(tree);

                    for (const lesson of flattened) {
                        // All ancestors should exist in the flattened array
                        for (const ancestorId of lesson.parentIds) {
                            const found = flattened.some(
                                (l) => l.id === ancestorId,
                            );
                            expect(found).toBe(true);
                        }

                        // Parent IDs and parent titles should correspond
                        if (lesson.depth > 0) {
                            const parentId = lesson.parentIds[
                                lesson.parentIds.length - 1
                            ]!;
                            const parentTitle = lesson.parents[lesson.parents.length - 1];

                            const parent = flattened.find(
                                (l) => l.id === parentId,
                            );
                            expect(parent?.title).toBe(parentTitle);
                        }
                    }
                }),
            );
        });

        it("should have consistent id, title, href across entries", () => {
            fc.assert(
                fc.property(arbShallowTree(), (tree) => {
                    const flattened = flattenLessons(tree);

                    for (const lesson of flattened) {
                        expect(lesson.id).toBeTruthy();
                        expect(lesson.title).toBeTruthy();
                        expect(lesson.kind).toMatch(/^(link|group)$/);

                        if (lesson.kind === "link") {
                            expect(lesson.href).toBeTruthy();
                            expect(lesson.href).toMatch(/\/$/);
                        }
                    }
                }),
            );
        });
    });

    /**
     * Integration: Real courseStructure
     */
    describe("Real Course Structure", () => {
        it("should have more than zero lessons", () => {
            const flattened = flattenLessons(courseStructure);
            expect(flattened.length).toBeGreaterThan(0);
        });

        it("should have unique IDs across flattened structure", () => {
            const flattened = flattenLessons(courseStructure);
            const ids = flattened.map((l) => l.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(ids.length);
        });

        it("should have unique hrefs across flattened structure", () => {
            const flattened = flattenLessons(courseStructure);
            const hrefs = flattened
                .filter((l) => l.href)
                .map((l) => l.href!);
            const uniqueHrefs = new Set(hrefs);

            expect(uniqueHrefs.size).toBe(hrefs.length);
        });

        it("should maintain depth consistency with hierarchy depth", () => {
            const flattened = flattenLessons(courseStructure);
            const maxDepth = Math.max(...flattened.map((l) => l.depth));

            // Verify structure: at each depth level, parents exists
            for (let d = 0; d <= maxDepth; d++) {
                const atDepth = flattened.filter((l) => l.depth === d);
                const atPrevDepth = flattened.filter((l) => l.depth === d - 1);

                if (d > 0) {
                    expect(atPrevDepth.length).toBeGreaterThan(0);
                }

                for (const lesson of atDepth) {
                    if (d > 0) {
                        expect(lesson.parents.length).toBe(d);
                        expect(lesson.parentIds.length).toBe(d);
                    }
                }
            }
        });

        it("walkLessons generator should produce same result as flattenLessons", () => {
            const fromGenerator = Array.from(
                walkLessons(courseStructure),
            );
            const fromFlatten = flattenLessons(courseStructure);

            expect(fromGenerator).toEqual(Array.from(fromFlatten));
        });
    });
});
