import { describe, expect, test } from "vitest";
import { buildLessonPageRegistry, getLessonPageRegistry } from "../lesson-page-registry";

describe("given the lesson page registry", () => {
    test("then canonical note pages resolve to source files", () => {
        const registry = getLessonPageRegistry();

        expect(registry.resolve("/notes/installation/")).toMatchObject({
            route: "/notes/installation/",
            sourceFile: "src/pages/notes/installation.astro",
        });

        expect(registry.resolve("/notes/software-libraries/artifacts-taxonomy/")).toMatchObject({
            route: "/notes/software-libraries/artifacts-taxonomy/",
            sourceFile: "src/pages/notes/software-libraries/artifacts-taxonomy/index.astro",
        });
    });

    test("then duplicate routes are rejected", () => {
        expect(() => buildLessonPageRegistry({
            "../../pages/notes/foo.astro": { default: {} },
            "../../pages/notes/foo/index.astro": { default: {} },
        })).toThrow(/Multiple lesson pages map to \/notes\/foo\//u);
    });

    test("then missing default exports are rejected", () => {
        expect(() => buildLessonPageRegistry({
            "../../pages/notes/foo.astro": {},
        })).toThrow(/Missing default export for src\/pages\/notes\/foo\.astro/u);
    });

    test("then missing routes fail clearly", () => {
        const registry = buildLessonPageRegistry({
            "../../pages/notes/foo.astro": { default: {} },
        });

        expect(() => registry.resolve("/notes/missing/")).toThrow(/No lesson page found for \/notes\/missing\//u);
    });
});