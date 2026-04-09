/**
 * Behavioral and property-based tests for {@link LessonSequenceService}.
 *
 * This file verifies the domain-level contract for resolving adjacent lessons within an ordered
 * sequence of navigation nodes.
 *
 * The suite is intentionally split into two complementary parts:
 *
 * - a behavioral specification that checks representative examples and edge cases using
 *   example-based tests;
 * - a property-based specification that validates invariants across a broader range of generated
 *   inputs.
 *
 * ## Behavior covered
 *
 * ### The example-based suite checks:
 *
 * - adjacency lookup in a canonical lesson sequence;
 * - boundary cases such as empty lists, single-item lists, and missing targets;
 * - path normalization when either the target path or stored lesson hrefs are non-canonical.
 *
 * ### The property-based suite checks:
 *
 * - returned neighbors always come from the original input list;
 * - previous and next lessons are never the same node;
 * - `isEmpty()` matches the absence of both neighbors;
 * - equivalent normalized targets produce equivalent results.
 */

import { LessonSequenceService } from "$domain/services/LessonSequenceService";
import { type NavigationNode } from "$domain/value-objects/AdjacentLessons";
import fc from "fast-check";
import { describe, expect, suite, test } from "vitest";

suite("LessonSequenceService", () => {
    /**
     * Creates a compact navigation-node fixture for test scenarios.
     *
     * The helper keeps test setup small so examples can focus on the behavior being exercised
     * rather than on repetitive object construction.
     *
     * @param slug Lesson slug used both as the node slug and as part of the default href.
     * @param href Optional href override for scenarios involving non-canonical paths.
     * @returns Minimal {@link NavigationNode} fixture.
     */
    const lesson = (slug: string, href = `/notes/${slug}/`): NavigationNode => ({
        title: `Lesson ${slug.toUpperCase()}`,
        slug,
        href,
    });

    /**
     * Canonical three-lesson sequence reused by most example-based scenarios.
     */
    const lessons: readonly NavigationNode[] = [
        lesson("a"),
        lesson("b"),
        lesson("c"),
    ];

    /**
     * Identity normalizer used when the test scenario does not require path transformation.
     */
    const identity = (href: string) => href;

    /**
     * Normalizer that collapses repeated slashes into a single slash.
     */
    const collapseSlashes = (href: string) => href.replace(/\/{2,}/g, "/");

    /**
     * Normalizer that lowercases the path and collapses repeated slashes.
     */
    const normalizeCaseAndSlashes = (href: string) =>
        href.toLowerCase().replace(/\/{2,}/g, "/");

    describe("given a canonical lesson sequence", () => {
        test.each([
            {
                name: "the first lesson",
                target: "/notes/a/",
                expectedPrevious: undefined,
                expectedNext: "b",
            },
            {
                name: "a middle lesson",
                target: "/notes/b/",
                expectedPrevious: "a",
                expectedNext: "c",
            },
            {
                name: "the last lesson",
                target: "/notes/c/",
                expectedPrevious: "b",
                expectedNext: undefined,
            },
        ])(
            "returns the correct adjacent lessons for $name",
            ({ target, expectedPrevious, expectedNext }) => {
                const result = LessonSequenceService.findAdjacent(
                    lessons,
                    target,
                    identity,
                );

                expect(result.previous?.slug).toBe(expectedPrevious);
                expect(result.next?.slug).toBe(expectedNext);
            },
        );

        test("returns two distinct adjacent lessons for a middle lesson", () => {
            const result = LessonSequenceService.findAdjacent(
                lessons,
                "/notes/b/",
                identity,
            );

            expect(result.previous?.slug).toBe("a");
            expect(result.next?.slug).toBe("c");
            expect(result.previous?.slug).not.toBe(result.next?.slug);
        });
    });

    describe("given an empty lesson list", () => {
        test("returns no adjacent lessons", () => {
            const result = LessonSequenceService.findAdjacent(
                [],
                "/notes/a/",
                identity,
            );

            expect(result.previous).toBeUndefined();
            expect(result.next).toBeUndefined();
            expect(result.isEmpty()).toBe(true);
        });
    });

    describe("given a single-lesson list", () => {
        test("returns no adjacent lessons for the only lesson", () => {
            const result = LessonSequenceService.findAdjacent(
                [lesson("a")],
                "/notes/a/",
                identity,
            );

            expect(result.previous).toBeUndefined();
            expect(result.next).toBeUndefined();
            expect(result.isEmpty()).toBe(true);
        });
    });

    describe("given a target that does not exist", () => {
        test("returns no adjacent lessons", () => {
            const result = LessonSequenceService.findAdjacent(
                lessons,
                "/notes/nonexistent/",
                identity,
            );

            expect(result.previous).toBeUndefined();
            expect(result.next).toBeUndefined();
            expect(result.isEmpty()).toBe(true);
        });
    });

    describe("given a non-canonical target path", () => {
        test("matches the lesson after normalizing the target path", () => {
            const result = LessonSequenceService.findAdjacent(
                lessons,
                "/notes//b/",
                collapseSlashes,
            );

            expect(result.previous?.slug).toBe("a");
            expect(result.next?.slug).toBe("c");
        });
    });

    describe("given stored lesson hrefs that are non-canonical", () => {
        test("matches lessons after normalizing both the target and stored hrefs", () => {
            const lessonsWithNonCanonicalHref: readonly NavigationNode[] = [
                lesson("a"),
                lesson("b", "/notes//b/"),
                lesson("c"),
            ];

            const result = LessonSequenceService.findAdjacent(
                lessonsWithNonCanonicalHref,
                "/notes/b/",
                collapseSlashes,
            );

            expect(result.previous?.slug).toBe("a");
            expect(result.next?.slug).toBe("c");
        });
    });

    describe("given mixed-case and non-canonical paths", () => {
        test("matches lessons after applying the provided normalizer", () => {
            const lessonsWithMixedCase: readonly NavigationNode[] = [
                lesson("a"),
                lesson("b", "/NOTES//B/"),
                lesson("c"),
            ];

            const result = LessonSequenceService.findAdjacent(
                lessonsWithMixedCase,
                "/notes/b/",
                normalizeCaseAndSlashes,
            );

            expect(result.previous?.slug).toBe("a");
            expect(result.next?.slug).toBe("c");
        });
    });
});

