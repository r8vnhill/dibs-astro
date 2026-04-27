import { describe, expect, test } from "vitest";

import {
    classifyImport,
    classifyPackageImport,
    classifyResolvedTarget,
    classifySourcePath,
} from "../lib/layer-boundary-classification.mjs";

describe("classifySourcePath", () => {
    test.each([
        ["src/domain/model/Lesson.ts", "domain"],
        ["src/application/services/NavigationService.ts", "application"],
        ["src/infrastructure/content/LessonCatalogAdapter.ts", "infrastructure"],
        ["src/presentation/adapters/navigation.ts", "presentation-adapter"],
        ["src/components/ui/Card.astro", "ui"],
        ["src/layouts/LessonLayout.astro", "ui"],
        ["src/pages/index.astro", "ui"],
        ["scripts/lib/layer-boundary-checker.mjs", "unknown"],
    ])("classifies %s as %s", (sourcePath, layer) => {
        expect(classifySourcePath(sourcePath)).toEqual({
            path: sourcePath,
            layer,
        });
    });

    test("normalizes source paths before classification", () => {
        expect(classifySourcePath("src\\domain\\model\\Lesson.ts")).toEqual({
            path: "src/domain/model/Lesson.ts",
            layer: "domain",
        });
    });
});

describe("classifyResolvedTarget", () => {
    test.each([
        ["src/domain/model/Lesson.ts", "domain"],
        ["src/application/ports/NavigationService.ts", "application"],
        ["src/infrastructure/content/LessonCatalogAdapter.ts", "infrastructure"],
        ["src/presentation/adapters/navigation.ts", "presentation-adapter"],
        ["src/presentation/navigation.ts", "presentation"],
        ["src/components/ui/Card.astro", "ui"],
        ["src/layouts/LessonLayout.astro", "ui"],
        ["src/pages/index.astro", "ui"],
        ["src/data/bibliography/catalog.generated.json", "generated-data"],
        ["src/data/bibliography/catalog.generated.jsonld", "generated-data"],
        ["src/data/bibliography/catalog.json", "data"],
        ["src/utils/path.ts", "utils"],
        ["src/assets/logo.svg", "assets"],
        ["src/styles/global.css", "styles"],
        ["scripts/whatever.ts", "unknown"],
    ])("classifies %s as %s", (resolvedPath, target) => {
        expect(classifyResolvedTarget(resolvedPath)).toBe(target);
    });

    test.each([
        ["src/presentation/adapters/foo.ts", "presentation-adapter"],
        ["src/presentation/foo.ts", "presentation"],
        ["src/data/foo.generated.json", "generated-data"],
        ["src/data/foo.generated.jsonld", "generated-data"],
        ["src/data/foo.json", "data"],
    ])("uses precedence so %s is %s", (resolvedPath, target) => {
        expect(classifyResolvedTarget(resolvedPath)).toBe(target);
    });
});

describe("classifyPackageImport", () => {
    test.each([
        ["astro", "astro"],
        ["astro:content", "astro:content"],
        ["react/jsx-runtime", "react"],
        ["zod/v4", "zod"],
        ["@scope/pkg/subpath", "@scope/pkg"],
    ])("normalizes %s to %s", (importPath, packageName) => {
        expect(classifyPackageImport(importPath)).toEqual({
            target: "external-package",
            packageName,
        });
    });
});

describe("classifyImport", () => {
    test("classifies a resolved project import", () => {
        expect(
            classifyImport(
                { importPath: "~/domain/model/Lesson", kind: "static-import" },
                "src/domain/model/Lesson.ts",
            ),
        ).toEqual({
            importPath: "~/domain/model/Lesson",
            importKind: "value",
            resolvedPath: "src/domain/model/Lesson.ts",
            target: "domain",
        });
    });

    test("classifies a package import", () => {
        expect(
            classifyImport(
                { importPath: "react/jsx-runtime", kind: "static-import" },
                undefined,
            ),
        ).toEqual({
            importPath: "react/jsx-runtime",
            importKind: "value",
            packageName: "react",
            target: "external-package",
        });
    });

    test("classifies type imports as type dependencies", () => {
        expect(
            classifyImport(
                { importPath: "~/application/ports", kind: "type-import" },
                "src/application/ports/index.ts",
            ),
        ).toMatchObject({
            importKind: "type",
            target: "application",
        });
    });

    test("classifies type re-exports as type dependencies", () => {
        expect(
            classifyImport(
                { importPath: "~/domain", kind: "type-re-export" },
                "src/domain/index.ts",
            ),
        ).toMatchObject({
            importKind: "type",
            target: "domain",
        });
    });

    test("does not classify unresolved project aliases as packages", () => {
        expect(
            classifyImport(
                { importPath: "~/unknown/path", kind: "static-import" },
                undefined,
            ),
        ).toEqual({
            importPath: "~/unknown/path",
            importKind: "value",
            target: "unknown",
        });
    });

    test.each([
        "./local-helper",
        "../shared/helper",
        "/absolute/path",
        "src/domain/model/Lesson",
    ])("does not classify unresolved non-package import %s as a package", (importPath) => {
        expect(
            classifyImport(
                { importPath, kind: "static-import" },
                undefined,
            ),
        ).toEqual({
            importPath,
            importKind: "value",
            target: "unknown",
        });
    });

    test("classifies unknown resolved project paths as unknown", () => {
        expect(
            classifyImport(
                { importPath: "../scripts/foo", kind: "static-import" },
                "scripts/foo.ts",
            ),
        ).toMatchObject({
            resolvedPath: "scripts/foo.ts",
            target: "unknown",
        });
    });

    test("accepts existing extractor records that use target instead of importPath", () => {
        expect(
            classifyImport(
                { target: "zod/v4", kind: "static-import" },
                undefined,
            ),
        ).toEqual({
            importPath: "zod/v4",
            importKind: "value",
            packageName: "zod",
            target: "external-package",
        });
    });
});
