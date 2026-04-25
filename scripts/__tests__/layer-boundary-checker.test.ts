import { describe, expect, test } from "vitest";

import {
    checkLayerBoundaries,
    formatViolations,
    runBoundaryCheck,
} from "../lib/layer-boundary-checker.mjs";

const cleanOptions = { tsconfig: { config: {} } };

describe("checkLayerBoundaries", () => {
    test.each([
        [
            "domain importing domain",
            "src/domain/entity.ts",
            "import { Lesson } from \"$domain/entities/Lesson\";",
            0,
        ],
        [
            "domain importing application",
            "src/domain/entity.ts",
            "import type { NavigationResult } from \"$application/ports\";",
            1,
        ],
        [
            "domain importing infrastructure",
            "src/domain/entity.ts",
            "import { Adapter } from \"$infrastructure/adapters/Adapter\";",
            1,
        ],
        [
            "domain importing presentation",
            "src/domain/entity.ts",
            "export { bridge } from \"$presentation/adapters/navigation-bridge\";",
            1,
        ],
        [
            "domain importing zod",
            "src/domain/entity.ts",
            "import { z } from \"zod\";",
            1,
        ],
        [
            "UI importing presentation adapter",
            "src/components/notes/Panel.astro",
            "---\nimport { resolveAutoNav } from \"$presentation/adapters/navigation-bridge\";\n---",
            0,
        ],
        [
            "UI importing infrastructure",
            "src/components/notes/Panel.astro",
            "---\nimport { Adapter } from \"$infrastructure/adapters/LessonCatalogAdapter\";\n---",
            1,
        ],
        [
            "layout dynamically importing infrastructure",
            "src/layouts/NotesLayout.astro",
            "---\nconst module = await import(\"$infrastructure/adapters/LessonCatalogAdapter\");\n---",
            1,
        ],
    ])("%s produces %i violation(s)", async (_label, path, text, expectedCount) => {
        const violations = await checkLayerBoundaries([{ path, text }], cleanOptions);

        expect(violations).toHaveLength(expectedCount);
    });

    test("reports actionable structured violation fields", async () => {
        const [violation] = await checkLayerBoundaries(
            [{
                path: "src/components/navigation/Nav.astro",
                text:
                    "---\nimport { Adapter } from \"$infrastructure/adapters/LessonCatalogAdapter\";\n---",
            }],
            cleanOptions,
        );

        expect(violation).toEqual({
            sourceFile: "src/components/navigation/Nav.astro",
            importTarget: "$infrastructure/adapters/LessonCatalogAdapter",
            resolvedTarget: "src/infrastructure/adapters/LessonCatalogAdapter",
            ruleId: "ui-boundary",
            message: "UI surfaces must not import infrastructure directly.",
            suggestion:
                "Route infrastructure access through presentation adapters or application-facing services.",
            importKind: "value",
            sourceLayer: "ui",
            target: "infrastructure",
            reason: "forbidden-target",
        });
    });

    test("omits imports skipped by exact exceptions", async () => {
        const violations = await checkLayerBoundaries(
            [{
                path: "src/domain/entity.ts",
                text: "import { z } from \"zod\";",
            }],
            {
                ...cleanOptions,
                exceptions: [{
                    sourcePath: "src/domain/entity.ts",
                    importTarget: "zod",
                    reason: "Temporary migration exception",
                }],
            },
        );

        expect(violations).toEqual([]);
    });
});

describe("formatViolations", () => {
    test("formats violations with source, import, resolved target, rule, and suggestion", async () => {
        const violations = await checkLayerBoundaries(
            [{
                path: "src/components/navigation/Nav.astro",
                text:
                    "---\nimport { Adapter } from \"$infrastructure/adapters/LessonCatalogAdapter\";\n---",
            }],
            cleanOptions,
        );

        expect(formatViolations(violations)).toContain(
            "Layer boundary violation: ui-boundary",
        );
        expect(formatViolations(violations)).toContain("src/components/navigation/Nav.astro");
        expect(formatViolations(violations)).toContain(
            "$infrastructure/adapters/LessonCatalogAdapter",
        );
        expect(formatViolations(violations)).toContain(
            "src/infrastructure/adapters/LessonCatalogAdapter",
        );
    });
});

describe("runBoundaryCheck", () => {
    test("returns zero exit code when there are no violations", async () => {
        const result = await runBoundaryCheck({
            ...cleanOptions,
            files: [{
                path: "src/domain/entity.ts",
                text: "import { Lesson } from \"$domain/entities/Lesson\";",
            }],
        });

        expect(result.exitCode).toBe(0);
    });

    test("returns non-zero exit code when violations exist", async () => {
        const result = await runBoundaryCheck({
            ...cleanOptions,
            files: [{
                path: "src/domain/entity.ts",
                text: "import { z } from \"zod\";",
            }],
        });

        expect(result.exitCode).toBe(1);
    });
});
