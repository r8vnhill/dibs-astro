# [PLAN] Strengthen Layer Boundary Checker Tests

Status: Implemented on 2026-04-29.

## Summary

Strengthen `scripts/__tests__/layer-boundary-checker.test.ts` as an integration-level contract for the public layer-boundary checker API.

Keep the current BDD/DDT style, but replace weak count-only assertions with behaviour-level expectations, add high-value integration edge cases, and tighten report-format assertions. Production behaviour should remain unchanged unless the new tests expose an existing correctness gap.

This refactor should not turn the integration test into a full parser/rule-engine test suite. Helper-level suites remain the primary home for detailed import extraction, path resolution, classification, and rule-policy coverage.

## Goals

- Make checker-level tests assert *what* boundary finding is reported, not only *how many* findings are reported.
- Preserve the public API focus of `checkLayerBoundaries`, the report formatter, and `runBoundaryCheck`.
- Increase confidence around real-world import forms used by TypeScript and Astro files.
- Keep test data readable, table-driven, and easy to extend.
- Avoid new dependencies.

## Non-Goals

- Do not replace the custom checker with ESLint or another boundary tool in this refactor.
- Do not redesign the rule engine.
- Do not move all lower-level path, parser, or classification tests into this file.
- Do not change production behaviour unless a new test reveals a real bug.

## Key Changes

### 1. Replace Count-Only Matrix Assertions

Convert the main `test.each` matrix from tuple-based cases with `expectedCount` into object-based DDT cases with structured expectations.

Introduce a local case type:

```ts
type BoundaryFinding = Awaited<ReturnType<typeof checkLayerBoundaries>>[number];

type BoundaryCase = {
  readonly name: string;
  readonly path: string;
  readonly text: string;
  readonly expectedFindings: readonly Partial<BoundaryFinding>[];
};
```

Each case should assert both:

```ts
expect(findings).toHaveLength(expectedFindings.length);
expect(findings).toMatchObject(expectedFindings);
```

Expected partial fields should include, when relevant:

- `ruleId`
- `sourceFile`
- `sourceLayer`
- `importTarget`
- `resolvedTarget`
- `target`
- `importKind`
- `reason`

Use partial assertions to keep tests resilient to harmless additions to the boundary-finding DTO.

### 2. Type-Check Shared Test Options

Derive test option types from public functions instead of relying on implicit object shapes.

```ts
type BoundaryCheckOptions = NonNullable<
  Parameters<typeof checkLayerBoundaries>[1]
>;

const cleanOptions = {
  tsconfig: { config: {} },
} satisfies BoundaryCheckOptions;
```

If `runBoundaryCheck` accepts a wider option shape, derive a separate type only for that function:

```ts
type RunBoundaryCheckOptions = NonNullable<
  Parameters<typeof runBoundaryCheck>[1]
>;
```

### 3. Add Small Test Helpers

Add minimal helpers to reduce repetition without hiding test intent.

```ts
const sourceFile = (path: string, text: string) => ({ path, text });

const checkSingleFile = (
  path: string,
  text: string,
  options: BoundaryCheckOptions = cleanOptions,
) => checkLayerBoundaries([sourceFile(path, text)], options);
```

Keep helpers local to the test file unless reused by multiple boundary suites.

### 4. Avoid Repeated Formatting Work

Where the report formatter is asserted multiple times, store its output once:

```ts
const output = formatBoundaryFindings(findings);

expect(output).toContain("Layer boundary finding: ui-boundary");
expect(output).toContain("src/components/navigation/Nav.astro");
expect(output).toContain("$infrastructure/adapters/LessonCatalogAdapter");
```

### 5. Strengthen Report Formatting Contract Tests

Add exact or near-exact output tests for:

- empty finding list;
- one finding with `resolvedTarget`;
- one package finding without `resolvedTarget`.

Prefer exact assertions for small outputs:

```ts
expect(formatBoundaryFindings([])).toBe("No layer boundary findings found.");
```

For longer outputs, use a local `output` variable and assert important lines/segments rather than fragile full snapshots.

## Test Additions

### Cycle 1: Structured Public API Assertions

Update the existing main matrix to object-based cases.

Cover at least:

- allowed same-layer import;
- forbidden domain → application import;
- forbidden domain → infrastructure import;
- allowed application → domain import;
- forbidden application → infrastructure import;
- allowed infrastructure → domain/application import;
- forbidden UI → infrastructure import;
- allowed presentation bridge import, if that is part of the intended architecture.

