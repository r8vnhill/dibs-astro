# [DONE] Step 2: Add Pure Classification Helpers

Status: completed on 2026-04-25.

Implemented:

- `scripts/lib/layer-boundary-classification.mjs`
- `scripts/__tests__/layer-boundary-classification.test.ts`

Verification:

```text
scripts/__tests__/layer-boundary-classification.test.ts: 45 tests passing
scripts/__tests__/layer-boundary-paths.test.ts: 8 tests passing
scripts/__tests__/layer-boundary-imports.test.ts: 10 tests passing
scripts/__tests__/layer-boundary-checker.test.ts: 12 tests passing

Test files: 4 passed
Tests: 75 passed
```

No checker behaviour, rule evaluation, CLI output, or exit-code behaviour was changed.

## Summary

Introduce a pure, additive classification layer for the architecture boundary checker. This step defines how source files, resolved project targets, package imports, and import records are classified, but does not yet connect that classification to rule evaluation.

The goal is to make Step 3/4 easier, safer, and less ambiguous by giving the checker a deterministic vocabulary for architectural layers and import targets.

## Scope

Step 2 may add:

- `scripts/lib/layer-boundary-classification.mjs`
- `scripts/__tests__/layer-boundary-classification.test.ts`
- focused test fixtures or local test builders inside the new test file

Step 2 must not change:

- `checkLayerBoundaries(...)`
- `evaluateBoundaryRules(...)`
- `formatViolations(...)`
- `initialBoundaryRules`
- CLI output
- CLI exit-code behaviour
- existing import extraction
- existing path resolution
- existing baseline tests

## Non-Goals

- Do not enforce any new architectural rule.
- Do not exempt type-only imports.
- Do not infer package allowlists.
- Do not introduce filesystem access.
- Do not depend on `tsconfig`, `picomatch`, import extraction, or resolver internals.
- Do not re-export classification helpers from `layer-boundary-checker.mjs`.
- Do not call classification from `evaluateBoundaryRules(...)` yet.

## Design Constraints

- Classification must be pure and deterministic.
- All path inputs must be normalized through `normalizeProjectPath(...)` from `layer-boundary-paths.mjs`.
- Matching should use simple ordered predicates, not glob dependencies.
- Precedence-sensitive rules must be encoded explicitly and tested directly.
- Helper functions should remain small, preferably below 25 lines.
- Duplicated target unions should be minimized through shared constants.
- Tests should be BDD-style, with DDT tables for repeated classification matrices.

## New Module

Add:

```ts
scripts / lib / layer - boundary - classification.mjs;
```

Recommended internal structure:

```ts
const SOURCE_LAYERS = Object.freeze([
    ["domain", isDomainSource],
    ["application", isApplicationSource],
    ["infrastructure", isInfrastructureSource],
    ["presentation-adapter", isPresentationAdapterSource],
    ["ui", isUiSource],
]);

const TARGETS = Object.freeze([
    ["presentation-adapter", isPresentationAdapterTarget],
    ["generated-data", isGeneratedDataTarget],
    ["domain", isDomainTarget],
    ["application", isApplicationTarget],
    ["infrastructure", isInfrastructureTarget],
    ["presentation", isPresentationTarget],
    ["ui", isUiTarget],
    ["data", isDataTarget],
    ["utils", isUtilsTarget],
    ["assets", isAssetsTarget],
    ["styles", isStylesTarget],
]);
```

This keeps precedence visible and avoids scattering conditional logic across several helpers.

## Exported API

Export only these helpers:

```ts
classifySourcePath(sourcePath);
classifyResolvedTarget(resolvedPath);
classifyPackageImport(importPath);
classifyImport(importRecord, resolvedPath);
```

Use JSDoc typedefs in the `.mjs` file so the API remains type-checkable without converting the script module to TypeScript.

Suggested typedefs:

