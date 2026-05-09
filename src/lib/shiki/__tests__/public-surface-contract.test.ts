/**
 * @file public-surface-contract.test.ts
 *
 * Data-driven compatibility test that locks the public surface of `src/lib/shiki/*`.
 *
 * This test enumerates every module and export expected by existing code. It is a one-release-cycle
 * bridge contract: the exports and module names documented here MUST remain available until Phase 6
 * removal, even though the implementations have migrated to `@ravenhill/shiki-core` or app-local
 * boundaries.
 *
 * When Phase 6 removes the bridge, this test should be deleted along with the modules it validates.
 */

import { describe, test, expect } from "vitest";
import * as languageAliases from "../language-aliases";
import * as transformers from "../transformers";
import * as highlighter from "../highlighter";
import * as service from "../service";
import * as config from "../config";

/**
 * Table of module names and the expected exports from each.
 *
 * This is the ground truth for the bridge contract. Each entry documents:
 * - module name (for display only)
 * - the actual module object
 * - expected export names (symbols that must exist)
 */
const BRIDGE_CONTRACT = [
    {
        name: "language-aliases",
        module: languageAliases,
        exports: [
            "resolveShikiLanguage",
            "normalizeShikiLanguage",
            "availableLanguages",
            "languageAliases",
            "isKnownShikiAlias",
            "resolveLanguage", // deprecated alias
        ],
    },
    {
        name: "transformers",
        module: transformers,
        exports: ["applyTailwindClasses", "transformerNotationLineTextColor"],
    },
    {
        name: "highlighter",
        module: highlighter,
        exports: ["highlightToHtml", "supportedThemes", "availableLanguages", "__resetHighlighterCacheForTests", "__setHighlighterForTests"],
    },
    {
        name: "service",
        module: service,
        exports: ["appShikiService"],
    },
    {
        name: "config",
        module: config,
        exports: ["SHIKI_DEFAULT_THEMES"],
    },
] as const;

describe("src/lib/shiki compatibility bridge", () => {
    test.each(BRIDGE_CONTRACT)(
        "keeps $name compatible for one release cycle",
        ({ name, module, exports }) => {
            for (const exportName of exports) {
                expect(module, `Expected ${name} to export ${exportName}`).toHaveProperty(exportName);
            }
        },
    );

    test("documents the removal checklist for Phase 6", () => {
        // This test documents what must be done when removing the bridge.
        // When this test is deleted, ensure:
        // 1. All components have migrated to root @ravenhill/shiki-core imports
        // 2. App-local src/lib/code-highlighting boundary is stable
        // 3. All imports of ~/lib/shiki/* have been replaced
        // 4. Integration tests still pass
        // 5. CHANGELOG entry records the bridge removal

        const removalChecklist = [
            "Delete src/lib/shiki/language-aliases.ts",
            "Delete src/lib/shiki/transformers.ts",
            "Delete src/lib/shiki/highlighter.ts",
            "Delete src/lib/shiki/service.ts",
            "Delete src/lib/shiki/config.ts",
            "Delete src/lib/shiki/__tests__/",
            "Update CHANGELOG.md to record Phase 6 bridge removal",
            "Remove this test file",
        ];

        expect(removalChecklist).toBeDefined();
        // This assertion exists only to document expectations, not to enforce them yet.
    });
});