Each blocked case should assert the expected `ruleId`, `sourceLayer`, `target`, `importKind`, and `reason`.

### Cycle 2: Import Syntax Coverage

Add integration-level cases for import syntaxes that commonly regress:

```ts
export type { NavigationResult } from "$application/ports";
export * from "$infrastructure/adapters/LessonCatalogAdapter";
import { type NavigationResult } from "$application/ports";
```

Expected classification policy:

- `import type { X }` should be classified as `type`.
- `export type { X } from "..."` should be classified as `type`.
- `import { type X } from "..."` should be classified as `type` when all imported specifiers are type-only.
- Mixed value and inline type imports should be classified as `value`, because a runtime dependency still exists.

If this policy is not currently explicit, encode it in tests before changing implementation.

### Cycle 3: Relative Path Coverage

Add checker-level smoke cases proving aliases are not the only supported import shape.

Required cases:

- domain importing infrastructure through a relative path;
- UI importing infrastructure through a relative path.

Example:

```ts
test("reports domain imports of infrastructure through relative paths", async () => {
  const findings = await checkSingleFile(
    "src/domain/entity.ts",
    'import { Adapter } from "../infrastructure/adapters/LessonCatalogAdapter";',
  );

  expect(findings).toMatchObject([
    {
      ruleId: "domain-boundary",
      sourceLayer: "domain",
      target: "infrastructure",
      importKind: "value",
      reason: "forbidden-target",
    },
  ]);
});
```

Keep detailed path-normalisation combinations in `layer-boundary-paths.test.ts`.

### Cycle 4: False-Positive Coverage

Add integration-level tests that architectural dependencies are not inferred from plain text.

Required cases:

- ignore import-looking text inside comments;
- ignore import-looking text inside string literals;
- for Astro files, ignore import-looking text outside frontmatter.

Examples:

```ts
test("ignores import-looking text inside comments", async () => {
  const findings = await checkSingleFile(
    "src/domain/entity.ts",
    '// import { Adapter } from "$infrastructure/adapters/Adapter";',
  );

  expect(findings).toEqual([]);
});

test("ignores import-looking text outside Astro frontmatter", async () => {
  const findings = await checkSingleFile(
    "src/components/Card.astro",
    '<p>import { Adapter } from "$infrastructure/adapters/Adapter";</p>',
  );

  expect(findings).toEqual([]);
});
```

If fallback parsing intentionally scans raw text after parser failure, constrain the test to a syntactically valid file so it validates normal parser-first behaviour.

### Cycle 5: Path Portability

Add one checker-level case for Windows-style source paths:

```ts
test("normalizes Windows-style source paths before layer detection", async () => {
  const findings = await checkLayerBoundaries(
    [
      sourceFile(
        "src\\components\\navigation\\Nav.astro",
        '---\nimport { Adapter } from "$infrastructure/adapters/LessonCatalogAdapter";\n---',
      ),
    ],
    cleanOptions,
  );

  expect(findings).toMatchObject([
    {
      ruleId: "ui-boundary",
      sourceLayer: "ui",
      target: "infrastructure",
      reason: "forbidden-target",
    },
  ]);
});
```

Keep exhaustive separator and normalisation cases in the path helper suite.

### Cycle 6: Exception Behaviour

Keep the existing exact exception suppression test.

Add near-miss tests for:

- same import target but different source file;
- same source file but different import target.

Example:

```ts
test("does not apply exceptions to different source files", async () => {
  const findings = await checkSingleFile(
    "src/domain/other.ts",
    'import { z } from "zod";',
    {
      ...cleanOptions,
      exceptions: [
        {
          sourcePath: "src/domain/entity.ts",
          importTarget: "zod",
          reason: "Temporary migration exception",
        },
      ],
    },
  );

  expect(findings).toHaveLength(1);
});
```

The goal is to prove exceptions are exact and do not become broad allow-list rules by accident.

### Cycle 7: Aggregation and Ordering

Add tests for:

- multiple findings in one file;
- multiple files returning findings in deterministic order.

Expected ordering should be explicit. Recommended production ordering if not already guaranteed:

1. `sourceFile`
2. `importTarget`
3. `ruleId`

Example:

