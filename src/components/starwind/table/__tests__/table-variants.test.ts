import { describe, expect, it } from "vitest";
import {
    tableBodySection,
    tableDataCell,
    tableFootSection,
    tableHeaderCell,
    tableHeaderSection,
    tableRowStyles,
} from "../table-variants";

describe("table-variants helpers", () => {
    it("applies alignment and tone classes for data cells", () => {
        const className = tableDataCell({ align: "center", tone: "muted" });
        expect(className).toContain("text-center");
        expect(className).toContain("text-muted-foreground");
    });

    it("enables sticky and elevated header sections", () => {
        const className = tableHeaderSection({ sticky: true, elevated: true });
        expect(className).toContain("[&_th]:sticky");
        expect(className).toContain("shadow-sm");
    });

    it("supports zebra striping on tbody", () => {
        const className = tableBodySection({ zebra: "odd" });
        expect(className).toContain("[&_tr:nth-child(odd)]:bg-muted/50");
    });

    it("respects density overrides via CSS variables for rows", () => {
        const compactClass = tableRowStyles({ density: "compact" });
        expect(compactClass).toContain("[--table-cell-px:0.5rem]");
        expect(compactClass).toContain("[--table-cell-py:0.25rem]");

        const baseClass = tableRowStyles({});
        expect(baseClass).toContain("[&_td]:px-[var(--table-cell-px,0.75rem)]");
    });

    it("toggles muted footer styling", () => {
        const mutedOff = tableFootSection({ muted: false });
        expect(mutedOff).not.toContain("text-muted-foreground");
    });

    it("applies header cell sizing defaults", () => {
        const className = tableHeaderCell({});
        expect(className).toContain("font-semibold");
        expect(className).toContain("text-sm");
    });
});
