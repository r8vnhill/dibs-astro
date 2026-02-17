/**
 * @file table-variants.test.ts
 *
 * Test suite for the Tailwind class builders exported by `table-variants.ts`.
 *
 * This suite focuses on two complementary styles:
 *
 * - Example-based tests (DDT style): verify specific option combinations produce expected class
 *   tokens.
 * - Property-based tests (PBT): validate invariants (stability, token-safety) across a wide range
 *   of inputs.
 *
 * The helpers under test are pure functions that build Tailwind class strings for table primitives:
 *
 * - {@link tableDataCell} for `<td>` classes.
 * - {@link tableHeaderCell} for `<th>` classes.
 * - {@link tableHeaderSection} for `<thead>` classes.
 * - {@link tableBodySection} for `<tbody>` classes.
 * - {@link tableFootSection} for `<tfoot>` classes.
 * - {@link tableRowStyles} for `<tr>` classes (including density via CSS variables).
 *
 * ## The tests are intentionally defensive:
 *
 * These helpers sit at a UI boundary where options typically come from component props, MD/MDX
 * frontmatter, or other loosely-typed sources. A small regression in class output can affect
 * multiple pages at once, so we validate both defaults and toggles explicitly.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    type TableAlign,
    tableBodySection,
    tableDataCell,
    type TableDensity,
    tableFootSection,
    tableHeaderCell,
    tableHeaderSection,
    tableRowStyles,
    type TableTone,
    type TableZebra,
} from "../table-variants";

/**
 * Enumerations used in property-based tests.
 *
 * These should match the exported union types to avoid string drift. Keeping them local makes the
 * property-based tests easy to scan and tweak.
 */
const ALIGN_VALUES: TableAlign[] = ["left", "center", "right"];
const TONE_VALUES: TableTone[] = ["default", "muted", "accent"];
const ZEBRA_VALUES: TableZebra[] = ["none", "even", "odd"];
const DENSITY_VALUES: TableDensity[] = ["compact", "comfortable", "spacious"];

/**
 * Returns `true` if `token` is present as a whitespace-separated token inside `className`.
 *
 * Tailwind class strings are typically space-delimited. This helper avoids false positives that
 * can happen with `.toContain()` when a class is a substring of another class.
 *
 * @param className Full class string returned by a helper.
 * @param token Exact token to check for.
 * @returns Whether the token exists as a standalone class entry.
 */
function containsToken(className: string, token: string): boolean {
    return className.split(/\s+/).includes(token);
}

/**
 * Runs all tests concurrently.
 *
 * This is safe because the helpers are pure and the tests do not share mutable state.
 */
