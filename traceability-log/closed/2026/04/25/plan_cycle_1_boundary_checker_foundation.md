# [PLAN] Cycle 1: Boundary Checker Foundation

> **Implementation status:** Completed. The checker foundation was implemented with dependency-backed file discovery, import extraction, alias resolution, glob-based rule matching, focused Vitest coverage, and a standalone CLI. The command is intentionally not wired into `pnpm check` yet.

## Summary

Create the first executable vertical slice of the architecture boundary checker for `astro-website`, using dedicated dev dependencies from the beginning instead of a dependency-free parser.

This cycle proves:

1. files can be discovered reliably;
2. imports can be extracted from `.ts`, `.tsx`, and `.astro`;
3. import targets can be normalized through aliases and relative paths;
4. source and target paths can be matched against declarative boundary rules;
5. basic architectural violations can be reported in an actionable format.

This cycle still should **not** encode the full layer matrix. It should establish a robust, testable foundation that Cycle 2 can expand without replacing the parser, scanner, resolver, or matcher.

---

## Mandatory Dev Dependencies

Add these as dev dependencies in Cycle 1:

```bash
pnpm add -D es-module-lexer globby picomatch get-tsconfig
```

Use them as follows:

| Dependency        | Purpose                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `es-module-lexer` | Extract ESM imports, exports, and string-literal dynamic imports. It is specifically designed to return import/export locations and supports dynamic import detection. ([npm][1]) |
| `globby`          | Discover source files using include/exclude glob patterns. It provides a Promise API, multiple patterns, and negated patterns over `fast-glob`. ([npm][2])                        |
| `picomatch`       | Match rule source/target patterns such as `src/domain/**` and `src/infrastructure/**`. It is a small glob matcher with Bash-style glob support. ([npm][3])                        |
| `get-tsconfig`    | Load and parse `tsconfig.json`, including path alias configuration, instead of duplicating alias data manually. ([npm][4])                                                        |

Do **not** introduce `dependency-cruiser` or `eslint-plugin-boundaries` in this cycle. They remain valid alternatives if the custom checker grows too much, but Cycle 1 should keep the project-specific checker because it needs custom Astro handling, custom diagnostics, and an architecture-specific output format.

---

## Revised Architecture

The checker should now be designed around explicit adapters for each responsibility:

```txt
File discovery      -> globby
Astro extraction    -> frontmatter extractor
Import extraction   -> es-module-lexer
Alias loading       -> get-tsconfig
Glob matching       -> picomatch
Rule evaluation     -> local declarative rule engine
Violation formatting -> local formatter
CLI exit code       -> thin CLI wrapper
```

The important change is that parsing, matching, and config loading are no longer “maybe custom later” concerns. They are first-class dependencies in the design.

---

## Proposed File Layout

```txt
scripts/
  check-layer-boundaries.mjs
  lib/
    layer-boundary-checker.mjs
    layer-boundary-rules.mjs
    layer-boundary-aliases.mjs
    layer-boundary-files.mjs
    layer-boundary-imports.mjs
    layer-boundary-paths.mjs
  __tests__/
    layer-boundary-checker.test.ts
    layer-boundary-imports.test.ts
    layer-boundary-paths.test.ts
```

This split is now justified because the dependency-backed responsibilities are distinct:

- `layer-boundary-files.mjs`: wraps `globby`;
- `layer-boundary-imports.mjs`: wraps `es-module-lexer` and Astro frontmatter handling;
- `layer-boundary-aliases.mjs`: wraps `get-tsconfig`;
- `layer-boundary-paths.mjs`: normalizes paths and resolves aliases;
- `layer-boundary-rules.mjs`: owns declarative rules and `picomatch` matchers;
- `layer-boundary-checker.mjs`: orchestrates the pipeline.

Keep each function short and composable.

---

## Revised Public Checker API

Expose the core API from `layer-boundary-checker.mjs`:

```ts
export async function discoverSourceFiles(
    options: BoundaryCheckerOptions,
): Promise<SourceFile[]>;

export async function extractImports(
    sourceText: string,
    filePath: string,
): Promise<ImportRecord[]>;

export function resolveImportTarget(
    importTarget: string,
    sourceFile: string,
    options: BoundaryCheckerOptions,
): ResolvedImportTarget;

export async function checkLayerBoundaries(
    files: SourceFile[],
    options: BoundaryCheckerOptions,
): Promise<BoundaryViolation[]>;

export function formatViolations(
    violations: BoundaryViolation[],
): string;
```

Because `es-module-lexer` needs initialization, `extractImports` and `checkLayerBoundaries` should be async.

