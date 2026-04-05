import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { buildInlineCodeClassList } from "../inline-code-classes";

function toClassName(value: readonly string[]): string {
    return value.join(" ");
}

describe("buildInlineCodeClassList", () => {
    test("returns only base classes when elevate is false", () => {
        expect(buildInlineCodeClassList({ elevate: false })).toEqual([
            "inline-block",
            "align-[0.05em]",
            "leading-[1.4]",
            "text-[0.95em]",
            "font-mono",
            "[font-weight:inherit]",
            "rounded",
            "px-[2px]",
            "py-[0px]",
            "whitespace-normal",
            "break-words",
            "[overflow-wrap:anywhere]",
            "bg-transparent",
        ]);
    });

    test("includes elevated classes after base classes when elevate is true", () => {
        expect(buildInlineCodeClassList({ elevate: true })).toEqual([
            "inline-block",
            "align-[0.05em]",
            "leading-[1.4]",
            "text-[0.95em]",
            "font-mono",
            "[font-weight:inherit]",
            "rounded",
            "px-[2px]",
            "py-[0px]",
            "whitespace-normal",
            "break-words",
            "[overflow-wrap:anywhere]",
            "bg-transparent",
            "border",
            "border-base-border/60",
            "bg-base-background/60",
            "px-1",
            "py-[1px]",
            "shadow-inner",
        ]);
    });

    test("ignores blank custom classes", () => {
        expect(buildInlineCodeClassList({ className: "   " })).toEqual(
            buildInlineCodeClassList(),
        );
    });

    test("appends normalized custom classes at the end", () => {
        expect(buildInlineCodeClassList({ className: "  custom-inline  " }).at(-1)).toBe(
            "custom-inline",
        );
    });

    test("deduplicates repeated internal and custom classes while preserving order", () => {
        expect(buildInlineCodeClassList({ className: "rounded" })).toEqual([
            "inline-block",
            "align-[0.05em]",
            "leading-[1.4]",
            "text-[0.95em]",
            "font-mono",
            "[font-weight:inherit]",
            "rounded",
            "px-[2px]",
            "py-[0px]",
            "whitespace-normal",
            "break-words",
            "[overflow-wrap:anywhere]",
            "bg-transparent",
            "border",
            "border-base-border/60",
            "bg-base-background/60",
            "px-1",
            "py-[1px]",
            "shadow-inner",
        ]);
    });

    test.each([
        { elevate: false, className: undefined },
        { elevate: true, className: undefined },
        { elevate: false, className: "" },
        { elevate: true, className: " custom-inline " },
    ])("keeps wrapping invariants (%o)", ({ elevate, className }) => {
        const options = className === undefined ? { elevate } : { elevate, className };
        const classList = buildInlineCodeClassList(options);
        const classNameValue = toClassName(classList);

        expect(classList).toContain("whitespace-normal");
        expect(classList).toContain("break-words");
        expect(classList).toContain("[overflow-wrap:anywhere]");
        expect(classList).toContain("[font-weight:inherit]");
        expect(classList).not.toContain("whitespace-nowrap");

        if (className?.trim()) {
            expect(classList).toContain(className.trim());
        }

        expect(classNameValue).not.toContain("whitespace-nowrap");
    });

    test("preserves invariants and deduplicates arbitrary custom classes", () => {
        fc.assert(fc.property(fc.string(), fc.boolean(), (className, elevate) => {
            const normalizedClassName = className.trim();
            const classList = buildInlineCodeClassList({ className, elevate });
            const classNameValue = toClassName(classList);

            expect(classList).toContain("whitespace-normal");
            expect(classList).toContain("break-words");
            expect(classList).toContain("[overflow-wrap:anywhere]");
            expect(classList).toContain("[font-weight:inherit]");
            expect(classList).not.toContain("whitespace-nowrap");

            if (!normalizedClassName) {
                expect(classList).toEqual(buildInlineCodeClassList({ elevate }));
            } else {
                expect(classList.filter((item) => item === normalizedClassName)).toHaveLength(1);
                expect(classList.at(-1)).toBe(
                    buildInlineCodeClassList({ elevate }).includes(normalizedClassName)
                        ? buildInlineCodeClassList({ elevate }).at(-1)
                        : normalizedClassName,
                );
            }

            expect(classNameValue).not.toContain("whitespace-nowrap");
        }));
    });
});