```ts
/**
 * @typedef {
 *   | "domain"
 *   | "application"
 *   | "infrastructure"
 *   | "presentation-adapter"
 *   | "ui"
 *   | "unknown"
 * } SourceLayer
 */

/**
 * @typedef {
 *   | "domain"
 *   | "application"
 *   | "infrastructure"
 *   | "presentation-adapter"
 *   | "presentation"
 *   | "ui"
 *   | "generated-data"
 *   | "data"
 *   | "utils"
 *   | "assets"
 *   | "styles"
 *   | "external-package"
 *   | "unknown"
 * } ImportTarget
 */

/**
 * @typedef {"value" | "type"} ClassifiedImportKind
 */
```

## Interfaces

### `classifySourcePath(sourcePath)`

Returns:

```ts
{
  path: string;
  layer:
    | "domain"
    | "application"
    | "infrastructure"
    | "presentation-adapter"
    | "ui"
    | "unknown";
}
```

Rules:

| Path prefix                    | Layer                  |
| ------------------------------ | ---------------------- |
| `src/domain/**`                | `domain`               |
| `src/application/**`           | `application`          |
| `src/infrastructure/**`        | `infrastructure`       |
| `src/presentation/adapters/**` | `presentation-adapter` |
| `src/components/**`            | `ui`                   |
| `src/layouts/**`               | `ui`                   |
| `src/pages/**`                 | `ui`                   |
| anything else                  | `unknown`              |

### `classifyResolvedTarget(resolvedPath)`

Returns one of:

```ts
"domain" | "application" | "infrastructure" | "presentation-adapter"
    | "presentation" | "ui" | "generated-data" | "data" | "utils"
    | "assets" | "styles" | "unknown";
```

Target precedence must be explicit:

1. `src/presentation/adapters/**` before `src/presentation/**`
2. generated data before generic data:
   - `src/data/**/*.generated.json`
   - `src/data/**/*.generated.jsonld`
3. remaining roots:
   - `src/domain/**`
   - `src/application/**`
   - `src/infrastructure/**`
   - `src/presentation/**`
   - `src/components/**`
   - `src/layouts/**`
   - `src/pages/**`
   - `src/data/**`
   - `src/utils/**`
   - `src/assets/**`
   - `src/styles/**`
4. unmatched project paths -> `unknown`

### `classifyPackageImport(importPath)`

Returns:

```ts
{
    target: "external-package";
    packageName: string;
}
```

Package-name normalization:

| Import path          | Package name    |
| -------------------- | --------------- |
| `astro`              | `astro`         |
| `astro:content`      | `astro:content` |
| `react/jsx-runtime`  | `react`         |
| `zod/v4`             | `zod`           |
| `@scope/pkg/subpath` | `@scope/pkg`    |

Rules:

- Scoped packages keep the first two segments.
- Unscoped packages keep the first segment.
- Astro virtual imports such as `astro:content` remain unchanged when they have no slash.
- The helper assumes the caller is passing a bare package import.
- Relative imports, absolute paths, and known project aliases should be handled by `classifyImport(...)`, not blindly treated as packages.

### `classifyImport(importRecord, resolvedPath)`

Returns:

```ts
{
  importPath: string;
  importKind: "value" | "type";
  resolvedPath?: string;
  packageName?: string;
  target:
    | "domain" | "application" | "infrastructure" | "presentation-adapter"
    | "presentation" | "ui" | "generated-data" | "data" | "utils"
    | "assets" | "styles" | "external-package" | "unknown";
}
```

Classification flow:

1. Normalize `importRecord.importPath`.
2. Map the raw import kind:
   - `"type-import"` -> `"type"`
   - `"type-re-export"` -> `"type"`
   - every other existing kind -> `"value"`
3. If `resolvedPath` is provided:
   - normalize it
   - classify it with `classifyResolvedTarget(...)`
   - include `resolvedPath` in the result
4. If `resolvedPath` is not provided and `importPath` is a bare package import:
   - classify it with `classifyPackageImport(...)`
   - include `packageName`
5. Otherwise:
   - return `target: "unknown"`

This keeps the helper honest: it classifies what the resolver already knows, but does not perform resolution itself.

