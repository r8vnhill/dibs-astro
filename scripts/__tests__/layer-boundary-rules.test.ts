import { describe, expect, test } from "vitest";

import { checkLayerBoundaries } from "../lib/layer-boundary-checker.mjs";
import { evaluateBoundaryRules } from "../lib/layer-boundary-rule-evaluation.mjs";
import {
    allowedExceptions,
    boundaryRules,
    initialBoundaryRules,
} from "../lib/layer-boundary-rules.mjs";

const expectedRuleOrder = [
    "domain-boundary",
    "application-boundary",
    "infrastructure-boundary",
    "presentation-adapter-boundary",
    "ui-boundary",
];

const expectedSources = [
    ["domain-boundary", "domain"],
    ["application-boundary", "application"],
    ["infrastructure-boundary", "infrastructure"],
    ["presentation-adapter-boundary", "presentation-adapter"],
    ["ui-boundary", "ui"],
];

function ruleById(id) {
    const rule = boundaryRules.find((candidate) => candidate.id === id);

    if (!rule) {
        throw new Error(`Missing boundary rule: ${id}`);
    }

    return rule;
}

function importRecord(importPath, kind = "static-import") {
    return { target: importPath, kind };
}

function resolvedPath(path) {
    return { resolvedPath: path };
}

function evaluateCase(testCase) {
    return evaluateBoundaryRules(
        testCase.sourcePath,
        importRecord(testCase.importPath, testCase.kind),
        testCase.resolvedPath ? resolvedPath(testCase.resolvedPath) : undefined,
    );
}

function expectRuleCase(testCase) {
    const result = evaluateCase(testCase);

    expect(result.status).toBe(testCase.expected);

    if (testCase.expected === "violation") {
        expect(result.violation).toMatchObject({
            ruleId: testCase.ruleId,
            sourceLayer: testCase.sourceLayer,
            target: testCase.target,
        });
    }
}

