import { describe, expect, test } from "vitest";

import {
    classifyImport,
    classifyPackageImport,
    classifyResolvedTarget,
    classifySourcePath,
} from "../../lib/layer-boundary/classification.mjs";

const sourceLayerCases = [
    ["src/domain/model.ts", "domain"],
    ["src/application/use-case.ts", "application"],
    ["src/infrastructure/repository.ts", "infrastructure"],
    ["src/presentation/adapters/navigation.ts", "presentation-adapter"],
    ["src/components/Button.astro", "ui"],
    ["src/layouts/BaseLayout.astro", "ui"],
    ["src/pages/index.astro", "ui"],
    ["packages/content-core/src/index.ts", "content-core"],
    ["packages/site-core/src/index.ts", "site-core"],
    ["scripts/check-layer-boundaries.mjs", "unknown"],
] as const;

const resolvedTargetCases = [
    ["src/domain/model.ts", "domain"],
    ["src/application/use-case.ts", "application"],
    ["src/infrastructure/repository.ts", "infrastructure"],
    ["src/presentation/adapters/navigation.ts", "presentation-adapter"],
    ["src/presentation/catalog.ts", "presentation"],
    ["src/components/Button.astro", "ui"],
    ["src/layouts/BaseLayout.astro", "ui"],
    ["src/pages/index.astro", "ui"],
    ["src/data/course.generated.json", "generated-data"],
    ["src/data/course.generated.jsonld", "generated-data"],
    ["src/data/course.json", "data"],
    ["src/utils/path.ts", "utils"],
    ["src/assets/logo.svg", "assets"],
    ["src/styles/global.css", "styles"],
    ["packages/content-core/src/index.ts", "content-core"],
    ["packages/site-core/src/index.ts", "site-core"],
    ["scripts/utility.mjs", "unknown"],
] as const;

describe("classifySourcePath", () => {
    test.each(sourceLayerCases)("classifies %s as %s", (sourcePath, layer) => {
        expect(classifySourcePath(sourcePath)).toEqual({
            path: sourcePath,
            layer,
        });
    });

    test("normalizes Windows paths before classification", () => {
        expect(classifySourcePath("src\\domain\\model.ts")).toEqual({
            path: "src/domain/model.ts",
            layer: "domain",
        });
    });

    test.each([
        "src/domain-extra/foo.ts",
        "src/application-extra/foo.ts",
        "src/infrastructure-extra/foo.ts",
        "src/presentation-adapters/foo.ts",
        "src/datax/file.json",
        "packages/site-core-extra/src/index.ts",
        "packages/content-core-extra/src/index.ts",
    ])("treats sibling path %s as unknown", (sourcePath) => {
        expect(classifySourcePath(sourcePath)).toEqual({
            path: sourcePath,
            layer: "unknown",
        });
    });
});

describe("classifyResolvedTarget", () => {
    test.each(resolvedTargetCases)("classifies %s as %s", (resolvedPath, target) => {
        expect(classifyResolvedTarget(resolvedPath)).toBe(target);
    });

    test.each([
        ["src/presentation/adapters/foo.ts", "presentation-adapter"],
        ["src/presentation/foo.ts", "presentation"],
        ["src/data/foo.generated.json", "generated-data"],
        ["src/data/foo.generated.jsonld", "generated-data"],
        ["src/data/foo.json", "data"],
    ])("keeps precedence for %s as %s", (resolvedPath, target) => {
        expect(classifyResolvedTarget(resolvedPath)).toBe(target);
    });

    test.each([
        "src/domain-extra/foo.ts",
        "src/application-extra/foo.ts",
        "src/infrastructure-extra/foo.ts",
        "src/datax/file.json",
        "src/presentation-adapters/foo.ts",
        "packages/site-core-extra/src/index.ts",
        "packages/content-core-extra/src/index.ts",
    ])("treats sibling path %s as unknown", (resolvedPath) => {
        expect(classifyResolvedTarget(resolvedPath)).toBe("unknown");
    });
});

describe("classifyPackageImport", () => {
    test.each([
        ["astro", "astro"],
        ["astro:content", "astro:content"],
        ["react", "react"],
        ["react/jsx-runtime", "react"],
        ["zod/v4", "zod"],
        ["@astrojs/react", "@astrojs/react"],
        ["@astrojs/react/server", "@astrojs/react"],
        ["@scope/pkg/sub/path", "@scope/pkg"],
        ["node:fs", "node:fs"],
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

    test("resolved targets win over package-looking import paths", () => {
        expect(
            classifyImport(
                { importPath: "react", kind: "static-import" },
                "src/utils/react-shim.ts",
            ),
        ).toEqual({
            importPath: "react",
            importKind: "value",
            resolvedPath: "src/utils/react-shim.ts",
            target: "utils",
        });
    });

    test.each([
        ["react", "react"],
        ["react/jsx-runtime", "react"],
        ["@astrojs/react", "@astrojs/react"],
        ["@astrojs/react/server", "@astrojs/react"],
    ])("classifies unresolved package import %s as external-package", (importPath, packageName) => {
        expect(
            classifyImport({ importPath, kind: "static-import" }, undefined),
        ).toEqual({
            importPath,
            importKind: "value",
            packageName,
            target: "external-package",
        });
    });

    test.each([
        "./local-helper",
        "../shared/helper",
        "~/unknown/path",
        "$content/something",
        "/absolute/path",
        "src/domain/model/Lesson",
    ])("classifies unresolved non-package import %s as unknown", (importPath) => {
        expect(
            classifyImport({ importPath, kind: "static-import" }, undefined),
        ).toEqual({
            importPath,
            importKind: "value",
            target: "unknown",
        });
    });

    test("accepts existing extractor records that use target instead of importPath", () => {
        expect(
            classifyImport({ target: "zod/v4", kind: "static-import" }, undefined),
        ).toEqual({
            importPath: "zod/v4",
            importKind: "value",
            packageName: "zod",
            target: "external-package",
        });
    });

    test.each([
        ["type-import", "type"],
        ["type-re-export", "type"],
        ["static-import", "value"],
        ["re-export", "value"],
        ["dynamic-import", "value"],
        ["future-parser-kind", "value"],
    ])("classifies %s as %s import kind", (kind, importKind) => {
        expect(classifyImport({ importPath: "react", kind }, undefined)).toMatchObject({
            importKind,
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

    test.each([
        { kind: "static-import" },
        { importPath: undefined, target: undefined, kind: "static-import" },
        { importPath: null, kind: "static-import" },
        { importPath: 42, kind: "static-import" },
    ])("throws for malformed import record %#", (importRecord) => {
        expect(() => classifyImport(importRecord, undefined)).toThrow(TypeError);
    });

    test("currently treats an empty import path as an external package", () => {
        expect(classifyImport({ importPath: "", kind: "static-import" }, undefined)).toEqual({
            importPath: "",
            importKind: "value",
            packageName: "",
            target: "external-package",
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
});
