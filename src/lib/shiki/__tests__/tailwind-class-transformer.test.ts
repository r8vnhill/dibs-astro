import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    appendUniqueClasses,
    assignMergedClassName,
    splitClassTokens,
    toClassTokens,
    type ClassableNode,
    type ClassValue,
} from "../class-tokens";
import {
    applyTailwindClasses,
    type TailwindClassTransformerOptions,
} from "../tailwind-class-transformer";

describe("tailwind-class-transformer helpers", () => {
    it.each([
        { input: undefined, expected: [] },
        { input: "", expected: [] },
        { input: "   ", expected: [] },
        { input: " foo  bar baz ", expected: ["foo", "bar", "baz"] },
        { input: "foo\tbar\nbaz", expected: ["foo", "bar", "baz"] },
    ])("splits class strings into tokens: %j", ({ input, expected }) => {
        expect(splitClassTokens(input)).toEqual(expected);
    });

    it.each([
        { input: undefined, expected: [] },
        { input: "", expected: [] },
        { input: "foo bar", expected: ["foo", "bar"] },
        { input: ["foo bar", "baz", "", " qux "], expected: ["foo", "bar", "baz", "qux"] },
    ])("normalizes arrays and strings into class tokens: %j", ({ input, expected }) => {
        expect(toClassTokens(input)).toEqual(expected);
    });

    it.each([
        {
            existing: "foo bar",
            extras: ["bar", "", "baz", "foo", "qux"],
            expected: ["foo", "bar", "baz", "qux"],
        },
        {
            existing: ["foo bar", "baz"],
            extras: ["baz qux", "foo", "zap"],
            expected: ["foo", "bar", "baz", "qux", "zap"],
        },
    ])("appends unique classes preserving normalized order: %j", ({ existing, extras, expected }) => {
        expect(appendUniqueClasses(existing, extras)).toEqual(expected);
    });

    it("merges className and removes legacy class", () => {
        const node = {
            properties: {
                className: ["alpha"],
                class: "legacy ignored",
                title: "demo",
            },
        };

        assignMergedClassName(node, ["beta gamma", "alpha"]);

        expect(node.properties.className).toEqual(["alpha", "beta", "gamma"]);
        expect(node.properties).not.toHaveProperty("class");
        expect(node.properties.title).toBe("demo");
    });

    it("is idempotent and preserves the normalized token set", () => {
        const classValueArbitrary = fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.string(),
            fc.array(fc.string(), { maxLength: 6 }),
        ) as fc.Arbitrary<ClassValue>;

        fc.assert(
            fc.property(classValueArbitrary, classValueArbitrary, (existing, extras) => {
                const once = appendUniqueClasses(existing, extras);
                const twice = appendUniqueClasses(once, extras);

                expect(twice).toEqual(once);
                expect(new Set(once).size).toBe(once.length);
                expect(new Set(once)).toEqual(
                    new Set([...toClassTokens(existing), ...toClassTokens(extras)]),
                );
            }),
        );
    });

    it("ignores empty extras without changing the result", () => {
        fc.assert(
            fc.property(fc.oneof(fc.string(), fc.array(fc.string(), { maxLength: 6 })), existing => {
                expect(appendUniqueClasses(existing, ["", " ", "\t"])).toEqual(
                    appendUniqueClasses(existing, []),
                );
            }),
        );
    });
});

describe("applyTailwindClasses", () => {
    it("normalizes class to className for pre and code nodes", () => {
        const options: TailwindClassTransformerOptions = {
            pre: "alpha beta",
            code: ["gamma delta"],
        };
        const transformer = applyTailwindClasses(options);
        const context = {} as never;
        const preNode: ClassableNode = {
            properties: { class: "base alpha" },
        };
        const codeNode: ClassableNode = {
            properties: { className: ["mono"], class: "legacy" },
        };

        transformer.pre?.call(context, preNode as never);
        transformer.code?.call(context, codeNode as never);

        expect(preNode.properties.className).toEqual(["base", "alpha", "beta"]);
        expect(preNode.properties).not.toHaveProperty("class");
        expect(codeNode.properties.className).toEqual(["mono", "gamma", "delta"]);
        expect(codeNode.properties).not.toHaveProperty("class");
    });

    it("normalizes arrays with embedded whitespace tokens", () => {
        const transformer = applyTailwindClasses({
            pre: ["alpha beta", "", " gamma "],
            code: ["mono bold", "bold"],
        });
        const context = {} as never;
        const preNode: ClassableNode = { properties: { className: "base" } };
        const codeNode: ClassableNode = { properties: { class: "inline" } };

        transformer.pre?.call(context, preNode as never);
        transformer.code?.call(context, codeNode as never);

        expect(preNode.properties.className).toEqual(["base", "alpha", "beta", "gamma"]);
        expect(codeNode.properties.className).toEqual(["inline", "mono", "bold"]);
    });

    it("skips mutation when no extra classes are provided", () => {
        const transformer = applyTailwindClasses({});
        const context = {} as never;
        const node = { properties: { class: "base" } };

        transformer.pre?.call(context, node as never);
        transformer.code?.call(context, node as never);

        expect(node.properties).toEqual({ class: "base" });
    });

    it("ignores empty effective classes from string options", () => {
        const transformer = applyTailwindClasses({ pre: "  \t\n", code: ["", " "] });
        const context = {} as never;
        const preNode: ClassableNode = { properties: { class: "base" } };
        const codeNode: ClassableNode = { properties: { className: ["mono"] } };

        transformer.pre?.call(context, preNode as never);
        transformer.code?.call(context, codeNode as never);

        expect(preNode.properties).toEqual({ class: "base" });
        expect(codeNode.properties).toEqual({ className: ["mono"] });
    });
});