describe.concurrent("table-variants helpers", () => {
    /**
     * Baseline contract: data cells should include the base layout/typography classes when no
     * options are provided.
     *
     * This ensures callers can omit options and still get a consistent look.
     */
    it("provides baseline defaults for data cells", () => {
        const className = tableDataCell({});
        expect(className).toContain("align-middle");
        expect(className).toContain("text-left");
        expect(className).toContain("whitespace-nowrap");
        expect(className).toContain("text-sm");
    });

    /**
     * Option contract: alignment and tone should map to specific tokens.
     *
     * This checks one representative combination to catch regressions in the mapping.
     */
    it("applies alignment and tone classes for data cells", () => {
        const className = tableDataCell({ align: "center", tone: "muted" });
        expect(className).toContain("text-center");
        expect(className).toContain("text-muted-foreground");
    });

    /**
     * Separation of concerns: `tableDataCell` should not depend on row-density implementation.
     *
     * Density is handled by `tableRowStyles` through CSS variables; cells should only consume
     * those variables, not define them.
     */
    it("does not couple data-cell classes to row-density css vars", () => {
        const className = tableDataCell({});
        expect(className).not.toContain("--table-cell-px");
        expect(className).not.toContain("--table-cell-py");
    });

    /**
     * Baseline contract for header cells.
     *
     * Defaults should produce a compact, emphasized header style while remaining predictable.
     */
    it("provides baseline defaults for header cells", () => {
        const className = tableHeaderCell({});
        expect(className).toContain("font-semibold");
        expect(className).toContain("text-left");
        expect(className).toContain("whitespace-nowrap");
        expect(className).toContain("text-xs");
    });

    /**
     * Toggle contract: sticky + elevated headers must add the appropriate selectors and elevation.
     */
    it("enables sticky and elevated header sections", () => {
        const className = tableHeaderSection({ sticky: true, elevated: true });
        expect(className).toContain("[_&th]:sticky");
        expect(className).toContain("shadow-sm");
    });

    /**
     * Toggle contract: `sticky: false` must not emit sticky selectors.
     *
     * This prevents unintended sticky behavior when only elevation is requested.
     */
    it("does not enable sticky selectors when sticky is false", () => {
        const className = tableHeaderSection({ sticky: false, elevated: true });
        expect(className).not.toContain("[_&th]:sticky");
        expect(className).not.toContain("[&_th]:top-0");
    });

    /**
     * Baseline contract for `<thead>` sections:
     *
     * - muted tone
     * - row separators
     * - no sticky behavior by default
     */
    it("provides baseline defaults for header sections", () => {
        const className = tableHeaderSection({});
        expect(className).toContain("bg-muted");
        expect(className).toContain("text-muted-foreground");
        expect(className).toContain("[_&tr]:border-b");
        expect(className).not.toContain("[_&th]:sticky");
    });

    /**
     * Zebra support contract: selecting `odd` should apply odd-row selectors.
     */
    it("supports zebra striping on tbody", () => {
        const className = tableBodySection({ zebra: "odd" });
        expect(className).toContain("[&_tr:nth-child(odd)]:bg-muted/50");
    });

    /**
     * Baseline contract for `<tbody>` sections:
     *
     * - last-row border removal
     * - no zebra selectors when zebra is omitted / defaults to "none"
     */
    it("provides baseline defaults for tbody", () => {
        const className = tableBodySection({});
        expect(className).toContain("[&_tr:last-child]:border-0");
        expect(className).not.toContain("[&_tr:nth-child(odd)]:bg-muted/50");
        expect(className).not.toContain("[&_tr:nth-child(even)]:bg-muted/50");
    });

    /**
     * Density contract: `tableRowStyles` sets CSS variables for padding.
     *
     * This test verifies:
     * - explicit density overrides are reflected in CSS vars
     * - base styles consume the vars with sensible fallbacks
     */
    it("respects density overrides via CSS variables for rows", () => {
        const compactClass = tableRowStyles({ density: "compact" });
        expect(compactClass).toContain("[--table-cell-px:0.5rem]");
        expect(compactClass).toContain("[--table-cell-py:0.25rem]");

        const baseClass = tableRowStyles({});
        expect(baseClass).toContain("[&_td]:px-[var(--table-cell-px,0.75rem)]");
    });

    /**
     * Baseline contract for row styles.
     *
     * These defaults ensure the table remains readable and interactive even without options.
     */
    it("provides baseline defaults for row styles", () => {
        const className = tableRowStyles({});
        expect(className).toContain("border-b");
        expect(className).toContain("transition-colors");
        expect(className).toContain("hover:bg-muted/50");
    });

    /**
     * Toggle contract for `<tfoot>`:
     *
     * If muted is explicitly disabled, the muted foreground token must not be present.
     */
    it("toggles muted footer styling", () => {
        const mutedOff = tableFootSection({ muted: false });
        expect(mutedOff).not.toContain("text-muted-foreground");
    });

    /**
     * Header sizing contract: header cells should include sizing tokens even with empty options.
     *
     * ## Note:
     *
     * This is separate from the "baseline defaults for header cells" test to ensure header sizing
     * remains stable if the baseline expectations change in the future.
     */
    it("applies header cell sizing defaults", () => {
        const className = tableHeaderCell({});
        expect(className).toContain("font-semibold");
        expect(className).toContain("text-sm");
    });

    /**
     * Baseline contract for `<tfoot>` sections.
     */
    it("provides baseline defaults for footer", () => {
        const className = tableFootSection({});
        expect(className).toContain("bg-muted/50");
        expect(className).toContain("font-medium");
        expect(className).toContain("text-muted-foreground");
    });

    /**
     * Property-based invariant suite.
     *
     * For representative option combinations, the helpers must:
     *
     * - Never emit placeholder strings (`undefined`, `null`).
     * - Never emit double spaces (common concatenation bug).
     * - Be deterministic: same inputs => same output.
     * - Emit the expected alignment token as a standalone token.
     */
    it("property: class names are stable and token-safe", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...ALIGN_VALUES),
                fc.constantFrom(...TONE_VALUES),
                fc.constantFrom(...ZEBRA_VALUES),
                fc.constantFrom(...DENSITY_VALUES),
                (align, tone, zebra, density) => {
                    const a = tableDataCell({ align, tone });
                    const b = tableDataCell({ align, tone });
                    const h = tableHeaderSection({ sticky: true, elevated: false });
                    const body = tableBodySection({ zebra });
                    const row = tableRowStyles({ density });

                    for (const className of [a, b, h, body, row]) {
                        expect(className).not.toContain("undefined");
                        expect(className).not.toContain("null");
                        expect(className).not.toContain("  ");
                    }

                    expect(a).toBe(b);
                    expect(containsToken(a, `text-${align}`)).toBe(true);
                },
            ),
        );
    });
});
