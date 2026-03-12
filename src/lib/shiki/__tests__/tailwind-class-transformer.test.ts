import { describe, expect, it } from "vitest";
import {
    __testing,
    applyTailwindClasses,
    type TailwindClassTransformerOptions,
} from "../tailwind-class-transformer";

describe("tailwind-class-transformer helpers", () => {
    it("splits class strings into tokens and ignores empty values", () => {
        expect(__testing.splitClassTokens(" foo  bar baz ")).toEqual(["foo", "bar", "baz"]);
        expect(__testing.splitClassTokens(undefined)).toEqual([]);
    });

    it("normalizes arrays and strings into class tokens", () => {
        expect(__testing.toClassTokens("foo bar")).toEqual(["foo", "bar"]);
        expect(__testing.toClassTokens(["foo bar", "baz", "", " qux "])).toEqual([
            "foo",
            "bar",
            "baz",
            "qux",
        ]);
    });

    it("appends unique classes preserving normalized order", () => {
        expect(__testing.appendUniqueClasses("foo bar", ["bar", "", "baz", "foo", "qux"])).toEqual([
            "foo",
            "bar",
            "baz",
            "qux",
        ]);
    });
});

describe("applyTailwindClasses", () => {
    it("normalizes class to className for pre and code nodes", () => {
        const options: TailwindClassTransformerOptions = {
            pre: ["alpha", "beta"],
            code: ["gamma"],
        };
        const transformer = applyTailwindClasses(options);
        const context = {} as never;
        const preNode: { properties: Record<string, unknown> } = {
            properties: { class: "base alpha" },
        };
        const codeNode: { properties: Record<string, unknown> } = {
            properties: { className: ["mono"], class: "legacy" },
        };

        transformer.pre?.call(context, preNode as never);
        transformer.code?.call(context, codeNode as never);

        expect(preNode.properties.className).toEqual(["base", "alpha", "beta"]);
        expect(preNode.properties).not.toHaveProperty("class");
        expect(codeNode.properties.className).toEqual(["mono", "gamma"]);
        expect(codeNode.properties).not.toHaveProperty("class");
    });

    it("skips mutation when no extra classes are provided", () => {
        const transformer = applyTailwindClasses({});
        const context = {} as never;
        const node: { properties: Record<string, unknown> } = { properties: { class: "base" } };

        transformer.pre?.call(context, node as never);
        transformer.code?.call(context, node as never);

        expect(node.properties).toEqual({ class: "base" });
    });
});