/**
 * Property-based tests for {@link LessonSequenceService}.
 *
 * These tests complement the behavioral suite by checking invariants over a larger search space of
 * generated lesson sequences and targets.
 *
 * The properties below do not replace example-based tests. Instead, they help detect classes of
 * mistakes that might not be obvious from a small number of hand-written scenarios.
 */
suite("LessonSequenceService properties", () => {
    /**
     * Creates a compact navigation-node fixture for generated property inputs.
     *
     * @param slug Lesson slug used both as the node slug and as part of the default href.
     * @param href Optional href override for scenarios involving non-canonical paths.
     * @returns Minimal {@link NavigationNode} fixture.
     */
    const lesson = (slug: string, href = `/notes/${slug}/`): NavigationNode => ({
        title: `Lesson ${slug.toUpperCase()}`,
        slug,
        href,
    });

    /**
     * Normalizer used throughout the property suite.
     *
     * It lowers case, collapses repeated slashes, and trims surrounding whitespace so properties
     * can reason about normalized path equivalence.
     */
    const normalize = (href: string) =>
        href.toLowerCase().replace(/\/{2,}/g, "/").trim();

    /**
     * Arbitrary slug generator restricted to path-safe characters.
     *
     * Slashes are excluded so generated values can be embedded safely in
     * `/notes/${slug}/` without introducing additional path segments.
     */
    const slugArbitrary = fc
        .string({ minLength: 1 })
        .filter((value) => /^[a-z0-9-]+$/i.test(value) && !value.includes("/"));

    test("always returns neighbors from the original list, when the target exists", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(slugArbitrary, {
                    minLength: 1,
                    maxLength: 20,
                    selector: (slug) => normalize(`/notes/${slug}/`),
                }),
                fc.nat(),
                (slugs, seed) => {
                    const lessonList = slugs.map((slug) => lesson(slug));
                    const targetIndex = seed % lessonList.length;
                    const target = lessonList[targetIndex]!;

                    const result = LessonSequenceService.findAdjacent(
                        lessonList,
                        target.href,
                        normalize,
                    );

                    if (result.previous) {
                        expect(
                            lessonList.some((entry) => entry.slug === result.previous?.slug),
                        ).toBe(true);
                    }

                    if (result.next) {
                        expect(
                            lessonList.some((entry) => entry.slug === result.next?.slug),
                        ).toBe(true);
                    }
                },
            ),
        );
    });

    test("never returns the same lesson as both previous and next", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(slugArbitrary, {
                    minLength: 1,
                    maxLength: 20,
                    selector: (slug) => normalize(`/notes/${slug}/`),
                }),
                fc.nat(),
                (slugs, seed) => {
                    const lessonList = slugs.map((slug) => lesson(slug));
                    const targetIndex = seed % lessonList.length;
                    const target = lessonList[targetIndex]!;

                    const result = LessonSequenceService.findAdjacent(
                        lessonList,
                        target.href,
                        normalize,
                    );

                    if (result.previous && result.next) {
                        expect(result.previous.slug).not.toBe(result.next.slug);
                    }
                },
            ),
        );
    });

    test("is empty exactly when no adjacent lessons exist", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(slugArbitrary, {
                    minLength: 1,
                    maxLength: 20,
                    selector: (slug) => normalize(`/notes/${slug}/`),
                }),
                fc.nat(),
                (slugs, seed) => {
                    const lessonList = slugs.map((slug) => lesson(slug));
                    const targetIndex = seed % lessonList.length;
                    const target = lessonList[targetIndex]!;

                    const result = LessonSequenceService.findAdjacent(
                        lessonList,
                        target.href,
                        normalize,
                    );

                    const hasNoNeighbors = result.previous === undefined
                        && result.next === undefined;

                    expect(result.isEmpty()).toBe(hasNoNeighbors);
                },
            ),
        );
    });

    test("returns no adjacent lessons when the normalized target does not exist", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(slugArbitrary, {
                    minLength: 0,
                    maxLength: 20,
                    selector: (slug) => normalize(`/notes/${slug}/`),
                }),
                slugArbitrary,
                (slugs, missingSlug) => {
                    const lessonList = slugs.map((slug) => lesson(slug));
                    const missingTarget = `/missing/${missingSlug}/`;

                    const result = LessonSequenceService.findAdjacent(
                        lessonList,
                        missingTarget,
                        normalize,
                    );

                    expect(result.previous).toBeUndefined();
                    expect(result.next).toBeUndefined();
                    expect(result.isEmpty()).toBe(true);
                },
            ),
        );
    });

    test("produces the same result for equivalent normalized targets", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(slugArbitrary, {
                    minLength: 1,
                    maxLength: 20,
                    selector: (slug) => normalize(`/notes/${slug}/`),
                }),
                fc.nat(),
                (slugs, seed) => {
                    const lessonList = slugs.map((slug) => lesson(slug));
                    const targetIndex = seed % lessonList.length;
                    const target = lessonList[targetIndex]!;

                    const canonicalResult = LessonSequenceService.findAdjacent(
                        lessonList,
                        target.href,
                        normalize,
                    );

                    const noisyTarget = normalize(`//${target.href.toUpperCase()}/`);

                    const normalizedResult = LessonSequenceService.findAdjacent(
                        lessonList,
                        noisyTarget,
                        normalize,
                    );

                    expect(normalizedResult.previous?.slug).toBe(
                        canonicalResult.previous?.slug,
                    );
                    expect(normalizedResult.next?.slug).toBe(
                        canonicalResult.next?.slug,
                    );
                    expect(normalizedResult.isEmpty()).toBe(
                        canonicalResult.isEmpty(),
                    );
                },
            ),
        );
    });
});
