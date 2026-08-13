import { describe, expect, suite, test } from "vitest";
import { referenceAnchor, referenceCitationHref } from "../reference-links";

suite("reference links", () => {
    describe("Given a catalog identifier", () => {
        test("Then it creates a stable fragment identifier", () => {
            expect(referenceAnchor("parnas-decomposing-systems-1972")).toBe(
                "ref-parnas-decomposing-systems-1972",
            );
        });

        test("Then it accepts the catalog's ref-prefixed identifier", () => {
            expect(referenceAnchor("ref:parnas-decomposing-systems-1972")).toBe(
                "ref-parnas-decomposing-systems-1972",
            );
        });

        test("Then it normalizes the readings route before appending the fragment", () => {
            expect(referenceCitationHref("/readings/software-libraries/what-is", "kotlin-evolution-principles")).toBe(
                "/readings/software-libraries/what-is/#ref-kotlin-evolution-principles",
            );
        });
    });

    describe("Given an unsafe identifier", () => {
        test("Then it rejects the identifier instead of emitting a broken anchor", () => {
            expect(() => referenceAnchor("../../references")).toThrow("Invalid bibliography reference ID");
        });
    });
});
