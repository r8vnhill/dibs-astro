/**
 * Integration contract for the layer-boundary checker.
 *
 * These tests exercise the public checker API over realistic source snippets rather than testing each parser,
 * resolver, classifier, or rule helper in isolation. The suite verifies that source files are classified into the
 * expected architectural layer, imports are extracted from TypeScript and Astro frontmatter, and forbidden
 * dependencies are reported as structured boundary findings.
 *
 * The cases intentionally cover both allowed and forbidden dependencies across the current layer model:
 *
 * - domain
 * - application
 * - infrastructure
 * - presentation adapters
 * - UI surfaces
 *
 * This file should stay focused on observable checker behavior:
 *
 * - returned findings from {@link checkLayerBoundaries}
 * - formatted reports from {@link formatBoundaryFindings}
 * - command-facing results from {@link runBoundaryCheck}
 *
 * Lower-level parser, path, classification, and rule-matrix details belong in their dedicated focused suites.
 */

import { describe, expect, test } from "vitest";

import { checkLayerBoundaries, formatBoundaryFindings, runBoundaryCheck } from "../lib/layer-boundary-checker.mjs";

/**
 * Options accepted by the public checker API.
 *
 * The alias is derived from {@link checkLayerBoundaries} so the test helpers stay aligned with the checker contract
 * when options evolve.
 */
type BoundaryCheckerOptions = NonNullable<
    Parameters<typeof checkLayerBoundaries>[1]
>;

/**
 * Options accepted by the command-facing boundary-check runner.
 *
 * This is intentionally separated from {@link BoundaryCheckerOptions} because {@link runBoundaryCheck} also accepts
 * runner-specific fields, such as an explicit in-memory file list for tests.
 */
type BoundaryRunnerOptions = NonNullable<
    Parameters<typeof runBoundaryCheck>[0]
>;

/**
 * Public structured finding returned by {@link checkLayerBoundaries}.
 *
 * Tests use partial instances of this type to assert relevant architectural facts without coupling every case to the
 * full diagnostic payload.
 */
type BoundaryFinding = Awaited<
    ReturnType<typeof checkLayerBoundaries>
>[number];

/**
 * Table-driven integration case for checker-level boundary behavior.
 *
 * @property name Human-readable behavior name shown by Vitest.
 * @property path Source file path used to infer the importing layer.
 * @property text Source text inspected by the checker.
 * @property expectedFindings Partial structured findings expected from the checker.
 */
type BoundaryCase = {
    readonly name: string;
    readonly path: string;
    readonly text: string;
    readonly expectedFindings: readonly Partial<BoundaryFinding>[];
};

/**
 * Uses an empty tsconfig shape so tests exercise explicit snippets without depending on the repository's real
 * path-alias configuration.
 */
const cleanOptions = {
    tsconfig: { config: {} },
} satisfies BoundaryCheckerOptions;

/**
 * Creates an in-memory source file fixture for checker tests.
 *
 * @param path Source path used by the checker to classify the importing layer.
 * @param text Source text inspected for imports, re-exports, and dynamic imports.
 * @returns Source fixture accepted by {@link checkLayerBoundaries}.
 */
const sourceFile = (path: string, text: string) => ({ path, text });

/**
 * Runs the public checker API against a single in-memory source file.
 *
 * This keeps one-file cases concise while still exercising the same public boundary checker used by multi-file and
 * command-facing tests.
 *
 * @param path Source path used to infer the importing layer.
 * @param text Source text inspected by the checker.
 * @param options Checker options. Defaults to {@link cleanOptions}.
 * @returns Structured boundary findings reported for the provided source file.
 */
const checkSingleFile = (
    path: string,
    text: string,
    options: BoundaryCheckerOptions = cleanOptions,
) => checkLayerBoundaries([sourceFile(path, text)], options);

/**
 * Minimal Astro source with an infrastructure import inside frontmatter.
 *
 * The checker intentionally inspects Astro frontmatter imports without treating template text as source code.
 */
const uiInfrastructureImport = "---\nimport { Adapter } from \"$infrastructure/adapters/LessonCatalogAdapter\";\n---";

