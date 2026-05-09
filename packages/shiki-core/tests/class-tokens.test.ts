import { describe, expect, it } from "vitest";
import {
    type ClassValue,
    type ClassableNode,
    splitClassTokens,
    toClassTokens,
    appendUniqueClasses,
    assignMergedClassName,
} from "../src/transformers/class-tokens";

/**
 * Contract tests for class token utilities.
 *
 * These tests verify tokenization, merging, and node mutation contracts.
 */
describe("class token utilities", () => {
    describe("splitClassTokens", () => {
        it.each([
            { input: undefined, expected: [] },
            { input: "", expected: [] },
            { input: "   ", expected: [] },
            { input: "foo", expected: ["foo"] },
            { input: "foo bar", expected: ["foo", "bar"] },
            { input: "  foo  bar  baz  ", expected: ["foo", "bar", "baz"] },
            { input: "foo\tbar\nbaz", expected: ["foo", "bar", "baz"] },
            { input: "foo\r\nbar", expected: ["foo", "bar"] },
        ])("splits whitespace-separated tokens: $input", ({ input, expected }) => {
            expect(splitClassTokens(input)).toEqual(expected);
        });
    });

    describe("toClassTokens", () => {
        it.each([
            { input: undefined, expected: [] },
            { input: null, expected: [] },
            { input: "", expected: [] },
            { input: "foo", expected: ["foo"] },
            { input: "foo bar", expected: ["foo", "bar"] },
            { input: ["foo"], expected: ["foo"] },
            { input: ["foo", "bar"], expected: ["foo", "bar"] },
            { input: ["foo bar", "baz"], expected: ["foo", "bar", "baz"] },
            { input: ["foo bar", "", "baz"], expected: ["foo", "bar", "baz"] },
            { input: ["  foo  ", "bar  "], expected: ["foo", "bar"] },
        ])("normalizes various input formats: %j", ({ input, expected }) => {
            expect(toClassTokens(input as ClassValue)).toEqual(expected);
        });

        it("flattens nested arrays", () => {
            const result = toClassTokens(["foo bar", ["baz qux"], "zap"] as any);
            expect(result).toContain("foo");
            expect(result).toContain("bar");
            expect(result).toContain("baz");
            expect(result).toContain("qux");
            expect(result).toContain("zap");
        });
    });

    describe("appendUniqueClasses", () => {
        it.each([
            {
                existing: "foo",
                extras: "bar",
                expected: ["foo", "bar"],
            },
            {
                existing: "foo bar",
                extras: "foo baz",
                expected: ["foo", "bar", "baz"],
            },
            {
                existing: ["foo", "bar"],
                extras: ["bar", "baz"],
                expected: ["foo", "bar", "baz"],
            },
            {
                existing: "foo bar",
                extras: [],
                expected: ["foo", "bar"],
            },
            {
                existing: "",
                extras: "foo bar",
                expected: ["foo", "bar"],
            },
        ])("merges classes uniquely: %j", ({ existing, extras, expected }) => {
            expect(appendUniqueClasses(existing as ClassValue, extras as ClassValue)).toEqual(expected);
        });

        it("preserves order of existing classes", () => {
            const result = appendUniqueClasses("z y x", "a b c");
            expect(result.slice(0, 3)).toEqual(["z", "y", "x"]);
            expect(result.slice(3)).toEqual(["a", "b", "c"]);
        });

        it("deduplicates across existing and extras", () => {
            const result = appendUniqueClasses("foo bar baz", "baz qux foo");
            expect(result).toEqual(["foo", "bar", "baz", "qux"]);
            expect(result.filter((x: string) => x === "foo").length).toBe(1);
            expect(result.filter((x: string) => x === "baz").length).toBe(1);
        });

        it("handles empty inputs", () => {
            expect(appendUniqueClasses(undefined, undefined)).toEqual([]);
            expect(appendUniqueClasses(null, null)).toEqual([]);
            expect(appendUniqueClasses("", "")).toEqual([]);
        });
    });

    describe("assignMergedClassName", () => {
        it("merges className with extras", () => {
            const node: ClassableNode = {
                properties: { className: "foo bar" },
            };
            assignMergedClassName(node, "baz");
            expect(node.properties.className).toEqual(["foo", "bar", "baz"]);
        });

        it("merges class property when className is absent", () => {
            const node: ClassableNode = {
                properties: { class: "foo bar" },
            };
            assignMergedClassName(node, "baz");
            expect(node.properties.className).toEqual(["foo", "bar", "baz"]);
        });

        it("removes class property after merge", () => {
            const node: ClassableNode = {
                properties: { class: "foo" },
            };
            assignMergedClassName(node, "bar");
            expect(node.properties.class).toBeUndefined();
        });

        it("prefers className over class", () => {
            const node: ClassableNode = {
                properties: { className: "from-className", class: "from-class" },
            };
            assignMergedClassName(node, "extra");
            expect(node.properties.className).toEqual(["from-className", "extra"]);
            expect(node.properties.class).toBeUndefined();
        });

        it("handles array extras", () => {
            const node: ClassableNode = {
                properties: { className: "foo" },
            };
            assignMergedClassName(node, ["bar", "baz"]);
            expect(node.properties.className).toEqual(["foo", "bar", "baz"]);
        });

        it("handles undefined className and class", () => {
            const node: ClassableNode = {
                properties: {},
            };
            assignMergedClassName(node, "foo");
            expect(node.properties.className).toEqual(["foo"]);
        });

        it("deduplicates during merge", () => {
            const node: ClassableNode = {
                properties: { className: "foo bar" },
            };
            assignMergedClassName(node, "bar baz");
            expect(node.properties.className).toEqual(["foo", "bar", "baz"]);
        });

        it("preserves other node properties", () => {
            const node: ClassableNode = {
                properties: {
                    className: "foo",
                    id: "my-id",
                    "data-test": "value",
                },
            };
            assignMergedClassName(node, "bar");
            expect(node.properties.id).toBe("my-id");
            expect(node.properties["data-test"]).toBe("value");
        });
    });
});
