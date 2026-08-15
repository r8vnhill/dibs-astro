import { describe, expect, suite, test } from "vitest";
import { measureTocEntry, type TocMeasurableContainer, type TocMeasurableItem } from "../lesson-toc-measure";

function stubContainer(rectTop: number, clientTop: number, scrollTop: number): TocMeasurableContainer {
    return {
        scrollTop,
        clientTop,
        getBoundingClientRect: () => ({ top: rectTop }),
    };
}

function stubItem(rectTop: number, height: number): TocMeasurableItem {
    return { getBoundingClientRect: () => ({ top: rectTop, height }) };
}

suite("given real browser geometry for a TOC entry and its scroll container", () => {
    describe("when the container is unscrolled and borderless", () => {
        test("then the content offset equals the raw viewport-rectangle difference", () => {
            const container = stubContainer(100, 0, 0);
            const item = stubItem(140, 24);

            expect(measureTocEntry(container, item)).toEqual({ offsetTop: 40, offsetHeight: 24 });
        });
    });

    describe("when the container has a non-zero scrollTop", () => {
        test("then scrollTop is restored into the content coordinate", () => {
            const container = stubContainer(100, 0, 50);
            const item = stubItem(140, 24);

            expect(measureTocEntry(container, item)).toEqual({ offsetTop: 90, offsetHeight: 24 });
        });
    });

    describe("when the container has a border", () => {
        test("then the border width is excluded from the scrollport origin", () => {
            const container = stubContainer(100, 2, 50);
            const item = stubItem(140, 24);

            expect(measureTocEntry(container, item)).toEqual({ offsetTop: 88, offsetHeight: 24 });
        });
    });

    describe("when container geometry, scroll, and item position vary together", () => {
        test.each(
            [
                ["unscrolled, borderless", 100, 0, 0, 140, 40],
                ["scrolled, borderless", 100, 0, 50, 140, 90],
                ["scrolled, bordered", 100, 2, 50, 140, 88],
                ["scrolled, bordered, item above container top", 100, 2, 50, 80, 28],
                ["larger offsets throughout", 250, 4, 125, 254, 125],
            ] satisfies ReadonlyArray<[string, number, number, number, number, number]>,
        )(
            "then %s produces the expected content-space top",
            (_label, containerTop, clientTop, scrollTop, itemTop, expected) => {
                const container = stubContainer(containerTop, clientTop, scrollTop);
                const item = stubItem(itemTop, 24);

                expect(measureTocEntry(container, item).offsetTop).toBe(expected);
            },
        );
    });

    describe("when the item's own height varies", () => {
        test.each([0, 1, 24, 400])(
            "then the measured offsetHeight passes through unchanged for height %i",
            (height) => {
                const container = stubContainer(0, 0, 0);
                const item = stubItem(0, height);

                expect(measureTocEntry(container, item).offsetHeight).toBe(height);
            },
        );
    });
});