## Import Path Category Rules

Add small private predicates to keep intent clear:

```ts
isRelativeImport(importPath);
isProjectAliasImport(importPath);
isBarePackageImport(importPath);
```

Suggested behaviour:

| Import path          | Category              |
| -------------------- | --------------------- |
| `./foo`              | relative              |
| `../foo`             | relative              |
| `/absolute/path`     | non-package / unknown |
| `~/utils/foo`        | project alias         |
| `$domain/foo`        | project alias         |
| `astro`              | bare package          |
| `astro:content`      | bare package          |
| `react/jsx-runtime`  | bare package          |
| `@scope/pkg/subpath` | bare package          |

Do not resolve project aliases in this step. If an alias import has no `resolvedPath`, classify it as `unknown`.

## Test Plan

Add:

```ts
scripts / __tests__ / layer - boundary - classification.test.ts;
```

Use BDD-style `describe(...)` blocks:

```ts
describe("classifySourcePath", () => {});
describe("classifyResolvedTarget", () => {});
describe("classifyPackageImport", () => {});
describe("classifyImport", () => {});
```

Use DDT tables for repeated classification cases.

### Source Classification Tests

Cover:

| Source path                                          | Expected layer         |
| ---------------------------------------------------- | ---------------------- |
| `src/domain/model/Lesson.ts`                         | `domain`               |
| `src/application/services/NavigationService.ts`      | `application`          |
| `src/infrastructure/content/LessonCatalogAdapter.ts` | `infrastructure`       |
| `src/presentation/adapters/navigation.ts`            | `presentation-adapter` |
| `src/components/ui/Card.astro`                       | `ui`                   |
| `src/layouts/LessonLayout.astro`                     | `ui`                   |
| `src/pages/index.astro`                              | `ui`                   |
| `scripts/lib/layer-boundary-checker.mjs`             | `unknown`              |

Also cover path normalization:

| Input                           | Expected normalized path     |
| ------------------------------- | ---------------------------- |
| `src\\domain\\model\\Lesson.ts` | `src/domain/model/Lesson.ts` |

### Target Classification Tests

Cover every target:

| Resolved path                                        | Expected target        |
| ---------------------------------------------------- | ---------------------- |
| `src/domain/model/Lesson.ts`                         | `domain`               |
| `src/application/ports/NavigationService.ts`         | `application`          |
| `src/infrastructure/content/LessonCatalogAdapter.ts` | `infrastructure`       |
| `src/presentation/adapters/navigation.ts`            | `presentation-adapter` |
| `src/presentation/navigation.ts`                     | `presentation`         |
| `src/components/ui/Card.astro`                       | `ui`                   |
| `src/layouts/LessonLayout.astro`                     | `ui`                   |
| `src/pages/index.astro`                              | `ui`                   |
| `src/data/bibliography/catalog.generated.json`       | `generated-data`       |
| `src/data/bibliography/catalog.generated.jsonld`     | `generated-data`       |
| `src/data/bibliography/catalog.json`                 | `data`                 |
| `src/utils/path.ts`                                  | `utils`                |
| `src/assets/logo.svg`                                | `assets`               |
| `src/styles/global.css`                              | `styles`               |
| `scripts/whatever.ts`                                | `unknown`              |

Precedence cases:

```ts
src/presentation/adapters/foo.ts -> presentation-adapter
src/presentation/foo.ts -> presentation
src/data/foo.generated.json -> generated-data
src/data/foo.generated.jsonld -> generated-data
src/data/foo.json -> data
```

### Package Normalization Tests

Cover:

| Import path          | Expected package |
| -------------------- | ---------------- |
| `astro`              | `astro`          |
| `astro:content`      | `astro:content`  |
| `react/jsx-runtime`  | `react`          |
| `zod/v4`             | `zod`            |
| `@scope/pkg/subpath` | `@scope/pkg`     |

### Import Classification Tests

Cover:

1. Resolved project import

```ts
classifyImport(
    { importPath: "~/domain/model/Lesson", kind: "static-import" },
    "src/domain/model/Lesson.ts",
);
```