Use explicit data structures:

```ts
export type SourceFile = {
    path: string;
    text: string;
};

export type ImportRecord = {
    sourceFile: string;
    target: string;
    kind:
        | "static-import"
        | "side-effect-import"
        | "type-import"
        | "re-export"
        | "type-re-export"
        | "dynamic-import";
    location?: {
        line: number;
        column: number;
    };
};

export type ResolvedImportTarget = {
    original: string;
    resolvedPath?: string;
    packageName?: string;
    isRelative: boolean;
    isAlias: boolean;
    isPackage: boolean;
    isResolvable: boolean;
};

export type BoundaryViolation = {
    sourceFile: string;
    importTarget: string;
    resolvedTarget?: string;
    ruleId: string;
    message: string;
    suggestion: string;
};
```

---

## Key Design Decisions

### 1. Use `es-module-lexer` behind an extraction adapter

Do not let rule tests depend directly on `es-module-lexer` output.

Create a local adapter:

```ts
export async function extractImports(sourceText, filePath) {
    const moduleText = extractModuleText(sourceText, filePath);
    const records = await extractModuleImports(moduleText, filePath);
    return classifyImportRecords(records, moduleText, filePath);
}
```

This keeps the checker independent from raw lexer details.

The adapter should classify:

```ts
import { x } from "$domain/x";
import type { x } from "$domain/x";
import "$domain/register";
export { x } from "$domain/x";
export type { x } from "$domain/x";
const module = await import("$domain/x");
```

The lexer gives target ranges; local source-slice inspection can classify whether a record is `import type`, `export type`, side-effect import, or dynamic import.

---

### 2. Keep Astro support intentionally narrow

For `.astro`, extract only frontmatter:

```astro
---
import type { Lesson } from "$domain/lesson";
import Layout from "$presentation/adapters/LayoutBridge";
---
```

Then pass that frontmatter content to the same import extractor.

Do not parse rendered HTML, expressions, markdown-like content, or scripts inside the template section during Cycle 1.

This gives enough coverage for architectural imports without making the checker an Astro compiler.

---

### 3. Use `get-tsconfig` for alias loading

Cycle 1 should not duplicate `tsconfig.json` paths by hand unless `get-tsconfig` cannot find a config.

Preferred behavior:

1. load `tsconfig.json`;
2. read `compilerOptions.baseUrl`;
3. read `compilerOptions.paths`;
4. convert aliases to project-relative prefix mappings;
5. merge with safe fallback aliases only when missing.

Fallback aliases:

```ts
const fallbackAliases = {
    "~": "src",
    "$domain": "src/domain",
    "$application": "src/application",
    "$infrastructure": "src/infrastructure",
    "$presentation": "src/presentation",
    "$utils": "src/utils",
};
```

Tests should verify both:

- aliases loaded from a fake config object;
- fallback aliases when no config is available.

---

### 4. Use `picomatch` for rule matching

Do not implement custom glob logic with `startsWith`.

Use `picomatch` to compile rule patterns once:

```ts
const sourceMatcher = picomatch(rule.source);
const targetMatcher = picomatch(rule.forbiddenTargets);
```

This makes Cycle 2 easier because the full rule matrix can add patterns without changing the matcher.

Keep a separate `classifyProjectPath` helper for readable diagnostics, but do not make it the only enforcement mechanism.

---

### 5. Use `globby` for CLI file discovery

The CLI should use `globby` with explicit patterns:

```ts
const sourcePatterns = [
    "src/**/*.{ts,tsx,astro}",
    "!src/**/*.d.ts",
];
```

Unit tests should still use in-memory fixtures. Add only a small integration-style test for file discovery if it can be done cleanly.

---

## Initial Rules for Cycle 1

Keep only two rules.

### Rule 1: Domain does not depend outward

`src/domain/**` must not import:

```txt
src/application/**
src/infrastructure/**
src/presentation/**
astro
react
zod
```

This should catch both alias imports and relative imports after resolution.

Forbidden examples:

```ts
import { NavigationService } from "$application/ports";
import { LessonCatalogAdapter } from "$infrastructure/adapters/LessonCatalogAdapter";
import { z } from "zod";
```

---

### Rule 2: UI surfaces do not import infrastructure directly

The following paths must not import infrastructure directly:

```txt
src/components/**
src/layouts/**
src/pages/**
```

Forbidden target:

```txt
src/infrastructure/**
```

Allowed alternative:

```txt
src/presentation/adapters/**
```

---

## Rule Table

Define the rules declaratively:

