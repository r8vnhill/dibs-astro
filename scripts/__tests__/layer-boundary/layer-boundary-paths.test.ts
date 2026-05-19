import { describe, expect, test } from "vitest";

import { loadAliasMappings } from "../../lib/layer-boundary/aliases.mjs";
import { normalizeProjectPath, resolveImportTarget } from "../../lib/layer-boundary/paths.mjs";

describe("loadAliasMappings", () => {
    test("loads aliases from a tsconfig-shaped object and keeps fallback aliases", () => {
        const aliases = loadAliasMappings({
            tsconfig: {
                config: {
                    compilerOptions: {
                        paths: {
                            "$custom/*": ["./src/custom/*"],
                        },
                    },
                },
            },
        });

        expect(aliases).toMatchObject({
            "$custom": "src/custom",
            "$domain": "src/domain",
        });
    });

    test("uses fallback aliases when no tsconfig data is provided", () => {
        const aliases = loadAliasMappings({ tsconfig: { config: {} } });

        expect(aliases).toMatchObject({
            "~": "src",
            "$application": "src/application",
            "$infrastructure": "src/infrastructure",
        });
    });
});

describe("resolveImportTarget", () => {
    test.each([
        ["$domain/lesson/Lesson", "src/domain/lesson/Lesson"],
        ["~/domain/lesson/Lesson", "src/domain/lesson/Lesson"],
        ["../domain/lesson/Lesson", "src/domain/lesson/Lesson"],
        ["src/domain/lesson/Lesson", "src/domain/lesson/Lesson"],
    ])("normalizes %s to %s", (target, expected) => {
        const resolved = resolveImportTarget(target, "src/application/service.ts", {
            tsconfig: { config: {} },
        });

        expect(resolved.resolvedPath).toBe(expected);
    });

    test("classifies package imports by package name", () => {
        const resolved = resolveImportTarget("@astrojs/check/runtime", "src/domain/example.ts", {
            tsconfig: { config: {} },
        });

        expect(resolved).toMatchObject({
            packageName: "@astrojs/check",
            isPackage: true,
            isResolvable: false,
        });
    });

    test("normalizes equivalent project paths", () => {
        expect(normalizeProjectPath("src/application/../domain/./Lesson.ts")).toBe(
            "src/domain/Lesson.ts",
        );
    });
});