const allowedMatrixCases = [
    {
        name: "domain may import domain",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$domain/value-objects/LessonId",
        resolvedPath: "src/domain/value-objects/LessonId.ts",
    },
    {
        name: "application may import domain",
        sourcePath: "src/application/services/LessonUseCase.ts",
        importPath: "$domain/entities/Lesson",
        resolvedPath: "src/domain/entities/Lesson.ts",
    },
    {
        name: "application may import application",
        sourcePath: "src/application/services/LessonUseCase.ts",
        importPath: "$application/ports/LessonRepository",
        resolvedPath: "src/application/ports/LessonRepository.ts",
    },
    {
        name: "infrastructure may import domain",
        sourcePath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        importPath: "$domain/entities/Lesson",
        resolvedPath: "src/domain/entities/Lesson.ts",
    },
    {
        name: "infrastructure may import application",
        sourcePath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        importPath: "$application/ports/LessonRepository",
        resolvedPath: "src/application/ports/LessonRepository.ts",
    },
    {
        name: "infrastructure may import infrastructure",
        sourcePath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        importPath: "$infrastructure/adapters/helpers",
        resolvedPath: "src/infrastructure/adapters/helpers.ts",
    },
    {
        name: "infrastructure may import data",
        sourcePath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        importPath: "$data/course-structure",
        resolvedPath: "src/data/course-structure.ts",
    },
    {
        name: "infrastructure may import generated JSON data",
        sourcePath: "src/infrastructure/adapters/LessonMetadataAdapter.ts",
        importPath: "$data/lesson-metadata.generated.json",
        resolvedPath: "src/data/lesson-metadata.generated.json",
    },
    {
        name: "infrastructure may import generated JSON-LD data",
        sourcePath: "src/infrastructure/adapters/BibliographyAdapter.ts",
        importPath: "$data/bibliography/catalog.generated.jsonld",
        resolvedPath: "src/data/bibliography/catalog.generated.jsonld",
    },
    {
        name: "infrastructure may import utils",
        sourcePath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        importPath: "$utils/navigation",
        resolvedPath: "src/utils/navigation.ts",
    },
    {
        name: "presentation adapter may import domain",
        sourcePath: "src/presentation/adapters/navigation-bridge.ts",
        importPath: "$domain/entities/LessonTrail",
        resolvedPath: "src/domain/entities/LessonTrail.ts",
    },
    {
        name: "presentation adapter may import application",
        sourcePath: "src/presentation/adapters/navigation-bridge.ts",
        importPath: "$application/services/LessonNavigationService",
        resolvedPath: "src/application/services/LessonNavigationService.ts",
    },
    {
        name: "presentation adapter may import infrastructure",
        sourcePath: "src/presentation/adapters/navigation-bridge.ts",
        importPath: "$infrastructure/adapters/LessonCatalogAdapter",
        resolvedPath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
    },
    {
        name: "presentation adapter may import another presentation adapter",
        sourcePath: "src/presentation/adapters/navigation-bridge.ts",
        importPath: "$presentation/adapters/lesson-metadata-bridge",
        resolvedPath: "src/presentation/adapters/lesson-metadata-bridge.ts",
    },
    {
        name: "presentation adapter may import presentation-local helpers",
        sourcePath: "src/presentation/adapters/navigation-bridge.ts",
        importPath: "$presentation/formatters/navigation",
        resolvedPath: "src/presentation/formatters/navigation.ts",
    },
    {
        name: "presentation adapter may import utils",
        sourcePath: "src/presentation/adapters/navigation-bridge.ts",
        importPath: "$utils/navigation",
        resolvedPath: "src/utils/navigation.ts",
    },
    {
        name: "UI may import presentation adapter",
        sourcePath: "src/components/notes/LessonMetaPanel.astro",
        importPath: "$presentation/adapters/lesson-metadata-bridge",
        resolvedPath: "src/presentation/adapters/lesson-metadata-bridge.ts",
    },
    {
        name: "UI may import presentation-local helper",
        sourcePath: "src/layouts/NotesLayout.astro",
        importPath: "$presentation/formatters/navigation",
        resolvedPath: "src/presentation/formatters/navigation.ts",
    },
    {
        name: "UI may import UI helper or component",
        sourcePath: "src/pages/notes/index.astro",
        importPath: "$components/ui/list/List",
        resolvedPath: "src/components/ui/list/List.astro",
    },
    {
        name: "UI may import assets",
        sourcePath: "src/components/header/Header.astro",
        importPath: "$assets/img/logo.svg",
        resolvedPath: "src/assets/img/logo.svg",
    },
    {
        name: "UI may import styles",
        sourcePath: "src/layouts/BaseLayout.astro",
        importPath: "$styles/global.css",
        resolvedPath: "src/styles/global.css",
    },
    {
        name: "UI may import utils",
        sourcePath: "src/components/navigation/LessonSidebar.tsx",
        importPath: "$utils/navigation",
        resolvedPath: "src/utils/navigation.ts",
    },
];

