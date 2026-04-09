/**
 * Tests for AdjacentLessons value object.
 *
 * Validates immutability, empty state, and proper construction.
 */

import { AdjacentLessons, type NavigationNode } from "$domain/value-objects/AdjacentLessons";
import { describe, expect, it } from "vitest";

describe("AdjacentLessons value object", () => {
    it("must be immutable after construction", () => {
        const previous: NavigationNode = {
            title: "Previous Lesson",
            slug: "previous",
            href: "/notes/previous/",
        };
        const next: NavigationNode = {
            title: "Next Lesson",
            slug: "next",
            href: "/notes/next/",
        };

        const adjacent = AdjacentLessons.create(previous, next);

        // Verify the object is frozen
        expect(Object.isFrozen(adjacent)).toBe(true);
    });

    it("isEmpty() returns true only if both previous and next are undefined", () => {
        const node: NavigationNode = {
            title: "Some Lesson",
            slug: "some",
            href: "/notes/some/",
        };

        const emptyAdjacent = AdjacentLessons.create(undefined, undefined);
        const withPrevious = AdjacentLessons.create(node, undefined);
        const withNext = AdjacentLessons.create(undefined, node);
        const withBoth = AdjacentLessons.create(node, node);

        expect(emptyAdjacent.isEmpty()).toBe(true);
        expect(withPrevious.isEmpty()).toBe(false);
        expect(withNext.isEmpty()).toBe(false);
        expect(withBoth.isEmpty()).toBe(false);
    });

    it("should allow only previous without next", () => {
        const previous: NavigationNode = {
            title: "Only Previous",
            slug: "only-previous",
            href: "/notes/only-previous/",
        };

        const adjacent = AdjacentLessons.create(previous, undefined);

        expect(adjacent.previous).toBe(previous);
        expect(adjacent.next).toBeUndefined();
        expect(adjacent.isEmpty()).toBe(false);
    });
});
