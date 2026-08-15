import { describe, expect, suite, test } from "vitest";
import { computeTocScrollTop, type TocScrollContainer, type TocScrollItem } from "../lesson-toc-scroll";

suite("given an active TOC entry and its scrollable container", () => {
    describe("when the entry is fully visible inside the container", () => {
        test("then no scroll adjustment is requested", () => {
            const container: TocScrollContainer = { scrollTop: 100, clientHeight: 300 };
            const item: TocScrollItem = { offsetTop: 150, offsetHeight: 40 };

            expect(computeTocScrollTop(container, item)).toBeNull();
        });
    });

    describe("when the entry extends above the visible range", () => {
        test("then the container scrolls up to reveal the entry's top", () => {
            const container: TocScrollContainer = { scrollTop: 200, clientHeight: 300 };
            const item: TocScrollItem = { offsetTop: 120, offsetHeight: 40 };

            expect(computeTocScrollTop(container, item)).toBe(120);
        });
    });

    describe("when the entry extends below the visible range", () => {
        test("then the container scrolls down to reveal the entry's bottom", () => {
            const container: TocScrollContainer = { scrollTop: 0, clientHeight: 300 };
            const item: TocScrollItem = { offsetTop: 320, offsetHeight: 40 };

            expect(computeTocScrollTop(container, item)).toBe(60);
        });
    });

    describe("when the entry is taller than the container", () => {
        test("then it aligns to the entry's top even though its bottom still overflows", () => {
            const container: TocScrollContainer = { scrollTop: 0, clientHeight: 100 };
            const item: TocScrollItem = { offsetTop: 250, offsetHeight: 400 };

            expect(computeTocScrollTop(container, item)).toBe(250);
        });

        test("then an oversized entry already aligned to the top requests no adjustment", () => {
            const container: TocScrollContainer = { scrollTop: 250, clientHeight: 100 };
            const item: TocScrollItem = { offsetTop: 250, offsetHeight: 400 };

            expect(computeTocScrollTop(container, item)).toBeNull();
        });
    });

    describe("when the entry sits exactly at the container's boundaries", () => {
        test("then no scroll adjustment is requested", () => {
            const container: TocScrollContainer = { scrollTop: 100, clientHeight: 200 };
            const item: TocScrollItem = { offsetTop: 100, offsetHeight: 200 };

            expect(computeTocScrollTop(container, item)).toBeNull();
        });
    });

    describe("when the entry's edges land one unit outside the visible range", () => {
        test.each(
            [
                ["one unit above", { scrollTop: 100, clientHeight: 200 }, { offsetTop: 99, offsetHeight: 50 }, 99],
                ["one unit below", { scrollTop: 100, clientHeight: 200 }, { offsetTop: 251, offsetHeight: 50 }, 101],
            ] satisfies ReadonlyArray<[string, TocScrollContainer, TocScrollItem, number]>,
        )(
            "then %s the container scrolls by the minimal amount",
            (_label, container, item, expected) => {
                expect(computeTocScrollTop(container, item)).toBe(expected);
            },
        );
    });

    describe("when the entry is fully above or fully below the container", () => {
        test.each(
            [
                ["fully above", { scrollTop: 500, clientHeight: 200 }, { offsetTop: 0, offsetHeight: 40 }, 0],
                ["fully below", { scrollTop: 0, clientHeight: 200 }, { offsetTop: 900, offsetHeight: 40 }, 740],
            ] satisfies ReadonlyArray<[string, TocScrollContainer, TocScrollItem, number]>,
        )(
            "then %s the container scrolls directly to the entry",
            (_label, container, item, expected) => {
                expect(computeTocScrollTop(container, item)).toBe(expected);
            },
        );
    });
});
