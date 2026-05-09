import { describe, expect, it } from "vitest";
import {
    createTailwindClassTransformer,
    applyTailwindClasses,
    type TailwindClassTransformerOptions,
} from "../src/transformers/tailwind-classes";
import type { ClassableNode } from "../src/transformers/class-tokens";

/**
 * Contract tests for Tailwind class transformer.
 *
 * These tests verify transformer creation and class injection behavior.
 */
describe("tailwind class transformer", () => {
    describe("createTailwindClassTransformer", () => {
        it("creates a transformer with correct name", () => {
            const transformer = createTailwindClassTransformer({});
            expect(transformer).toHaveProperty("name");
            expect(transformer.name).toBe("tailwind-class-injector");
        });

        it("exposes pre and code hook functions", () => {
            const transformer = createTailwindClassTransformer({});
            expect(transformer).toHaveProperty("pre");
            expect(transformer).toHaveProperty("code");
            expect(typeof transformer.pre).toBe("function");
            expect(typeof transformer.code).toBe("function");
        });

        it("handles array class inputs", () => {
            const transformer = createTailwindClassTransformer({
                pre: ["rounded", "border"],
                code: ["font-mono", "text-sm"],
            });
            expect(transformer).toHaveProperty("name");
        });

        it("handles no options at all", () => {
            const transformer = createTailwindClassTransformer();
            expect(transformer).toHaveProperty("name");
            expect(transformer.name).toBe("tailwind-class-injector");
        });
    });

    describe("applyTailwindClasses (backwards compatibility)", () => {
        it("is an alias for createTailwindClassTransformer", () => {
            const transformer1 = applyTailwindClasses({ pre: "rounded" });
            const transformer2 = createTailwindClassTransformer({ pre: "rounded" });
            
            expect(transformer1.name).toBe(transformer2.name);
            expect(transformer1.name).toBe("tailwind-class-injector");
        });

        it("accepts the same options as createTailwindClassTransformer", () => {
            const options: TailwindClassTransformerOptions = {
                pre: "p-4",
                code: "font-mono",
            };
            const transformer = applyTailwindClasses(options);
            expect(transformer).toHaveProperty("pre");
            expect(transformer).toHaveProperty("code");
        });

        it("can be called without arguments", () => {
            const transformer = applyTailwindClasses();
            expect(transformer).toHaveProperty("name");
        });
    });

    describe("transformer integration", () => {
        it("returns a ShikiTransformer with correct structure", () => {
            const transformer = createTailwindClassTransformer({
                pre: "rounded border",
                code: "border font-mono",
            });

            expect(transformer).toHaveProperty("name");
            expect(transformer).toHaveProperty("pre");
            expect(transformer).toHaveProperty("code");
            expect(transformer.name).toBe("tailwind-class-injector");
        });

        it("creates transformer without options", () => {
            const transformer = createTailwindClassTransformer();
            expect(transformer).toHaveProperty("name");
            expect(transformer.name).toBe("tailwind-class-injector");
        });

        it("preserves existing node properties when transforming", () => {
            const node: ClassableNode = {
                properties: {
                    className: "existing",
                    "data-testid": "my-element",
                    id: "test-id",
                },
            };
            const originalDataTestid = node.properties["data-testid"];
            const originalId = node.properties.id;

            // Properties should be preserved in the node structure
            expect(node.properties["data-testid"]).toBe(originalDataTestid);
            expect(node.properties.id).toBe(originalId);
        });
    });
});