describe("checkLayerBoundaries", () => {
    const boundaryCases: readonly BoundaryCase[] = [
        {
            name: "allows domain imports of domain code",
            path: "src/domain/entity.ts",
            text: "import { Lesson } from \"$domain/entities/Lesson\";",
            expectedFindings: [],
        },
        {
            name: "reports domain imports of application code",
            path: "src/domain/entity.ts",
            text: "import type { NavigationResult } from \"$application/ports\";",
            expectedFindings: [{
                ruleId: "domain-boundary",
                sourceLayer: "domain",
                target: "application",
                importKind: "type",
                reason: "forbidden-target",
            }],
        },
        {
            name: "reports domain imports of infrastructure code",
            path: "src/domain/entity.ts",
            text: "import { Adapter } from \"$infrastructure/adapters/Adapter\";",
            expectedFindings: [{
                ruleId: "domain-boundary",
                sourceLayer: "domain",
                target: "infrastructure",
                importKind: "value",
                reason: "forbidden-target",
            }],
        },
        {
            name: "reports domain imports of presentation code",
            path: "src/domain/entity.ts",
            text: "export { bridge } from \"$presentation/adapters/navigation-bridge\";",
            expectedFindings: [{
                ruleId: "domain-boundary",
                sourceLayer: "domain",
                target: "presentation-adapter",
                importKind: "value",
                reason: "forbidden-target",
            }],
        },
        {
            name: "reports domain imports of blocked packages",
            path: "src/domain/entity.ts",
            text: "import { z } from \"zod\";",
            expectedFindings: [{
                ruleId: "domain-boundary",
                sourceLayer: "domain",
                target: "external-package",
                packageName: "zod",
                importKind: "value",
                reason: "forbidden-package",
            }],
        },
        {
            name: "allows application imports of domain code",
            path: "src/application/use-case.ts",
            text: "import { Lesson } from \"$domain/entities/Lesson\";",
            expectedFindings: [],
        },
        {
            name: "reports application imports of infrastructure code",
            path: "src/application/use-case.ts",
            text: "import { Adapter } from \"$infrastructure/adapters/LessonCatalogAdapter\";",
            expectedFindings: [{
                ruleId: "application-boundary",
                sourceLayer: "application",
                target: "infrastructure",
                importKind: "value",
                reason: "forbidden-target",
            }],
        },
        {
            name: "allows infrastructure imports of domain code",
            path: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
            text: "import { Lesson } from \"$domain/entities/Lesson\";",
            expectedFindings: [],
        },
        {
            name: "allows infrastructure imports of application code",
            path: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
            text: "import { LessonRepository } from \"$application/ports\";",
            expectedFindings: [],
        },
        {
            name: "allows UI imports of presentation adapters",
            path: "src/components/notes/Panel.astro",
            text: "---\nimport { resolveAutoNav } from \"$presentation/adapters/navigation-bridge\";\n---",
            expectedFindings: [],
        },
        {
            name: "reports UI imports of domain code",
            path: "src/components/notes/Panel.astro",
            text: "---\nimport { formatLessonDate } from \"$domain/lesson-metadata\";\n---",
            expectedFindings: [{
                ruleId: "ui-boundary",
                sourceLayer: "ui",
                target: "domain",
                importKind: "value",
                reason: "forbidden-target",
            }],
        },
        {
            name: "reports UI imports of application code",
            path: "src/components/notes/Panel.astro",
            text: "---\nimport type { LessonMetadataDto } from \"$application/ports\";\n---",
            expectedFindings: [{
                ruleId: "ui-boundary",
                sourceLayer: "ui",
                target: "application",
                importKind: "type",
                reason: "forbidden-target",
            }],
        },
        {
            name: "reports UI imports of infrastructure code",
            path: "src/components/notes/Panel.astro",
            text: uiInfrastructureImport,
            expectedFindings: [{
                ruleId: "ui-boundary",
                sourceLayer: "ui",
                target: "infrastructure",
                importKind: "value",
                reason: "forbidden-target",
            }],
        },
        {
            name: "reports dynamic layout imports of infrastructure code",
            path: "src/layouts/NotesLayout.astro",
            text: "---\nconst module = await import(\"$infrastructure/adapters/LessonCatalogAdapter\");\n---",
            expectedFindings: [{
                ruleId: "ui-boundary",
                sourceLayer: "ui",
                target: "infrastructure",
                importKind: "value",
                reason: "forbidden-target",
            }],
        },
    ];

    test.each(boundaryCases)("$name", async ({ path, text, expectedFindings }) => {
        const findings = await checkSingleFile(path, text);

        expect(findings).toHaveLength(expectedFindings.length);
        expect(findings).toMatchObject(expectedFindings);
    });

    test("reports actionable structured finding fields", async () => {
        const [finding] = await checkSingleFile(
            "src/components/navigation/Nav.astro",
            uiInfrastructureImport,
        );

        expect(finding).toEqual({
            sourceFile: "src/components/navigation/Nav.astro",
            importTarget: "$infrastructure/adapters/LessonCatalogAdapter",
            resolvedTarget: "src/infrastructure/adapters/LessonCatalogAdapter",
            ruleId: "ui-boundary",
            message: "UI code must depend on presentation contracts, not domain/application internals.",
            suggestion: "Move shaping logic behind a presentation adapter, helper, or view model.",
            importKind: "value",
            sourceLayer: "ui",
            target: "infrastructure",
            reason: "forbidden-target",
        });
    });

    test.each([
        [
            "type re-exports",
            "src/domain/entity.ts",
            "export type { NavigationResult } from \"$application/ports\";",
            "type",
        ],
        [
            "star re-exports",
            "src/domain/entity.ts",
            "export * from \"$infrastructure/adapters/LessonCatalogAdapter\";",
            "value",
        ],
        [
            "inline type-only imports",
            "src/domain/entity.ts",
            "import { type NavigationResult } from \"$application/ports\";",
            "type",
        ],
        [
            "mixed inline type and value imports",
            "src/domain/entity.ts",
            "import { type NavigationResult, createNavigation } from \"$application/ports\";",
            "value",
        ],
    ])("classifies %s", async (_label, path, text, importKind) => {
        const findings = await checkSingleFile(path, text);

        expect(findings).toMatchObject([{ importKind }]);
    });

    test("reports domain imports of infrastructure code through relative paths", async () => {
        const findings = await checkSingleFile(
            "src/domain/entity.ts",
            "import { Adapter } from \"../infrastructure/adapters/LessonCatalogAdapter\";",
        );

        expect(findings).toMatchObject([{
            ruleId: "domain-boundary",
            sourceLayer: "domain",
            target: "infrastructure",
            importKind: "value",
            reason: "forbidden-target",
        }]);
    });

    test("reports UI imports of infrastructure code through relative paths", async () => {
        const findings = await checkSingleFile(
            "src/components/navigation/Nav.astro",
            "---\nimport { Adapter } from \"../../infrastructure/adapters/LessonCatalogAdapter\";\n---",
        );

        expect(findings).toMatchObject([{
            ruleId: "ui-boundary",
            sourceLayer: "ui",
            target: "infrastructure",
            importKind: "value",
            reason: "forbidden-target",
        }]);
    });

    test("ignores import-looking text inside comments", async () => {
        const findings = await checkSingleFile(
            "src/domain/entity.ts",
            "// import { Adapter } from \"$infrastructure/adapters/Adapter\";",
        );

        expect(findings).toEqual([]);
    });

    test("ignores import-looking text inside strings", async () => {
        const findings = await checkSingleFile(
            "src/domain/entity.ts",
            "const example = 'import { Adapter } from \"$infrastructure/adapters/Adapter\"';",
        );

        expect(findings).toEqual([]);
    });

    test("ignores import-looking text outside Astro frontmatter", async () => {
        const findings = await checkSingleFile(
            "src/components/Card.astro",
            "<p>import { Adapter } from \"$infrastructure/adapters/Adapter\";</p>",
        );

        expect(findings).toEqual([]);
    });

    test("normalizes Windows-style source paths before layer detection", async () => {
        const findings = await checkLayerBoundaries(
            [sourceFile("src\\components\\navigation\\Nav.astro", uiInfrastructureImport)],
            cleanOptions,
        );

        expect(findings).toMatchObject([{
            ruleId: "ui-boundary",
            sourceFile: "src/components/navigation/Nav.astro",
            sourceLayer: "ui",
            target: "infrastructure",
            reason: "forbidden-target",
        }]);
    });

    test("omits imports skipped by exact exceptions", async () => {
        const findings = await checkSingleFile(
            "src/domain/entity.ts",
            "import { z } from \"zod\";",
            {
                ...cleanOptions,
                exceptions: [{
                    sourcePath: "src/domain/entity.ts",
                    importTarget: "zod",
                    reason: "Temporary migration exception",
                }],
            },
        );

        expect(findings).toEqual([]);
    });

    test("does not apply exceptions to different source files", async () => {
        const findings = await checkSingleFile(
            "src/domain/other.ts",
            "import { z } from \"zod\";",
            {
                ...cleanOptions,
                exceptions: [{
                    sourcePath: "src/domain/entity.ts",
                    importTarget: "zod",
                    reason: "Temporary migration exception",
                }],
            },
        );

        expect(findings).toHaveLength(1);
    });

    test("does not apply exceptions to different import targets", async () => {
        const findings = await checkSingleFile(
            "src/domain/entity.ts",
            "import { z } from \"zod\";",
            {
                ...cleanOptions,
                exceptions: [{
                    sourcePath: "src/domain/entity.ts",
                    importTarget: "react",
                    reason: "Temporary migration exception",
                }],
            },
        );

        expect(findings).toHaveLength(1);
    });

    test("returns multiple findings from one file", async () => {
        const findings = await checkSingleFile(
            "src/domain/entity.ts",
            [
                "import type { NavigationResult } from \"$application/ports\";",
                "import { z } from \"zod\";",
            ].join("\n"),
        );

        expect(findings).toMatchObject([
            {
                importTarget: "$application/ports",
                ruleId: "domain-boundary",
                target: "application",
            },
            {
                importTarget: "zod",
                ruleId: "domain-boundary",
                target: "external-package",
            },
        ]);
    });

    test("returns findings in deterministic order", async () => {
        const findings = await checkLayerBoundaries(
            [
                sourceFile(
                    "src/components/B.astro",
                    "---\nimport { B } from \"$infrastructure/B\";\n---",
                ),
                sourceFile(
                    "src/components/A.astro",
                    "---\nimport { A } from \"$infrastructure/A\";\n---",
                ),
            ],
            cleanOptions,
        );

        expect(findings.map((finding) => finding.sourceFile)).toEqual([
            "src/components/A.astro",
            "src/components/B.astro",
        ]);
    });

    test("returns no findings for an empty file list", async () => {
        await expect(checkLayerBoundaries([], cleanOptions)).resolves.toEqual([]);
    });

    test("returns no findings for empty file text", async () => {
        await expect(checkSingleFile("src/domain/entity.ts", "")).resolves.toEqual([]);
    });
});