const forbiddenMatrixCases = [
    {
        name: "domain must not import application",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$application/ports/LessonRepository",
        resolvedPath: "src/application/ports/LessonRepository.ts",
        ruleId: "domain-boundary",
        sourceLayer: "domain",
        target: "application",
    },
    {
        name: "domain must not import infrastructure",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$infrastructure/adapters/LessonCatalogAdapter",
        resolvedPath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        ruleId: "domain-boundary",
        sourceLayer: "domain",
        target: "infrastructure",
    },
    {
        name: "domain must not import presentation adapter",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$presentation/adapters/navigation-bridge",
        resolvedPath: "src/presentation/adapters/navigation-bridge.ts",
        ruleId: "domain-boundary",
        sourceLayer: "domain",
        target: "presentation-adapter",
    },
    {
        name: "domain must not import presentation",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$presentation/formatters/navigation",
        resolvedPath: "src/presentation/formatters/navigation.ts",
        ruleId: "domain-boundary",
        sourceLayer: "domain",
        target: "presentation",
    },
    {
        name: "domain must not import UI",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$components/ui/list/List",
        resolvedPath: "src/components/ui/list/List.astro",
        ruleId: "domain-boundary",
        sourceLayer: "domain",
        target: "ui",
    },
    {
        name: "domain must not import generated data",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$data/lesson-metadata.generated.json",
        resolvedPath: "src/data/lesson-metadata.generated.json",
        ruleId: "domain-boundary",
        sourceLayer: "domain",
        target: "generated-data",
    },
    {
        name: "domain must not import data",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$data/course-structure",
        resolvedPath: "src/data/course-structure.ts",
        ruleId: "domain-boundary",
        sourceLayer: "domain",
        target: "data",
    },
    {
        name: "application must not import infrastructure",
        sourcePath: "src/application/services/LessonUseCase.ts",
        importPath: "$infrastructure/adapters/LessonCatalogAdapter",
        resolvedPath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        ruleId: "application-boundary",
        sourceLayer: "application",
        target: "infrastructure",
    },
    {
        name: "application must not import presentation adapter",
        sourcePath: "src/application/services/LessonUseCase.ts",
        importPath: "$presentation/adapters/navigation-bridge",
        resolvedPath: "src/presentation/adapters/navigation-bridge.ts",
        ruleId: "application-boundary",
        sourceLayer: "application",
        target: "presentation-adapter",
    },
    {
        name: "application must not import presentation",
        sourcePath: "src/application/services/LessonUseCase.ts",
        importPath: "$presentation/formatters/navigation",
        resolvedPath: "src/presentation/formatters/navigation.ts",
        ruleId: "application-boundary",
        sourceLayer: "application",
        target: "presentation",
    },
    {
        name: "application must not import UI",
        sourcePath: "src/application/services/LessonUseCase.ts",
        importPath: "$layouts/NotesLayout.astro",
        resolvedPath: "src/layouts/NotesLayout.astro",
        ruleId: "application-boundary",
        sourceLayer: "application",
        target: "ui",
    },
    {
        name: "application must not import generated data",
        sourcePath: "src/application/services/LessonUseCase.ts",
        importPath: "$data/lesson-metadata.generated.json",
        resolvedPath: "src/data/lesson-metadata.generated.json",
        ruleId: "application-boundary",
        sourceLayer: "application",
        target: "generated-data",
    },
    {
        name: "application must not import data",
        sourcePath: "src/application/services/LessonUseCase.ts",
        importPath: "$data/course-structure",
        resolvedPath: "src/data/course-structure.ts",
        ruleId: "application-boundary",
        sourceLayer: "application",
        target: "data",
    },
    {
        name: "infrastructure must not import presentation adapter",
        sourcePath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        importPath: "$presentation/adapters/navigation-bridge",
        resolvedPath: "src/presentation/adapters/navigation-bridge.ts",
        ruleId: "infrastructure-boundary",
        sourceLayer: "infrastructure",
        target: "presentation-adapter",
    },
    {
        name: "infrastructure must not import presentation",
        sourcePath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        importPath: "$presentation/formatters/navigation",
        resolvedPath: "src/presentation/formatters/navigation.ts",
        ruleId: "infrastructure-boundary",
        sourceLayer: "infrastructure",
        target: "presentation",
    },
    {
        name: "infrastructure must not import UI",
        sourcePath: "src/infrastructure/adapters/LessonCatalogAdapter.ts",
        importPath: "$components/ui/list/List",
        resolvedPath: "src/components/ui/list/List.astro",
        ruleId: "infrastructure-boundary",
        sourceLayer: "infrastructure",
        target: "ui",
    },
    {
        name: "presentation adapter must not import component",
        sourcePath: "src/presentation/adapters/navigation-bridge.ts",
        importPath: "$components/navigation/LessonSidebar",
        resolvedPath: "src/components/navigation/LessonSidebar.tsx",
        ruleId: "presentation-adapter-boundary",
        sourceLayer: "presentation-adapter",
        target: "ui",
    },
    {
        name: "presentation adapter must not import layout",
        sourcePath: "src/presentation/adapters/navigation-bridge.ts",
        importPath: "$layouts/NotesLayout.astro",
        resolvedPath: "src/layouts/NotesLayout.astro",
        ruleId: "presentation-adapter-boundary",
        sourceLayer: "presentation-adapter",
        target: "ui",
    },
    {
        name: "presentation adapter must not import page",
        sourcePath: "src/presentation/adapters/navigation-bridge.ts",
        importPath: "$pages/notes/index.astro",
        resolvedPath: "src/pages/notes/index.astro",
        ruleId: "presentation-adapter-boundary",
        sourceLayer: "presentation-adapter",
        target: "ui",
    },
    {
        name: "UI must not import domain",
        sourcePath: "src/components/notes/LessonMetaPanel.astro",
        importPath: "$domain/value-objects/LessonHref",
        resolvedPath: "src/domain/value-objects/LessonHref.ts",
        ruleId: "ui-boundary",
        sourceLayer: "ui",
        target: "domain",
    },
    {
        name: "UI must not import application",
        sourcePath: "src/pages/notes/index.astro",
        importPath: "$application/services/LessonNavigationService",
        resolvedPath: "src/application/services/LessonNavigationService.ts",
        ruleId: "ui-boundary",
        sourceLayer: "ui",
        target: "application",
    },
    {
        name: "UI must not import infrastructure",
        sourcePath: "src/components/notes/LessonMetaPanel.astro",
        importPath: "$infrastructure/adapters/LessonMetadataAdapter",
        resolvedPath: "src/infrastructure/adapters/LessonMetadataAdapter.ts",
        ruleId: "ui-boundary",
        sourceLayer: "ui",
        target: "infrastructure",
    },
];

