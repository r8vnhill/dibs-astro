import { describe, expect, it } from "vitest";

import {
    classifyImportKind,
    classifyPackageImport,
    classifyUnresolvedImport,
    extractImportPath,
    isBarePackageImport,
    isProjectAliasImport,
    isRelativeImport,
    packageNameFromImportPath,
} from "../../lib/layer-boundary-import-specifiers.mjs";

describe("layer-boundary import specifiers", () => {
    describe("extractImportPath", () => {
        it.each([
            [{ importPath: "react" }, "react"],
            [{ target: "react" }, "react"],
            [{ importPath: "react", target: "fallback" }, "react"],
            [{ importPath: "", target: "fallback" }, ""],
        ])("extracts %j as %s", (record, expected) => {
            expect(extractImportPath(record)).toBe(expected);
        });

        it.each([
            [{}],
            [{ importPath: undefined, target: undefined }],
            [{ importPath: null }],
            [{ importPath: 42 }],
            [undefined],
            [null],
        ])("throws TypeError for malformed record %j", (record) => {
            expect(() => extractImportPath(record)).toThrow(TypeError);
        });
    });

    describe("classifyImportKind", () => {
        it.each([
            ["type-import", "type"],
            ["type-re-export", "type"],
            ["static-import", "value"],
            ["side-effect-import", "value"],
            ["re-export", "value"],
            ["dynamic-import", "value"],
            ["future-parser-kind", "value"],
            [undefined, "value"],
            [null, "value"],
        ])("classifies %s as %s", (kind, expected) => {
            expect(classifyImportKind(kind)).toBe(expected);
        });
    });

    describe("specifier predicates", () => {
        it.each([".", "..", "./local", "../shared"])(
            "classifies %s as relative",
            (specifier) => {
                expect(isRelativeImport(specifier)).toBe(true);
            },
        );

        it.each([
            "react",
            "~/components/Button",
            "$content/course",
            "/absolute/path",
            "src/domain/model",
        ])("does not classify %s as relative", (specifier) => {
            expect(isRelativeImport(specifier)).toBe(false);
        });

        it.each(["~", "~/components/Button", "$content/course", "$generated", "$generated/file"])(
            "classifies %s as a project alias",
            (specifier) => {
                expect(isProjectAliasImport(specifier)).toBe(true);
            },
        );

        it.each(["react", "./local", "../shared", "/absolute/path", "src/domain/model"])(
            "does not classify %s as a project alias",
            (specifier) => {
                expect(isProjectAliasImport(specifier)).toBe(false);
            },
        );

        it.each([
            "react",
            "react/jsx-runtime",
            "@scope/pkg",
            "@scope/pkg/subpath",
            "node:fs",
        ])("classifies %s as a bare package import", (specifier) => {
            expect(isBarePackageImport(specifier)).toBe(true);
        });

        it("preserves the current empty-string bare-package compatibility behavior", () => {
            expect(isBarePackageImport("")).toBe(true);
        });

        it.each([
            ".",
            "..",
            "./local",
            "../shared",
            "~",
            "~/components/Button",
            "$content/course",
            "/absolute/path",
            "src/domain/model",
        ])("does not classify %s as a bare package import", (specifier) => {
            expect(isBarePackageImport(specifier)).toBe(false);
        });
    });

    describe("package helpers", () => {
        it.each([
            ["react", "react"],
            ["react/jsx-runtime", "react"],
            ["@scope/pkg", "@scope/pkg"],
            ["@scope/pkg/subpath", "@scope/pkg"],
            ["node:fs", "node:fs"],
            ["", ""],
        ])("extracts package name from %s", (specifier, expected) => {
            expect(packageNameFromImportPath(specifier)).toBe(expected);
        });

        it.each([
            ["react", "react"],
            ["@scope/pkg/subpath", "@scope/pkg"],
            ["", ""],
        ])("classifies package import %s as external package", (specifier, packageName) => {
            expect(classifyPackageImport(specifier)).toEqual({
                target: "external-package",
                packageName,
            });
        });
    });

    describe("classifyUnresolvedImport", () => {
        it.each([
            ".",
            "..",
            "./local",
            "../shared",
            "~",
            "~/components/Button",
            "$content/course",
            "$generated",
            "/absolute/path",
            "src/domain/model",
            "src/components/Button",
        ])("classifies unresolved non-package specifier %s as unknown", (specifier) => {
            expect(classifyUnresolvedImport(specifier)).toEqual({
                target: "unknown",
            });
        });

        it.each([
            ["react", "react"],
            ["react/jsx-runtime", "react"],
            ["@scope/pkg", "@scope/pkg"],
            ["@scope/pkg/subpath", "@scope/pkg"],
            ["node:fs", "node:fs"],
        ])("classifies unresolved package specifier %s as external", (specifier, packageName) => {
            expect(classifyUnresolvedImport(specifier)).toEqual({
                target: "external-package",
                packageName,
            });
        });

        it("preserves the current empty import path compatibility behavior", () => {
            expect(classifyUnresolvedImport("")).toEqual({
                target: "external-package",
                packageName: "",
            });
        });
    });
});
