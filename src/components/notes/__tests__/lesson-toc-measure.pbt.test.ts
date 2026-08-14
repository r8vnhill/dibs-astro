import fc from "fast-check";
import { expect, suite, test } from "vitest";
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

const arbGeometry = fc.record({
    containerTop: fc.integer({ min: -100_000, max: 100_000 }),
    clientTop: fc.integer({ min: 0, max: 50 }),
    scrollTop: fc.integer({ min: 0, max: 100_000 }),
    itemTop: fc.integer({ min: -100_000, max: 100_000 }),
    itemHeight: fc.integer({ min: 0, max: 5_000 }),
});

// Skipped in CI for the same reason as the sibling `*.pbt.test.ts` suites: fast-check's generated
// combinations can exceed the constrained-runner test timeout. Runs locally for full coverage.
suite.skipIf(process.env.CI)("given randomly generated TOC container/entry browser geometry (PBT)", () => {
    // MR1 — translating the whole TOC's position in the document must not affect the measured
    // content-space offset: absolute viewport placement is not part of the content coordinate system.
    test("then translating both container and item rects by the same delta leaves the measurement unchanged", () => {
        fc.assert(
            fc.property(arbGeometry, fc.integer({ min: -100_000, max: 100_000 }), (geometry, delta) => {
                const before = measureTocEntry(
                    stubContainer(geometry.containerTop, geometry.clientTop, geometry.scrollTop),
                    stubItem(geometry.itemTop, geometry.itemHeight),
                );
                const after = measureTocEntry(
                    stubContainer(geometry.containerTop + delta, geometry.clientTop, geometry.scrollTop),
                    stubItem(geometry.itemTop + delta, geometry.itemHeight),
                );

                expect(after).toEqual(before);
            }),
            { numRuns: 200 },
        );
    });

    // MR2 — scrolling the container moves its rendered content by exactly the scroll delta, in the
    // opposite direction on screen. The measured content-space offset must be invariant to that,
    // since it is defined independently of the current scroll position.
    test("then scrolling the container while shifting the item's rect by the inverse delta leaves the measurement unchanged", () => {
        fc.assert(
            fc.property(arbGeometry, fc.integer({ min: -100_000, max: 100_000 }), (geometry, delta) => {
                fc.pre(geometry.scrollTop + delta >= 0);

                const before = measureTocEntry(
                    stubContainer(geometry.containerTop, geometry.clientTop, geometry.scrollTop),
                    stubItem(geometry.itemTop, geometry.itemHeight),
                );
                const after = measureTocEntry(
                    stubContainer(geometry.containerTop, geometry.clientTop, geometry.scrollTop + delta),
                    stubItem(geometry.itemTop - delta, geometry.itemHeight),
                );

                expect(after).toEqual(before);
            }),
            { numRuns: 200 },
        );
    });
});
