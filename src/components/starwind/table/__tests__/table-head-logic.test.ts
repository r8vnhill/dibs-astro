import { describe, expect, it } from "vitest";
import { buildTableHeadState } from "../table-head-logic";

describe("buildTableHeadState", () => {
    it("defaults to column scope with no sorting metadata", () => {
        const state = buildTableHeadState();

        expect(state.scope).toBe("col");
        expect(state.isSorted).toBe(false);
        expect(state.ariaSort).toBeUndefined();
        expect(state.srLabel).toBeUndefined();
        expect(state.showSortIcon).toBe(false);
    });

    it("reflects sorting props into aria attributes and labels", () => {
        const state = buildTableHeadState({
            scope: "row",
            sort: "asc",
        });

        expect(state.scope).toBe("row");
        expect(state.isSorted).toBe(true);
        expect(state.ariaSort).toBe("asc");
        expect(state.srLabel).toBe("Sorted ascending");
        expect(state.showSortIcon).toBe(true);
    });

    it("allows overriding the screen-reader label and hiding the icon", () => {
        const state = buildTableHeadState({
            sort: "desc",
            sortLabel: "Orden descendente",
            showSortIcon: false,
        });

        expect(state.srLabel).toBe("Orden descendente");
        expect(state.showSortIcon).toBe(false);
    });
});