```ts
export const initialBoundaryRules = [
    {
        id: "domain-must-not-import-outer-layers",
        source: ["src/domain/**"],
        forbiddenTargets: [
            "src/application/**",
            "src/infrastructure/**",
            "src/presentation/**",
        ],
        forbiddenPackages: ["astro", "react", "zod"],
        message:
            "Domain code must not import application, infrastructure, presentation, or UI framework dependencies.",
        suggestion:
            "Move the dependency behind a domain contract or invert the dependency direction.",
    },
    {
        id: "ui-must-not-import-infrastructure",
        source: [
            "src/components/**",
            "src/layouts/**",
            "src/pages/**",
        ],
        forbiddenTargets: ["src/infrastructure/**"],
        message: "UI surfaces must not import infrastructure directly.",
        suggestion: "Expose this use case through src/presentation/adapters.",
    },
];
```

Cycle 2 should extend this table, not replace it.

---

## Revised TDD Flow

### Step 0: Add dependency baseline

Add mandatory dependencies:

```bash
pnpm add -D es-module-lexer globby picomatch get-tsconfig
```

Add a small dependency smoke test or import test proving the checker can load them in the current ESM environment:

```ts
test("loads boundary checker dependencies", async () => {
    await expect(import("es-module-lexer")).resolves.toBeDefined();
    await expect(import("globby")).resolves.toBeDefined();
    await expect(import("picomatch")).resolves.toBeDefined();
    await expect(import("get-tsconfig")).resolves.toBeDefined();
});
```

This is especially useful because the checker itself is `.mjs` while tests are `.ts`.

---

### Step 1: Lock import extraction

Write failing tests for:

- static imports;
- side-effect imports;
- type imports;
- re-exports;
- type re-exports;
- dynamic string-literal imports;
- Astro frontmatter imports.

Implement the extractor using:

- a narrow Astro frontmatter extraction helper;
- `es-module-lexer` for module import ranges;
- local classification over source slices.

Use DDT for repeated import forms.

---

### Step 2: Lock file discovery

Add tests for the `globby` wrapper where practical:

- includes `.ts`;
- includes `.tsx`;
- includes `.astro`;
- excludes `.d.ts`;
- excludes files outside `src`.

Keep most tests in-memory, but one filesystem-backed test is acceptable for `discoverSourceFiles` because file discovery is inherently filesystem-bound.

---

### Step 3: Lock alias loading and target resolution

Write failing tests for:

- aliases loaded from `tsconfig.json`;
- fallback aliases;
- relative import resolution;
- package import classification;
- unresolved local imports;
- equivalent path normalization.

Implement:

```ts
loadAliasMappings(options);
resolveImportTarget(importTarget, sourceFile, options);
normalizeProjectPath(path);
```

The resolver should normalize equivalent paths such as:

```txt
$domain/lesson/Lesson
~/domain/lesson/Lesson
../domain/lesson/Lesson
src/domain/lesson/Lesson
```

---

### Step 4: Lock glob-based rule evaluation

Write DDT cases for:

- domain importing domain: passes;
- domain importing application: fails;
- domain importing infrastructure: fails;
- domain importing presentation: fails;
- domain importing `zod`: fails;
- UI importing presentation adapter: passes;
- UI importing infrastructure: fails.

Implement rule matching using `picomatch`.

---

### Step 5: Lock violation formatting

Assert structured violations first:

- `sourceFile`;
- `importTarget`;
- `resolvedTarget`;
- `ruleId`;
- `message`;
- `suggestion`.

Then add one formatted-output test.

Example output:

```txt
Layer boundary violation: ui-must-not-import-infrastructure

Source:
  src/components/navigation/Nav.astro

Import:
  $infrastructure/adapters/LessonCatalogAdapter

Resolved target:
  src/infrastructure/adapters/LessonCatalogAdapter

Rule:
  UI surfaces must not import infrastructure directly.

Suggested fix:
  Expose this use case through src/presentation/adapters.
```

---

### Step 6: Add the CLI wrapper

`scripts/check-layer-boundaries.mjs` should:

1. load options;
2. discover files with `globby`;
3. run `checkLayerBoundaries`;
4. print formatted violations;
5. exit `0` when clean;
6. exit non-zero when violations exist.

Do not wire the command into `package.json` or CI yet.

---

## Test Strategy

Use BDD-style names and DDT for repeated syntax or rule matrices.

Recommended test files:

```txt
scripts/__tests__/layer-boundary-imports.test.ts
scripts/__tests__/layer-boundary-paths.test.ts
scripts/__tests__/layer-boundary-checker.test.ts
```

### Import extraction tests