Expected:

```ts
{
  importPath: "~/domain/model/Lesson",
  importKind: "value",
  resolvedPath: "src/domain/model/Lesson.ts",
  target: "domain",
}
```

2. Package import

```ts
classifyImport(
    { importPath: "react/jsx-runtime", kind: "static-import" },
    undefined,
);
```

Expected:

```ts
{
  importPath: "react/jsx-runtime",
  importKind: "value",
  packageName: "react",
  target: "external-package",
}
```

3. Type import

```ts
classifyImport(
    { importPath: "~/application/ports", kind: "type-import" },
    "src/application/ports/index.ts",
);
```

Expected `importKind: "type"` and `target: "application"`.

4. Type re-export

```ts
classifyImport(
    { importPath: "~/domain", kind: "type-re-export" },
    "src/domain/index.ts",
);
```

Expected `importKind: "type"` and `target: "domain"`.

5. Unknown unresolved project alias

```ts
classifyImport(
    { importPath: "~/unknown/path", kind: "static-import" },
    undefined,
);
```

Expected:

```ts
{
  importPath: "~/unknown/path",
  importKind: "value",
  target: "unknown",
}
```

6. Unknown resolved project path

```ts
classifyImport(
    { importPath: "../scripts/foo", kind: "static-import" },
    "scripts/foo.ts",
);
```

Expected `target: "unknown"`.

## Implementation Notes

- Prefer small predicate helpers over long `if/else` chains.
- Keep source and target classification separate even if some predicates overlap.
- Keep precedence encoded by array order, not by accidental conditional order.
- Use `Object.freeze(...)` for classifier tables to signal immutability.
- Do not introduce `picomatch`; simple prefix and suffix checks are enough for this step.
- Avoid throwing for unknown paths. Unknowns are valid classification outcomes.
- Avoid silently treating unresolved project aliases as packages.
- Do not special-case type imports beyond the `"type"` / `"value"` mapping.

## Verification Command

Run the new classification suite together with the existing checker baseline:

```sh
node ./node_modules/vitest/vitest.mjs run \
  scripts/__tests__/layer-boundary-classification.test.ts \
  scripts/__tests__/layer-boundary-paths.test.ts \
  scripts/__tests__/layer-boundary-imports.test.ts \
  scripts/__tests__/layer-boundary-checker.test.ts
```

## Acceptance Criteria

- The new classification helpers exist in `scripts/lib/layer-boundary-classification.mjs`.
- The module has no filesystem, resolver, `tsconfig`, or `picomatch` dependency.
- All returned paths are normalized project paths.
- Source classification covers all planned source layers.
- Target classification covers all planned targets.
- Precedence-sensitive target cases are tested.
- Package normalization is deterministic and tested.
- `classifyImport(...)` correctly distinguishes:
  - resolved project imports
  - unresolved bare packages
  - type imports
  - type re-exports
  - unknown unresolved project aliases
  - unknown resolved project paths
- Existing checker tests still pass unchanged.
- CLI behaviour remains unchanged.

## Risks and Mitigations

| Risk                                                  | Mitigation                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| Classification accidentally changes checker behaviour | Do not import the new module from checker code in Step 2.           |
| Package imports are confused with project aliases     | Add explicit `isBarePackageImport(...)` tests.                      |
| Target precedence regresses later                     | Keep precedence cases in dedicated tests.                           |
| Classification unions drift over time                 | Centralize known source layers and targets as constants.            |
| Tests become verbose                                  | Use DDT tables for repeated path-to-classification matrices.        |
| Later rules need richer metadata                      | Keep return objects extensible, but avoid adding unused fields now. |

## Reference Anchors

- Pure-function classification keeps this step testable and independent from I/O.
- Ordered predicate tables make precedence explicit and easier to review.
- BDD-style grouping keeps behavioural intent visible.
- DDT tables are appropriate here because most cases share the same assertion shape.
- Unknown classification is intentional: detection and enforcement belong to later steps.