describe("boundaryRules", () => {
    test("exposes the Cycle 2 rules in source-layer order", () => {
        expect(boundaryRules.map((rule) => rule.id)).toEqual(expectedRuleOrder);
    });

    test.each(expectedSources)("%s targets source layer %s", (id, source) => {
        expect(ruleById(id).source).toBe(source);
    });

    test("uses a single source-layer string for every rule", () => {
        expect(boundaryRules.every((rule) => typeof rule.source === "string")).toBe(true);
        expect(boundaryRules.every((rule) => !Array.isArray(rule.source))).toBe(true);
    });

    test("has unique rule ids and sources", () => {
        expect(new Set(boundaryRules.map((rule) => rule.id)).size).toBe(boundaryRules.length);
        expect(new Set(boundaryRules.map((rule) => rule.source)).size).toBe(boundaryRules.length);
    });

    test("has stable human-facing message and suggestion text for every rule", () => {
        for (const rule of boundaryRules) {
            expect(rule.message.trim()).not.toBe("");
            expect(rule.suggestion.trim()).not.toBe("");
        }

        expect(new Set(boundaryRules.map((rule) => rule.message)).size).toBe(boundaryRules.length);
    });
});

describe("Cycle 2 rule matrix", () => {
    test("domain allows only domain targets", () => {
        expect(ruleById("domain-boundary").allowedTargets).toEqual(["domain"]);
    });

    test("application allows only domain and application targets", () => {
        expect(ruleById("application-boundary").allowedTargets).toEqual([
            "domain",
            "application",
        ]);
    });

    test("domain and application forbid framework packages", () => {
        expect(ruleById("domain-boundary").forbiddenPackages).toEqual([
            "astro",
            "react",
            "zod",
        ]);
        expect(ruleById("application-boundary").forbiddenPackages).toEqual([
            "astro",
            "react",
            "zod",
        ]);
    });

    test.each([
        "infrastructure-boundary",
        "presentation-adapter-boundary",
        "ui-boundary",
    ])("%s does not forbid packages", (id) => {
        expect(ruleById(id).forbiddenPackages).toEqual([]);
    });

    test("UI depends on presentation-facing targets and forbids inner implementation layers", () => {
        const uiRule = ruleById("ui-boundary");

        expect(uiRule.allowedTargets).not.toEqual(expect.arrayContaining(["domain", "application"]));
        expect(uiRule.allowedTargets).toEqual(expect.arrayContaining(["presentation-adapter", "presentation", "utils"]));
        expect(uiRule.forbiddenTargets).toEqual(["domain", "application", "infrastructure"]);
    });

    test("generated data is blocked from inner layers and allowed from infrastructure", () => {
        expect(ruleById("domain-boundary").forbiddenTargets).toContain("generated-data");
        expect(ruleById("application-boundary").forbiddenTargets).toContain("generated-data");
        expect(ruleById("infrastructure-boundary").allowedTargets).toContain("generated-data");
    });

    test("presentation adapters forbid UI targets", () => {
        expect(ruleById("presentation-adapter-boundary").forbiddenTargets).toEqual(["ui"]);
    });
});

