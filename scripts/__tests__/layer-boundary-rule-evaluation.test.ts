import { describe, expect, test } from "vitest";

import { evaluateBoundaryRules } from "../lib/layer-boundary-rule-evaluation.mjs";

function importRecord(importPath, kind = "static-import") {
    return { target: importPath, kind };
}

function resolvedPath(path) {
    return { resolvedPath: path };
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

        test("does not skip near-miss exceptions", () => {
            const result = evaluateBoundaryRules(
                "src/domain/other.ts",
                importRecord("react"),
                { packageName: "react" },
                undefined,
                [{
                    sourcePath: "src/domain/foo.ts",
                    importTarget: "react",
                    reason: "Temporary migration exception",
                }],
            );

            expect(result.status).toBe("violation");
        });
    });

    describe("import kinds", () => {
        test("evaluates type-only imports like value imports", () => {
            const result = evaluateBoundaryRules(
                "src/domain/model.ts",
                importRecord("$application/types", "type-import"),
                resolvedPath("src/application/types.ts"),
            );

            expect(result.status).toBe("violation");
            expect(result.violation).toMatchObject({
                importKind: "type",
                ruleId: "domain-boundary",
            });
        });
    });
});
