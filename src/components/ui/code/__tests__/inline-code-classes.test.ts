import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { buildInlineCodeClassList } from "../inline-code-classes";

function toClassName(value: string[]): string {
    return value.join(" ");
}

describe("buildInlineCodeClassList", () => {
    test.each([
        { elevate: false, className: undefined },
        { elevate: true, className: undefined },
        { elevate: false, className: "" },
        { elevate: true, className: "custom-inline" },
    ])("keeps wrapping invariants (%o)", ({ elevate, className }) => {
        const classNameValue = toClassName(buildInlineCodeClassList({ elevate, className }));

        expect(classNameValue).toContain("whitespace-normal");
        expect(classNameValue).toContain("break-words");
        expect(classNameValue).toContain("[overflow-wrap:anywhere]");
        expect(classNameValue).not.toContain("whitespace-nowrap");

        if (className) {
            expect(classNameValue).toContain(className);
        }
    });

    test("preserves class invariants for arbitrary custom classes", () => {
        fc.assert(fc.property(fc.string(), fc.boolean(), (className, elevate) => {
            const classNameValue = toClassName(buildInlineCodeClassList({ className, elevate }));

            expect(classNameValue).toContain("whitespace-normal");
            expect(classNameValue).toContain("break-words");
            expect(classNameValue).toContain("[overflow-wrap:anywhere]");
            expect(classNameValue).not.toContain("whitespace-nowrap");

            if (className.trim()) {
                expect(classNameValue).toContain(className);
            }
        }));
    });
});