describe("Cycle 2 rule matrix evaluation", () => {
    test.each(allowedMatrixCases)("$name", (testCase) => {
        expectRuleCase({ ...testCase, expected: "allowed" });
    });

    test.each(forbiddenMatrixCases)("$name", (testCase) => {
        expectRuleCase({ ...testCase, expected: "violation" });
    });
});

describe("Cycle 2 package rules", () => {
    test.each([
        ["domain rejects astro", "src/domain/model/Lesson.ts", "astro", "astro", "domain-boundary"],
        ["domain rejects react", "src/domain/model/Lesson.ts", "react", "react", "domain-boundary"],
        [
            "domain rejects react subpaths",
            "src/domain/model/Lesson.ts",
            "react/jsx-runtime",
            "react",
            "domain-boundary",
        ],
        ["domain rejects zod", "src/domain/model/Lesson.ts", "zod", "zod", "domain-boundary"],
        [
            "domain rejects zod subpaths",
            "src/domain/model/Lesson.ts",
            "zod/v4",
            "zod",
            "domain-boundary",
        ],
        [
            "application rejects astro",
            "src/application/services/LessonUseCase.ts",
            "astro",
            "astro",
            "application-boundary",
        ],
        [
            "application rejects react",
            "src/application/services/LessonUseCase.ts",
            "react",
            "react",
            "application-boundary",
        ],
        [
            "application rejects react subpaths",
            "src/application/services/LessonUseCase.ts",
            "react/jsx-runtime",
            "react",
            "application-boundary",
        ],
        [
            "application rejects zod",
            "src/application/services/LessonUseCase.ts",
            "zod",
            "zod",
            "application-boundary",
        ],
        [
            "application rejects zod subpaths",
            "src/application/services/LessonUseCase.ts",
            "zod/v4",
            "zod",
            "application-boundary",
        ],
    ])("%s", (_name, sourcePath, importPath, packageName, ruleId) => {
        const result = evaluateBoundaryRules(
            sourcePath,
            importRecord(importPath),
        );

        expect(result.status).toBe("violation");
        expect(result.violation).toMatchObject({
            ruleId,
            packageName,
            target: "external-package",
            reason: "forbidden-package",
        });
    });

    test.each([
        [
            "infrastructure may import zod",
            "src/infrastructure/adapters/LessonMetadataAdapter.ts",
            "zod/v4",
        ],
        [
            "presentation adapters may import react",
            "src/presentation/adapters/navigation-bridge.ts",
            "react",
        ],
        ["UI may import astro", "src/layouts/NotesLayout.astro", "astro"],
    ])("%s", (_name, sourcePath, importPath) => {
        const result = evaluateBoundaryRules(sourcePath, importRecord(importPath));

        expect(result.status).toBe("allowed");
    });
});

describe("Cycle 2 generated data rules", () => {
    test.each([
        [
            "domain rejects generated JSON",
            "src/domain/model/Lesson.ts",
            "$data/lesson-metadata.generated.json",
            "src/data/lesson-metadata.generated.json",
            "domain-boundary",
        ],
        [
            "domain rejects generated JSON-LD",
            "src/domain/model/Lesson.ts",
            "$data/bibliography/catalog.generated.jsonld",
            "src/data/bibliography/catalog.generated.jsonld",
            "domain-boundary",
        ],
        [
            "application rejects generated JSON",
            "src/application/services/LessonUseCase.ts",
            "$data/lesson-metadata.generated.json",
            "src/data/lesson-metadata.generated.json",
            "application-boundary",
        ],
        [
            "application rejects generated JSON-LD",
            "src/application/services/LessonUseCase.ts",
            "$data/bibliography/catalog.generated.jsonld",
            "src/data/bibliography/catalog.generated.jsonld",
            "application-boundary",
        ],
    ])("%s", (_name, sourcePath, importPath, generatedPath, ruleId) => {
        const result = evaluateBoundaryRules(
            sourcePath,
            importRecord(importPath),
            resolvedPath(generatedPath),
        );

        expect(result.status).toBe("violation");
        expect(result.violation).toMatchObject({
            ruleId,
            target: "generated-data",
        });
    });

    test.each([
        [
            "infrastructure allows generated JSON",
            "$data/lesson-metadata.generated.json",
            "src/data/lesson-metadata.generated.json",
        ],
        [
            "infrastructure allows generated JSON-LD",
            "$data/bibliography/catalog.generated.jsonld",
            "src/data/bibliography/catalog.generated.jsonld",
        ],
    ])("%s", (_name, importPath, generatedPath) => {
        const result = evaluateBoundaryRules(
            "src/infrastructure/adapters/LessonMetadataAdapter.ts",
            importRecord(importPath),
            resolvedPath(generatedPath),
        );

        expect(result.status).toBe("allowed");
    });
});