describe("formatBoundaryFindings", () => {
    test("formats an empty finding list", () => {
        expect(formatBoundaryFindings([])).toBe("No layer boundary findings found.");
    });

    test("formats findings with source, import, resolved target, rule, and suggestion", async () => {
        const findings = await checkSingleFile(
            "src/components/navigation/Nav.astro",
            uiInfrastructureImport,
        );
        const output = formatBoundaryFindings(findings);

        expect(output).toContain("Layer boundary finding: ui-boundary");
        expect(output).toContain("src/components/navigation/Nav.astro");
        expect(output).toContain("$infrastructure/adapters/LessonCatalogAdapter");
        expect(output).toContain("src/infrastructure/adapters/LessonCatalogAdapter");
        expect(output).toContain("UI code must depend on presentation contracts");
    });

    test("formats package findings without a resolved target section", async () => {
        const findings = await checkSingleFile(
            "src/domain/entity.ts",
            "import { z } from \"zod\";",
        );
        const output = formatBoundaryFindings(findings);

        expect(output).toContain("Layer boundary finding: domain-boundary");
        expect(output).toContain("Import:\n  zod");
        expect(output).not.toContain("Resolved target:");
    });
});

describe("runBoundaryCheck", () => {
    test("returns zero exit code when there are no findings", async () => {
        const options = {
            ...cleanOptions,
            files: [sourceFile(
                "src/domain/entity.ts",
                "import { Lesson } from \"$domain/entities/Lesson\";",
            )],
        } satisfies BoundaryRunnerOptions;

        const result = await runBoundaryCheck(options);

        expect(result.exitCode).toBe(0);
        expect(result.findings).toEqual([]);
    });

    test("returns non-zero exit code when findings exist", async () => {
        const result = await runBoundaryCheck({
            ...cleanOptions,
            files: [sourceFile("src/domain/entity.ts", "import { z } from \"zod\";")],
        });

        expect(result.exitCode).toBe(1);
        expect(result.findings).toHaveLength(1);
    });
});