```ts
describe("extractImports", () => {
  test.each([
    ["static import", 'import { x } from "$domain/x"', "static-import"],
    ["type import", 'import type { x } from "$domain/x"', "type-import"],
    ["side-effect import", 'import "$domain/register"', "side-effect-import"],
    ["re-export", 'export { x } from "$domain/x"', "re-export"],
    ["type re-export", 'export type { x } from "$domain/x"', "type-re-export"],
    ["dynamic import", 'await import("$domain/x")', "dynamic-import"],
  ])("extracts %s", ...)
})
```

### Path resolution tests

Use DDT for equivalent path normalization:

```ts
test.each([
  ["$domain/lesson/Lesson", "src/domain/lesson/Lesson"],
  ["~/domain/lesson/Lesson", "src/domain/lesson/Lesson"],
  ["../domain/lesson/Lesson", "src/domain/lesson/Lesson"],
])("normalizes %s to %s", ...)
```

### Rule evaluation tests

Use DDT for allowed/forbidden source-target pairs.

### Property-based tests

Because path normalization can easily regress, add a small PBT test **only if the project already has a property-testing dependency available**. Otherwise, defer PBT to Cycle 2.

A useful property would be:

> Normalizing a path with redundant `.` segments preserves its project-area classification.

Do not add another new dependency only for PBT in this cycle unless the repository already standardizes on one.

---

## Verification

Run:

```bash
pnpm add -D es-module-lexer globby picomatch get-tsconfig
pnpm vitest run scripts/__tests__/layer-boundary-imports.test.ts
pnpm vitest run scripts/__tests__/layer-boundary-paths.test.ts
pnpm vitest run scripts/__tests__/layer-boundary-checker.test.ts
node scripts/check-layer-boundaries.mjs
```

Do not yet add:

```json
{
    "scripts": {
        "check:architecture": "node scripts/check-layer-boundaries.mjs"
    }
}
```

That remains Cycle 5.

---

## Acceptance Criteria

Cycle 1 is complete when:

- mandatory dev dependencies are installed;
- the checker loads in the project’s ESM environment;
- source files are discovered through `globby`;
- `.ts`, `.tsx`, and `.astro` files are scanned;
- Astro frontmatter imports are extracted;
- ESM imports, re-exports, and string-literal dynamic imports are detected through the import extractor;
- type-only imports are treated as architectural dependencies;
- aliases are loaded from `tsconfig.json` through `get-tsconfig` or fallback mappings;
- rule matching uses `picomatch`;
- the two initial rules detect violations;
- violation output is actionable;
- the CLI exits non-zero when violations exist;
- checker tests pass;
- no full layer matrix has been introduced;
- no production site behavior has changed.

---

## Risks and Mitigations

### Risk: dependency surface grows too early

Mitigation:

- keep all four dependencies dev-only;
- use each dependency for one clear responsibility;
- avoid adding architecture tools such as `dependency-cruiser` until the custom checker proves insufficient.

### Risk: `es-module-lexer` does not classify imports at the semantic level needed

Mitigation:

- use it for import target extraction;
- classify `import type`, `export type`, and side-effect imports through local source-slice inspection;
- keep classification tests strict.

### Risk: Astro support becomes too broad

Mitigation:

- parse only frontmatter in Cycle 1;
- document that template-level import-like strings are out of scope;
- expand only if a real architectural violation requires it.

### Risk: alias resolution diverges from TypeScript

Mitigation:

- load aliases from `tsconfig.json` through `get-tsconfig`;
- keep fallback aliases explicit and tested;
- report unresolved aliases clearly.

### Risk: `picomatch` patterns hide overly broad rules

Mitigation:

- test allowed cases as well as forbidden cases;
- compile rule matchers centrally;
- keep rule IDs and messages explicit.

---

## Assumptions

- The checker targets modern Node with ESM.
- Tests run through Vitest.
- Dependencies are added as dev dependencies only.
- The checker scans `.ts`, `.tsx`, and `.astro` under `src` by default.
- Cycle 1 may reveal real repository violations, but classification and fixes remain Cycle 3 work.
- The checker should prefer explicit, actionable false positives over silent false negatives at this stage.

---

[1]: https://www.npmjs.com/package/es-module-lexer?utm_source=chatgpt.com "es-module-lexer"
[2]: https://www.npmjs.com/package/globby?utm_source=chatgpt.com "globby"
[3]: https://www.npmjs.com/package/picomatch?utm_source=chatgpt.com "picomatch"
[4]: https://www.npmjs.com/package/get-tsconfig?utm_source=chatgpt.com "get-tsconfig"