describe("Cycle 2 type-only imports", () => {
    test.each([
        [
            "domain type-only import from application fails",
            "src/domain/model/Lesson.ts",
            "$application/ports/LessonRepository",
            "src/application/ports/LessonRepository.ts",
            "domain-boundary",
        ],
        [
            "application type-only import from infrastructure fails",
            "src/application/services/LessonUseCase.ts",
            "$infrastructure/adapters/LessonCatalogAdapter",
            "src/infrastructure/adapters/LessonCatalogAdapter.ts",
            "application-boundary",
        ],
        [
            "UI type-only import from infrastructure fails",
            "src/components/notes/LessonMetaPanel.astro",
            "$infrastructure/adapters/LessonMetadataAdapter",
            "src/infrastructure/adapters/LessonMetadataAdapter.ts",
            "ui-boundary",
        ],
        [
            "UI type-only import from application fails",
            "src/components/notes/LessonMetaPanel.astro",
            "$application/ports",
            "src/application/ports/index.ts",
            "ui-boundary",
        ],
    ])("%s", (_name, sourcePath, importPath, targetPath, ruleId) => {
        const result = evaluateBoundaryRules(
            sourcePath,
            importRecord(importPath, "type-import"),
            resolvedPath(targetPath),
        );

        expect(result.status).toBe("violation");
        expect(result.violation).toMatchObject({
            importKind: "type",
            ruleId,
        });
    });
});

describe("Cycle 2 exact exceptions", () => {
    const exception = {
        sourcePath: "src/application/services/LessonUseCase.ts",
        importTarget: "src/data/lesson-metadata.generated.json",
        reason: "Temporary transition while generated metadata access moves behind an adapter.",
        note: "Remove once the infrastructure adapter owns this import.",
    };

    test("exact declared exception suppresses a violation and returns metadata", () => {
        const result = evaluateBoundaryRules(
            "src/application/services/LessonUseCase.ts",
            importRecord("$data/lesson-metadata.generated.json"),
            resolvedPath("src/data/lesson-metadata.generated.json"),
            undefined,
            [exception],
        );

        expect(result).toEqual({
            status: "skipped-by-exception",
            exception,
        });
    });

    test("same source with different target still fails", () => {
        const result = evaluateBoundaryRules(
            "src/application/services/LessonUseCase.ts",
            importRecord("$data/other.generated.json"),
            resolvedPath("src/data/other.generated.json"),
            undefined,
            [exception],
        );

        expect(result.status).toBe("violation");
    });

    test("different source with same target still fails", () => {
        const result = evaluateBoundaryRules(
            "src/application/services/OtherUseCase.ts",
            importRecord("$data/lesson-metadata.generated.json"),
            resolvedPath("src/data/lesson-metadata.generated.json"),
            undefined,
            [exception],
        );

        expect(result.status).toBe("violation");
    });

    test("checkLayerBoundaries omits skipped exceptions from the public list", async () => {
        const violations = await checkLayerBoundaries(
            [{
                path: "src/application/services/LessonUseCase.ts",
                text: "import metadata from \"$data/lesson-metadata.generated.json\";",
            }],
            {
                tsconfig: { config: {} },
                exceptions: [exception],
            },
        );

        expect(violations).toEqual([]);
    });
});

describe("allowedExceptions", () => {
    test("starts empty by default", () => {
        expect(allowedExceptions).toEqual([]);
    });
});

describe("initialBoundaryRules", () => {
    test("uses the Cycle 2 rule matrix", () => {
        expect(initialBoundaryRules).toBe(boundaryRules);
    });
});
