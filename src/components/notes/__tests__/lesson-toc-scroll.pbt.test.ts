import fc from "fast-check";
import { expect, suite, test } from "vitest";
import { computeTocScrollTop, type TocScrollContainer, type TocScrollItem } from "../lesson-toc-scroll";

const arbContainer: fc.Arbitrary<TocScrollContainer> = fc.record({
    scrollTop: fc.integer({ min: 0, max: 100_000 }),
    clientHeight: fc.integer({ min: 1, max: 20_000 }),
});

const arbItem: fc.Arbitrary<TocScrollItem> = fc.record({
    offsetTop: fc.integer({ min: 0, max: 200_000 }),
    offsetHeight: fc.integer({ min: 0, max: 50_000 }),
});

// Skipped in CI for the same reason as `course-structure.pbt.test.ts`: fast-check's generated
// combinations can exceed the constrained-runner test timeout. Runs locally for full coverage.
suite.skipIf(process.env.CI)("given randomly generated TOC container/entry geometry (PBT)", () => {
    test("then an entry already fully contained never triggers a scroll adjustment", () => {
        fc.assert(
            fc.property(
                arbContainer.chain((container) =>
                    fc.integer({ min: container.scrollTop, max: container.scrollTop + container.clientHeight })
                        .chain((offsetTop) =>
                            fc.record({
                                container: fc.constant(container),
                                item: fc.record({
                                    offsetTop: fc.constant(offsetTop),
                                    offsetHeight: fc.integer({
                                        min: 0,
                                        max: container.scrollTop + container.clientHeight - offsetTop,
                                    }),
                                }),
                            })
                        )
                ),
                ({ container, item }) => {
                    expect(computeTocScrollTop(container, item)).toBeNull();
                },
            ),
            { numRuns: 200 },
        );
    });

    test("then an entry above the visible range is revealed by scrolling exactly to its top", () => {
        fc.assert(
            fc.property(
                fc.tuple(arbContainer, arbItem).filter(([container, item]) => item.offsetTop < container.scrollTop),
                ([container, item]) => {
                    expect(computeTocScrollTop(container, item)).toBe(item.offsetTop);
                },
            ),
            { numRuns: 200 },
        );
    });

    test("then a non-oversized entry below the visible range is revealed by scrolling exactly to its bottom", () => {
        fc.assert(
            fc.property(
                fc.tuple(arbContainer, arbItem).filter(([container, item]) => {
                    const itemBottom = item.offsetTop + item.offsetHeight;
                    const containerBottom = container.scrollTop + container.clientHeight;
                    return item.offsetTop >= container.scrollTop
                        && item.offsetHeight < container.clientHeight
                        && itemBottom > containerBottom;
                }),
                ([container, item]) => {
                    const expected = item.offsetTop + item.offsetHeight - container.clientHeight;
                    expect(computeTocScrollTop(container, item)).toBe(expected);
                },
            ),
            { numRuns: 200 },
        );
    });

    test("then applying a requested adjustment always settles into a state that requests no further movement", () => {
        fc.assert(
            fc.property(arbContainer, arbItem, (container, item) => {
                const target = computeTocScrollTop(container, item);
                if (target === null) return;

                const settled = computeTocScrollTop({ scrollTop: target, clientHeight: container.clientHeight }, item);
                expect(settled).toBeNull();
            }),
            { numRuns: 200 },
        );
    });

    test("then the result is invariant under translating the container and entry by the same offset", () => {
        fc.assert(
            fc.property(
                arbContainer,
                arbItem,
                fc.integer({ min: -50_000, max: 50_000 }),
                (container, item, delta) => {
                    fc.pre(container.scrollTop + delta >= 0);
                    fc.pre(item.offsetTop + delta >= 0);

                    const original = computeTocScrollTop(container, item);
                    const translated = computeTocScrollTop(
                        { scrollTop: container.scrollTop + delta, clientHeight: container.clientHeight },
                        { offsetTop: item.offsetTop + delta, offsetHeight: item.offsetHeight },
                    );

                    expect(translated).toBe(original === null ? null : original + delta);
                },
            ),
            { numRuns: 200 },
        );
    });
});