```ts
test("returns findings in deterministic order", async () => {
  const findings = await checkLayerBoundaries(
    [
      sourceFile(
        "src/components/B.astro",
        '---\nimport { B } from "$infrastructure/B";\n---',
      ),
      sourceFile(
        "src/components/A.astro",
        '---\nimport { A } from "$infrastructure/A";\n---',
      ),
    ],
    cleanOptions,
  );

  expect(findings.map((finding) => finding.sourceFile)).toEqual([
    "src/components/A.astro",
    "src/components/B.astro",
  ]);
});
```

### Cycle 8: Boundary Edge Cases

Add small public API edge cases:

- empty file list returns no findings;
- empty file text returns no findings;
- checker-level parse fallback smoke case only if helper-level import extraction tests do not already cover the path from malformed text to public API behaviour.

Avoid duplicating every parser fallback case here.

## Production Follow-Up If Tests Expose Gaps

### Deterministic Ordering

If ordering is unstable, sort once inside `checkLayerBoundaries` before returning:

```ts
findings.sort((left, right) =>
  left.sourceFile.localeCompare(right.sourceFile)
  || left.importTarget.localeCompare(right.importTarget)
  || left.ruleId.localeCompare(right.ruleId)
);
```

### Inline Type Import Classification

If `import { type X } from "..."` is reported as a value import, update classification intentionally:

- all specifiers are type-only → `type`;
- any runtime/value specifier exists → `value`.

Add helper-level tests in the classification suite before adjusting production code.

### Relative Import Misclassification

If relative imports are missed or classified incorrectly, fix the path resolution/classification layer rather than adding checker-level special cases.

Likely locations:

- `resolveImportTarget`
- import-target normalisation
- layer classification from resolved path

### False Positives

If comments or strings create findings, preserve parser-first behaviour and narrow any regex fallback.

Fallback parsing should not treat arbitrary comments, string literals, or Astro template text as architectural imports.

## Longer-Term Design Direction

Keep the custom checker if the project needs one or more of:

- Astro-aware parsing;
- dynamic import handling;
- DIBS-specific architectural semantics;
- custom CLI/report formatting;
- integration with course-specific conventions.

Do not replace it with ESLint tooling in this refactor.

Later, move further toward a config-driven policy model:

```ts
type Layer = "domain" | "application" | "infrastructure" | "presentation" | "ui";

type BoundaryRule = {
  readonly id: string;
  readonly source: Layer;
  readonly forbiddenTargets: readonly Layer[];
  readonly message: string;
  readonly suggestion: string;
};
```

The desired split is:

- generic rule engine;
- DIBS-specific boundary policy;
- path/import classification;
- report formatting;
- CLI adapter.

This keeps the checker extensible without making the current refactor larger than necessary.

## Verification

Run the focused boundary suites:

```bash
pnpm vitest run \
  scripts/__tests__/layer-boundary-checker.test.ts \
  scripts/__tests__/layer-boundary-imports.test.ts \
  scripts/__tests__/layer-boundary-rule-evaluation.test.ts \
  scripts/__tests__/layer-boundary-classification.test.ts \
  scripts/__tests__/layer-boundary-paths.test.ts \
  scripts/__tests__/layer-boundary-rules.test.ts
```

If production code changes are required, also run:

```bash
pnpm test:unit
```

If the project uses type-checking separately from unit tests, also run:

```bash
pnpm exec tsc --noEmit
```

## Acceptance Criteria

- The main checker test no longer relies on count-only assertions for architectural findings.
- Public API tests assert structured boundary-finding content.
- Import syntax, relative path, false-positive, exception, ordering, and portability behaviours are covered.
- Existing helper-level suites remain focused and are not duplicated wholesale in the integration test.
- No new dependencies are introduced.
- Production code changes, if any, are minimal and directly justified by failing tests.
- Focused boundary suites pass. Implemented verification: 6 checker-specific test files and 205 tests passed on 2026-04-29.
- Full unit suite passes if production code changed. Implemented verification: `pnpm test:unit` passed with 56 test files and 920 tests on 2026-04-29.

## Assumptions

- `scripts/__tests__/layer-boundary-checker.test.ts` should remain an integration-level public API suite.
- Existing helper-level tests remain the primary location for parser, resolver, classifier, and rule-policy details.
- The checker is intentionally custom because the project needs behaviour beyond a basic lint rule.
- No new dependencies are needed for this refactor.
