import { describe, expect, it } from "vitest";
import { LessonCatalogAdapter } from "../LessonCatalogAdapter";

const adapter = new LessonCatalogAdapter();

describe("LessonCatalogAdapter", () => {
    it("returns the course structure", async () => {
        const structure = await adapter.getCourseStructure();

        expect(Array.isArray(structure)).toBe(true);
        expect(structure.length).toBeGreaterThan(0);
    });

    it("flattens the course structure into a linear list", async () => {
        const flattened = await getFlattenedLessons();

        expect(Array.isArray(flattened)).toBe(true);
        expect(flattened.length).toBeGreaterThan(0);

        flattened.forEach((lesson) => {
            expect(lesson.slug).toBeDefined();
            expect(lesson.title).toBeDefined();
            expect(lesson.id).toBeDefined();
            expect(lesson.href).toBeDefined();
            expect(lesson.href.startsWith("/")).toBe(true);
        });
    });

    it("finds a lesson by route href", async () => {
        const lesson = await adapter.findByPath("/notes/");

        expect(lesson).toBeDefined();
        if (lesson) {
            expect(lesson.title.length).toBeGreaterThan(0);
            expect(lesson.id).toBeDefined();
        }
    });

    it("returns null for a missing route", async () => {
        const lesson = await adapter.findByPath("/notes/nonexistent/");

        expect(lesson).toBeNull();
    });

    it("preserves structure order in flatten", async () => {
        const flattened = await getFlattenedLessons();
        const structure = await adapter.getCourseStructure();

        expect(flattened.length).toBeGreaterThan(0);
        expect(structure.length).toBeGreaterThan(0);

        if (flattened[0] && structure[0]) {
            expect(flattened[0].id).toBe(structure[0].id);
        }
    });

    it("round-trips every flattened lesson through findByPath", async () => {
        const flattened = await getFlattenedLessons();

        for (const lesson of flattened) {
            const found = await adapter.findByPath(lesson.href);

            expect(found).not.toBeNull();
            expect(found?.id).toBe(lesson.id);
            expect(found?.href).toBe(lesson.href);
        }
    });

    it("returns flattened lessons with unique ids", async () => {
        const flattened = await getFlattenedLessons();
        const ids = flattened.map((lesson) => lesson.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it("returns flattened lessons with unique hrefs", async () => {
        const flattened = await getFlattenedLessons();
        const hrefs = flattened.map((lesson) => lesson.href);

        expect(new Set(hrefs).size).toBe(hrefs.length);
    });

    it("returns trails that terminate in the current flattened lesson", async () => {
        const flattened = await getFlattenedLessons();

        for (const lesson of flattened) {
            const trail = await adapter.findTrailByHref(lesson.href);
            const lastNode = trail[trail.length - 1];

            expect(trail.length).toBeGreaterThan(0);
            expect(lastNode?.title).toBe(lesson.title);
            expect(lastNode?.href).toBe(lesson.href);
        }
    });

    describe("findAdjacentByHref", () => {
        it("returns only next for the first lesson", async () => {
            const flattened = await getFlattenedLessons();
            const firstLesson = getFirstLesson(flattened);

            const result = await adapter.findAdjacentByHref(firstLesson.href);

            expect(result.previous).toBeUndefined();
            expect(result.next).toBeDefined();
            expect(result.next?.title).toBe(flattened[1]?.title);
        });

        it("returns previous and next for a middle lesson", async () => {
            const flattened = await getFlattenedLessons();
            const middleLesson = getMiddleLesson(flattened);
            const middleIndex = flattened.indexOf(middleLesson);

            const result = await adapter.findAdjacentByHref(middleLesson.href);

            expect(result.previous).toBeDefined();
            expect(result.next).toBeDefined();
            expect(result.previous?.slug).toBe(flattened[middleIndex - 1]?.slug);
            expect(result.next?.slug).toBe(flattened[middleIndex + 1]?.slug);
        });

        it("returns only previous for the last lesson", async () => {
            const flattened = await getFlattenedLessons();
            const lastLesson = getLastLesson(flattened);

            const result = await adapter.findAdjacentByHref(lastLesson.href);

            expect(result.previous).toBeDefined();
            expect(result.next).toBeUndefined();
            expect(result.previous?.slug).toBe(flattened[flattened.length - 2]?.slug);
        });

        it("returns an empty result for a missing route", async () => {
            const result = await adapter.findAdjacentByHref("/notes/nonexistent/path/");

            expect(result.previous).toBeUndefined();
            expect(result.next).toBeUndefined();
        });

        it("ignores query params when resolving adjacent lessons", async () => {
            const firstLesson = getFirstLesson(await getFlattenedLessons());
            const resultWithQuery = await adapter.findAdjacentByHref(
                `${firstLesson.href}?section=intro&lang=es`,
            );

            const resultPlain = await adapter.findAdjacentByHref(firstLesson.href);

            expect(resultWithQuery).toEqual(resultPlain);
        });

        it("ignores hash fragments when resolving adjacent lessons", async () => {
            const firstLesson = getFirstLesson(await getFlattenedLessons());
            const resultWithHash = await adapter.findAdjacentByHref(`${firstLesson.href}#section`);

            const resultPlain = await adapter.findAdjacentByHref(firstLesson.href);

            expect(resultWithHash).toEqual(resultPlain);
        });

        it("handles repeated slashes when resolving adjacent lessons", async () => {
            const firstLesson = getFirstLesson(await getFlattenedLessons());
            const malformedHref = firstLesson.href.replace(/\//g, "//");
            const resultMalformed = await adapter.findAdjacentByHref(malformedHref);

            const resultPlain = await adapter.findAdjacentByHref(firstLesson.href);

            expect(resultMalformed).toEqual(resultPlain);
        });

        it("returns the same result for equivalent href variants", async () => {
            const canonicalHref = getFirstLesson(await getFlattenedLessons()).href;
            const canonicalResult = await adapter.findAdjacentByHref(canonicalHref);

            for (const variant of noisyHrefVariants(canonicalHref)) {
                const result = await adapter.findAdjacentByHref(variant);
                expect(result).toEqual(canonicalResult);
            }
        });

        it.each(["", "   "])(
            "throws for an invalid href: %j",
            async (invalidHref) => {
                await expect(adapter.findAdjacentByHref(invalidHref)).rejects.toThrow(
                    "LessonHref cannot be empty",
                );
            },
        );

        it("aligns previous and next with flattened neighbors for every catalog index", async () => {
            const flattened = await getFlattenedLessons();
            const lastIndex = flattened.length - 1;

            for (const [index, lesson] of flattened.entries()) {
                const result = await adapter.findAdjacentByHref(lesson.href);

                if (index === 0) {
                    expect(result.previous).toBeUndefined();
                } else {
                    expect(result.previous?.href).toBe(flattened[index - 1]?.href);
                }

                if (index === lastIndex) {
                    expect(result.next).toBeUndefined();
                } else {
                    expect(result.next?.href).toBe(flattened[index + 1]?.href);
                }
            }
        });

        it("is symmetric across every adjacent pair in the flattened catalog", async () => {
            const flattened = await getFlattenedLessons();

            for (let index = 0; index < flattened.length - 1; index++) {
                const current = flattened[index];
                const next = flattened[index + 1];

                if (!current || !next) {
                    throw new Error("Could not resolve an adjacent catalog pair");
                }

                const currentResult = await adapter.findAdjacentByHref(current.href);
                const nextResult = await adapter.findAdjacentByHref(next.href);

                expect(currentResult.next?.href).toBe(next.href);
                expect(nextResult.previous?.href).toBe(current.href);
            }
        });
    });

    describe("findByPath", () => {
        it("keeps exact-match lookup semantics for noisy variants", async () => {
            const canonicalHref = getFirstLesson(await getFlattenedLessons()).href;

            await expect(adapter.findByPath(canonicalHref)).resolves.not.toBeNull();
            await expect(adapter.findByPath(`${canonicalHref}?lang=es`)).resolves.toBeNull();
            await expect(adapter.findByPath(`${canonicalHref}#intro`)).resolves.toBeNull();
            await expect(adapter.findByPath(`  ${canonicalHref}  `)).resolves.toBeNull();
            await expect(adapter.findByPath(canonicalHref.replace(/\//g, "//"))).resolves.toBeNull();
        });
    });
});

async function getFlattenedLessons() {
    const flattened = await adapter.flatten();
    if (flattened.length === 0) {
        throw new Error("Catalog unexpectedly contains no lessons");
    }

    return flattened;
}

function getFirstLesson(flattened: Awaited<ReturnType<typeof adapter.flatten>>): Awaited<
    ReturnType<typeof adapter.flatten>
>[number] {
    const firstLesson = flattened[0];
    if (!firstLesson) {
        throw new Error("Catalog unexpectedly has no first lesson");
    }

    return firstLesson;
}

function getMiddleLesson(flattened: Awaited<ReturnType<typeof adapter.flatten>>): Awaited<
    ReturnType<typeof adapter.flatten>
>[number] {
    if (flattened.length < 3) {
        throw new Error("This test requires at least 3 lessons");
    }

    const middleLesson = flattened[Math.floor(flattened.length / 2)];
    if (!middleLesson) {
        throw new Error("Catalog unexpectedly has no middle lesson");
    }

    return middleLesson;
}

function getLastLesson(flattened: Awaited<ReturnType<typeof adapter.flatten>>): Awaited<
    ReturnType<typeof adapter.flatten>
>[number] {
    const lastLesson = flattened[flattened.length - 1];
    if (!lastLesson) {
        throw new Error("Catalog unexpectedly has no last lesson");
    }

    return lastLesson;
}

function noisyHrefVariants(href: string): readonly string[] {
    return [
        `${href}?section=intro&lang=es`,
        `${href}#section`,
        href.replace(/\//g, "//"),
        `  ${href}  `,
    ];
}
