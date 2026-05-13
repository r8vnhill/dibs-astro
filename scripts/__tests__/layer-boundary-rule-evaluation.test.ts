import { describe, expect, test } from "vitest";

import { evaluateBoundaryRules } from "../lib/layer-boundary-rule-evaluation.mjs";

function importRecord(importPath, kind = "static-import") {
    return { target: importPath, kind };
}

function resolvedPath(path) {
    return { resolvedPath: path };
}

function ruleForForbiddenPackages(forbiddenPackages) {
    return [{
        id: "test-package-boundary",
        source: "domain",
        allowedTargets: ["domain"],
        forbiddenTargets: [],
        forbiddenPackages,
        message: "Test package boundary.",
        suggestion: "Use an allowed dependency.",
    }];
}

describe("evaluateBoundaryRules", () => {
    describe("source classification", () => {
        test("allows unknown source paths", () => {
            const result = evaluateBoundaryRules(
                "scripts/build-tool.mjs",
                importRecord("$application/use-case"),
                resolvedPath("src/application/use-case.ts"),
            );

            expect(result.status).toBe("allowed");
        });

        test("allows known source layers when no matching rule is provided", () => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("$application/use-case"),
                resolvedPath("src/application/use-case.ts"),
                [],
            );

            expect(result.status).toBe("allowed");
        });
    });

    describe("target rules", () => {
        test("allows valid domain-to-domain imports", () => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("$domain/value"),
                resolvedPath("src/domain/value.ts"),
            );

            expect(result.status).toBe("allowed");
        });

        test.each([
            {
                importPath: "react",
                resolvedTarget: "src/utils/react-shim.ts",
                expectedTarget: "utils",
                expectedReason: "not-allowed-target",
            },
            {
                importPath: "@astrojs/react",
                resolvedTarget: "src/presentation/adapters/astro-react.ts",
                expectedTarget: "presentation-adapter",
                expectedReason: "forbidden-target",
            },
            {
                importPath: "~/domain/model",
                resolvedTarget: "src/domain/model.ts",
                expectedTarget: "domain",
                expectedReason: undefined,
            },
        ])(
            "treats $importPath as $expectedTarget when it resolves to $resolvedTarget",
            ({ importPath, resolvedTarget, expectedTarget, expectedReason }) => {
                const result = evaluateBoundaryRules(
                    "src/domain/model.ts",
                    importRecord(importPath),
                    resolvedPath(resolvedTarget),
                );

                if (!expectedReason) {
                    expect(result.status).toBe("allowed");
                    return;
                }

                expect(result.status).toBe("violation");
                expect(result.violation).toMatchObject({
                    importTarget: importPath,
                    resolvedTarget,
                    target: expectedTarget,
                    reason: expectedReason,
                });
                expect(result.violation).not.toHaveProperty("packageName");
            },
        );

        test("treats resolved imports as resolved targets even when the specifier looks like a package", () => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("react"),
                resolvedPath("src/utils/react-shim.ts"),
            );

            expect(result.status).toBe("violation");
            expect(result.violation).toMatchObject({
                target: "utils",
                reason: "not-allowed-target",
            });
        });

        test.each([
            {
                name: "domain cannot import application",
                sourceFile: "src/domain/model.ts",
                importPath: "$application/use-case",
                resolvedTarget: "src/application/use-case.ts",
                expectedRuleId: "domain-boundary",
                expectedSourceLayer: "domain",
                expectedTarget: "application",
            },
            {
                name: "application cannot import infrastructure",
                sourceFile: "src/application/use-case.ts",
                importPath: "$infrastructure/repository",
                resolvedTarget: "src/infrastructure/repository.ts",
                expectedRuleId: "application-boundary",
                expectedSourceLayer: "application",
                expectedTarget: "infrastructure",
            },
        ])("$name", ({
            sourceFile,
            importPath,
            resolvedTarget,
            expectedRuleId,
            expectedSourceLayer,
            expectedTarget,
        }) => {
            const result = evaluateBoundaryRules(
                sourceFile,
                importRecord(importPath),
                resolvedPath(resolvedTarget),
            );

            expect(result.status).toBe("violation");
            expect(result.violation).toMatchObject({
                ruleId: expectedRuleId,
                sourceLayer: expectedSourceLayer,
                target: expectedTarget,
                reason: "forbidden-target",
            });
        });

        test("rejects targets outside a rule allowlist", () => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("$utils/path"),
                resolvedPath("src/utils/path.ts"),
            );

            expect(result.status).toBe("violation");
            expect(result.violation).toMatchObject({
                ruleId: "domain-boundary",
                target: "utils",
                reason: "not-allowed-target",
            });
        });

        test("allows unknown targets by default", () => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("../scripts/helper"),
                resolvedPath("scripts/helper.ts"),
            );

            expect(result.status).toBe("allowed");
        });
    });

    describe("package rules", () => {
        test.each([
            ["react", "react"],
            ["react/jsx-runtime", "react"],
            ["@astrojs/react", "@astrojs/react"],
            ["@astrojs/react/server", "@astrojs/react"],
        ])("preserves package metadata for unresolved package import %s", (importPath, packageName) => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord(importPath),
                undefined,
                ruleForForbiddenPackages([packageName]),
            );

            expect(result.status).toBe("violation");
            expect(result.violation).toMatchObject({
                importTarget: importPath,
                packageName,
                target: "external-package",
                reason: "forbidden-package",
            });
        });

        test("rejects forbidden packages before target allowlist checks", () => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("react/jsx-runtime"),
                { packageName: "react" },
            );

            expect(result.status).toBe("violation");
            expect(result.violation).toMatchObject({
                ruleId: "domain-boundary",
                packageName: "react",
                target: "external-package",
                reason: "forbidden-package",
            });
        });

        test("preserves scoped package names when classifying unresolved packages", () => {
            const result = evaluateBoundaryRules(
                "src/infrastructure/repository.ts",
                importRecord("@astrojs/react"),
                { packageName: "@astrojs/react" },
            );

            expect(result.status).toBe("allowed");
        });

        test("allows packages that are not forbidden by the source rule", () => {
            const result = evaluateBoundaryRules(
                "src/infrastructure/repository.ts",
                importRecord("zod/v4"),
                { packageName: "zod" },
            );

            expect(result.status).toBe("allowed");
        });

        test("allows unknown packages unless the rule forbids them", () => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("left-pad"),
                { packageName: "left-pad" },
            );

            expect(result.status).toBe("allowed");
        });

        test.each([
            "./local",
            "../shared/local",
            "~/components/Button",
            "$content/course",
            "/absolute/path",
            "src/domain/model",
        ])("allows unresolved non-package import %s as unknown by default", (importPath) => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord(importPath),
                undefined,
            );

            expect(result.status).toBe("allowed");
        });
    });

    describe("exceptions", () => {
        test("skips exact package exceptions", () => {
            const exception = {
                sourcePath: "src/domain/foo.ts",
                importTarget: "react",
                reason: "Temporary migration exception",
            };

            const result = evaluateBoundaryRules(
                "src/domain/foo.ts",
                importRecord("react"),
                { packageName: "react" },
                undefined,
                [exception],
            );

            expect(result).toEqual({
                status: "skipped-by-exception",
                exception,
            });
        });

        test("skips exact resolved-target exceptions", () => {
            const exception = {
                sourcePath: "src/domain/foo.ts",
                importTarget: "src/application/use-case.ts",
                reason: "Temporary migration exception",
            };

            const result = evaluateBoundaryRules(
                "src/domain/foo.ts",
                importRecord("$application/use-case"),
                resolvedPath("src/application/use-case.ts"),
                undefined,
                [exception],
            );

            expect(result.status).toBe("skipped-by-exception");
        });

        test.each([
            {
                name: "different source file",
                sourceFile: "src/domain/other.ts",
                importPath: "react",
                resolvedTarget: undefined,
                expectedStatus: "violation",
                exception: {
                    sourcePath: "src/domain/foo.ts",
                    importTarget: "react",
                    reason: "Temporary migration exception",
                },
            },
            {
                name: "near-miss package path",
                sourceFile: "src/domain/foo.ts",
                importPath: "@astrojs/reactive",
                resolvedTarget: undefined,
                expectedStatus: "allowed",
                exception: {
                    sourcePath: "src/domain/foo.ts",
                    importTarget: "@astrojs/react",
                    reason: "Temporary migration exception",
                },
            },
            {
                name: "near-miss resolved path",
                sourceFile: "src/domain/foo.ts",
                importPath: "$presentation/adapter/foo",
                resolvedTarget: resolvedPath("src/presentation/adapter/foo.ts"),
                expectedStatus: "violation",
                exception: {
                    sourcePath: "src/domain/foo.ts",
                    importTarget: "src/presentation/adapters/foo.ts",
                    reason: "Temporary migration exception",
                },
            },
        ])("does not skip near-miss exceptions for $name", ({
            sourceFile,
            importPath,
            resolvedTarget,
            expectedStatus,
            exception,
        }) => {
            const result = evaluateBoundaryRules(
                sourceFile,
                importRecord(importPath),
                resolvedTarget,
                undefined,
                [exception],
            );

            expect(result.status).toBe(expectedStatus);
        });
    });

    describe("import kinds", () => {
        test.each([
            ["type-import"],
            ["type-re-export"],
        ])("evaluates %s like value imports while preserving type metadata", (kind) => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("$application/types", kind),
                resolvedPath("src/application/types.ts"),
            );

            expect(result.status).toBe("violation");
            expect(result.violation).toMatchObject({
                importKind: "type",
                ruleId: "domain-boundary",
            });
        });

        test.each([
            "future-parser-kind",
            "unknown-kind",
        ])("keeps unknown import kind %s fail-closed as a value import", (kind) => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("react", kind),
                { packageName: "react" },
            );

            expect(result.status).toBe("violation");
            expect(result.violation).toMatchObject({
                importKind: "value",
                packageName: "react",
            });
        });
    });

    describe("malformed records", () => {
        test.each([
            { kind: "static-import" },
            { importPath: undefined, target: undefined, kind: "static-import" },
            { importPath: null, kind: "static-import" },
            { importPath: 42, kind: "static-import" },
        ])("throws when the import record is malformed: %#", (record) => {
            expect(() =>
                evaluateBoundaryRules("src/domain/model.ts", record, undefined),
            ).toThrow(TypeError);
        });

        test("currently allows an empty import path because the classifier treats it as an external package", () => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                { importPath: "", kind: "static-import" },
                undefined,
            );

            expect(result.status).toBe("allowed");
        });
    });
});
