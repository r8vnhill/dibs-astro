# [PLAN] Cycle 2: Data-Driven Layer Rules

## Summary

Extend the Cycle 1 boundary checker from starter rules into a declarative, testable architecture rule matrix.

This cycle should make the checker capable of representing the intended layered dependency policy, but it must **not** audit, fix, or allowlist real repository violations yet. The outcome is a reliable rule engine and rule dataset, not a repository cleanup.

## Goals

- Encode the current architecture policy as data, not branching logic.
- Classify both project imports and package imports before rule evaluation.
- Support explicit, centrally declared exceptions.
- Preserve existing CLI/reporting contracts.
- Keep tests fixture-based and independent from the real repository state.

## Non-Goals

- No real repository architecture audit.
- No import refactors.
- No package script wiring.
- No Cycle 4 UI hardening.
- No broad UI-to-domain/application restrictions yet.
- No production runtime dependency.

---

## Proposed Module Structure

Prefer separating classification, rules, and evaluation so each part remains small and independently testable.

```text
scripts/lib/
  layer-boundary-classification.mjs
  layer-boundary-rules.mjs
  layer-boundary-evaluator.mjs
  layer-boundary-paths.mjs
  layer-boundary-imports.mjs
```

If Cycle 1 already has fewer files, keep the existing structure but preserve these conceptual seams:

- **path/import extraction**: resolves raw imports to project paths or package names.
- **classification**: maps resolved imports to architecture targets.
- **rule matrix**: declares source policies and explicit exceptions.
- **evaluation**: applies generic rules to classified imports.
- **formatting**: renders violations without owning rule logic.

---

## Architecture Target Model

Introduce a small normalized target vocabulary.

```ts
type ArchitectureTarget =
    | "domain"
    | "application"
    | "infrastructure"
    | "presentation-adapter"
    | "presentation"
    | "ui"
    | "generated-data"
    | "data"
    | "utils"
    | "assets"
    | "styles"
    | "external-package"
    | "unknown";
```

Classifications should distinguish **what was imported** from **how it was imported**.

```ts
type ImportClassification = {
    importPath: string;
    importKind: "value" | "type";
    resolvedPath?: string;
    packageName?: string;
    target: ArchitectureTarget;
};
```

Type-only imports must still be evaluated as architectural dependencies in Cycle 2. Keep `importKind` because it will be useful for future reporting or policy refinement, but do not exempt type imports.

---

## Source Layer Classification

Add source classification before rule evaluation.

```ts
type SourceClassification = {
    path: string;
    layer:
        | "domain"
        | "application"
        | "infrastructure"
        | "presentation-adapter"
        | "ui"
        | "unknown";
};
```

Recommended source mapping:

| Source path                    | Source layer           |
| ------------------------------ | ---------------------- |
| `src/domain/**`                | `domain`               |
| `src/application/**`           | `application`          |
| `src/infrastructure/**`        | `infrastructure`       |
| `src/presentation/adapters/**` | `presentation-adapter` |
| `src/components/**`            | `ui`                   |
| `src/layouts/**`               | `ui`                   |
| `src/pages/**`                 | `ui`                   |

Sources outside these paths should be classified as `unknown` and ignored by Cycle 2 unless explicitly covered by a rule.

---

## Target Classification

Classify resolved project paths using normalized architecture targets.

| Resolved path                    | Target                 |
| -------------------------------- | ---------------------- |
| `src/domain/**`                  | `domain`               |
| `src/application/**`             | `application`          |
| `src/infrastructure/**`          | `infrastructure`       |
| `src/presentation/adapters/**`   | `presentation-adapter` |
| `src/presentation/**`            | `presentation`         |
| `src/components/**`              | `ui`                   |
| `src/layouts/**`                 | `ui`                   |
| `src/pages/**`                   | `ui`                   |
| `src/data/**/*.generated.json`   | `generated-data`       |
| `src/data/**/*.generated.jsonld` | `generated-data`       |
| `src/data/**`                    | `data`                 |
| `src/utils/**`                   | `utils`                |
| `src/assets/**`                  | `assets`               |
| `src/styles/**`                  | `styles`               |

Package imports should be classified separately:

```ts
type PackageClassification = {
    target: "external-package";
    packageName: string;
};
```

Package matching should normalize scoped and subpath imports:

| Import               | Package name                                                       |
| -------------------- | ------------------------------------------------------------------ |
| `astro`              | `astro`                                                            |
| `astro:content`      | `astro:content` or `astro` depending on existing Cycle 1 behaviour |
| `react/jsx-runtime`  | `react`                                                            |
| `zod/v4`             | `zod`                                                              |
| `@scope/pkg/subpath` | `@scope/pkg`                                                       |

Use the same package-name normalization everywhere so `forbiddenPackages` remains reliable.

---

## Rule Data Contract

Replace `initialBoundaryRules` with stable rule groups.

```ts
type BoundaryRule = {
    id: string;
    source: SourceLayer;
    allowedTargets?: ArchitectureTarget[];
    forbiddenTargets?: ArchitectureTarget[];
    forbiddenPackages?: string[];
    message: string;
    suggestion: string;
};
```

Rules should be evaluated generically:

1. Find the rule for the source layer.
2. Classify the import target.
3. Check explicit exceptions.
4. Check forbidden packages.
5. Check forbidden targets.
6. Check allowed targets, when present.
7. Return a structured violation or no violation.

Do not encode rules like `if source === "domain"` inside `evaluateBoundaryRules(...)`.

---

## Rule Matrix

### Domain

Source: `src/domain/**`

Allowed targets:

```ts
["domain"];
```

Forbidden targets:

```ts
[
    "application",
    "infrastructure",
    "presentation-adapter",
    "presentation",
    "ui",
    "generated-data",
    "data",
];
```

Forbidden packages:

```ts
["astro", "react", "zod"];
```

Message:

> Domain code must stay framework-free and independent from outer layers.

Suggestion:

> Move framework, validation, data-loading, or adapter-specific logic to application or infrastructure, and expose only domain-level abstractions inward.

---

### Application

Source: `src/application/**`

Allowed targets:

```ts
["domain", "application"];
```

Forbidden targets:

```ts
[
    "infrastructure",
    "presentation-adapter",
    "presentation",
    "ui",
    "generated-data",
    "data",
];
```

Forbidden packages:

```ts
["astro", "react", "zod"];
```

Message:

> Application code may orchestrate domain use cases, but must not depend on infrastructure, UI, generated data, or framework packages.

Suggestion:

> Depend on domain abstractions or application ports, and move concrete framework/data access to infrastructure adapters.

---

### Infrastructure

Source: `src/infrastructure/**`

Allowed targets:

```ts
[
    "domain",
    "application",
    "infrastructure",
    "data",
    "generated-data",
    "utils",
];
```

Forbidden targets:

```ts
[
    "presentation-adapter",
    "presentation",
    "ui",
];
```

Forbidden packages:

```ts
[];
```

Message:

> Infrastructure may implement outer technical details, but must not depend on presentation or UI surfaces.

Suggestion:

> Keep UI-specific composition in presentation adapters or components, and expose infrastructure through application/domain contracts.

---

### Presentation Adapters

Source: `src/presentation/adapters/**`

Allowed targets:

```ts
[
    "domain",
    "application",
    "infrastructure",
    "presentation-adapter",
    "presentation",
    "utils",
];
```

Forbidden targets:

```ts
[
    "ui",
];
```

Forbidden packages:

```ts
[];
```

Message:

> Presentation adapters should compose application and infrastructure services, but must not import UI components, layouts, or pages.

Suggestion:

> Keep adapters as data/service bridges and let UI surfaces consume the adapter output.

---

### UI Surfaces

Sources:

```ts
[
    "src/components/**",
    "src/layouts/**",
    "src/pages/**",
];
```

Allowed targets:

```ts
[
    "presentation-adapter",
    "presentation",
    "ui",
    "assets",
    "styles",
    "utils",
    "domain",
    "application",
];
```

Forbidden targets:

```ts
[
    "infrastructure",
];
```

Forbidden packages:

```ts
[];
```

Message:

> UI surfaces must not import infrastructure directly.

Suggestion:

> Route infrastructure access through presentation adapters or application-facing services.

Important: allowing `domain` and `application` from UI is intentional in Cycle 2. Stricter UI dependency rules belong to Cycle 4 after the audit determines which couplings are acceptable.

---

## Exceptions

Add a central exception list near the rule matrix.

```ts
type BoundaryException = {
    id: string;
    source: string;
    target: string;
    reason: string;
    note?: string;
};
```

Recommended shape:

```ts
const allowedExceptions = [
    {
        id: "example-explicit-transition-only",
        source: "src/application/example.ts",
        target: "src/data/example.generated.jsonld",
        reason:
            "Temporary transition while bibliography data access is moved behind an application port.",
        note: "Remove once the infrastructure adapter owns this import.",
    },
];
```

Exception rules:

- Exceptions must be exact by default.
- Do not support broad globs in Cycle 2 unless there is already a real need.
- Every exception must include a human-readable `reason`.
- Skipped violations should carry exception metadata internally.
- `formatViolations(...)` should not print skipped violations.
- Tests should assert that exceptions suppress only the declared source/target pair.

Suggested internal evaluation result:

```ts
type BoundaryEvaluationResult =
    | {
        status: "allowed";
    }
    | {
        status: "skipped-by-exception";
        exception: BoundaryException;
    }
    | {
        status: "violation";
        violation: BoundaryViolation;
    };
```

`checkLayerBoundaries(...)` should continue returning only violations to preserve current behaviour.

---

## Violation Shape

Keep the current report fields, but make the internal violation explicit enough for tests.

```ts
type BoundaryViolation = {
    sourcePath: string;
    importPath: string;
    importKind: "value" | "type";
    resolvedTarget?: string;
    packageName?: string;
    sourceLayer: SourceLayer;
    target: ArchitectureTarget;
    ruleId: string;
    message: string;
    suggestion: string;
};
```

`formatViolations(...)` should continue reporting:

- source file
- raw import target
- resolved target, when available
- rule id
- message
- suggested fix

---

## Test Strategy

Add a new BDD/DDT-style suite:

```text
scripts/__tests__/layer-boundary-rules.test.ts
```

Use in-memory fixture files. Do not depend on real repository files.

Prefer table-driven tests for the matrix and explicit named tests for edge cases.

### Rule Matrix DDT

Create one table per source layer:

```ts
const ruleCases = [
    {
        name: "domain may import domain",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$domain/value/LessonId",
        resolvedPath: "src/domain/value/LessonId.ts",
        expected: "allowed",
    },
    {
        name: "domain must not import application",
        sourcePath: "src/domain/model/Lesson.ts",
        importPath: "$application/ports",
        resolvedPath: "src/application/ports/index.ts",
        expected: "violation",
        ruleId: "domain-boundary",
    },
];
```

Cover at minimum:

- one passing fixture per source layer
- one failing fixture per source layer
- every forbidden direction in the Cycle 2 matrix
- every allowed direction in the Cycle 2 matrix

### Package-Level Tests

Cover forbidden package imports from domain and application:

- `astro`
- `react`
- `react/jsx-runtime`
- `zod`
- `zod/v4`

Assert that:

- domain → `astro` fails
- domain → `react` fails
- domain → `zod` fails
- application → `astro` fails
- application → `react` fails
- application → `zod` fails

Do not forbid these packages globally unless a rule says so.

### Generated Data Tests

Cover:

- domain → generated JSON fails
- domain → generated JSON-LD fails
- application → generated JSON fails
- application → generated JSON-LD fails
- infrastructure → generated JSON passes
- infrastructure → generated JSON-LD passes

### Infrastructure Tests

Cover:

- infrastructure → domain passes
- infrastructure → application passes
- infrastructure → generated data passes
- infrastructure → UI fails
- infrastructure → presentation adapter fails

### Presentation Adapter Tests

Cover:

- presentation adapter → application passes
- presentation adapter → infrastructure passes
- presentation adapter → domain passes
- presentation adapter → presentation-local helper passes
- presentation adapter → component fails
- presentation adapter → layout fails
- presentation adapter → page fails

### UI Tests

Cover:

- UI → presentation adapter passes
- UI → UI helper/component passes
- UI → styles passes
- UI → assets passes
- UI → domain passes in Cycle 2
- UI → application passes in Cycle 2
- UI → infrastructure fails

### Type-Only Import Tests

Add explicit cases proving type-only imports are still checked:

- domain type-only import from application fails
- application type-only import from infrastructure fails
- UI type-only import from infrastructure fails

This prevents a common loophole where architectural dependency checks accidentally ignore type imports.

### Exception Tests

Cover:

- exact declared exception suppresses a violation
- same source with different target still fails
- different source with same target still fails
- exception metadata is returned by lower-level evaluation
- `checkLayerBoundaries(...)` omits skipped violations from the public violation list

### Classification Tests

Either extend `layer-boundary-paths.test.ts` or add focused tests in the new suite for:

- alias imports
- relative imports
- package imports
- package subpath normalization
- generated JSON/JSON-LD target classification
- unknown external packages
- unknown project paths

---

## Implementation Steps

### ~~Step 1: Lock Existing Behaviour~~

Status: completed on 2026-04-25.

Run the Cycle 1 checker-specific test set before changes:

```sh
node ./node_modules/vitest/vitest.mjs run scripts/__tests__/layer-boundary-paths.test.ts scripts/__tests__/layer-boundary-imports.test.ts scripts/__tests__/layer-boundary-checker.test.ts
```

Observed baseline:

```text
scripts/__tests__/layer-boundary-paths.test.ts: 8 tests passing
scripts/__tests__/layer-boundary-imports.test.ts: 10 tests passing
scripts/__tests__/layer-boundary-checker.test.ts: 12 tests passing

Test files: 3 passed
Tests: 30 passed
```

No rule-matrix work should start from a failing checker-specific baseline.

### ~~Step 2: Add Classification Helpers~~

Status: completed on 2026-04-25.

Implemented a pure additive classification module:

```text
scripts/lib/layer-boundary-classification.mjs
scripts/__tests__/layer-boundary-classification.test.ts
```

The helper layer classifies source paths, resolved targets, package imports, and import records without changing
`checkLayerBoundaries(...)`, `evaluateBoundaryRules(...)`, `formatViolations(...)`, `initialBoundaryRules`, CLI output,
or exit-code behaviour.

Observed focused gate:

```text
scripts/__tests__/layer-boundary-classification.test.ts: 45 tests passing
scripts/__tests__/layer-boundary-paths.test.ts: 8 tests passing
scripts/__tests__/layer-boundary-imports.test.ts: 10 tests passing
scripts/__tests__/layer-boundary-checker.test.ts: 12 tests passing

Test files: 4 passed
Tests: 75 passed
```

Add pure helpers for source and target classification.

Suggested functions:

```ts
classifySourcePath(sourcePath): SourceClassification
classifyResolvedTarget(resolvedPath): ArchitectureTarget
classifyPackageImport(importPath): PackageClassification
classifyImport(importRecord): ImportClassification
```

Keep each helper small and deterministic. These should be easy to test without filesystem access.

### ~~Step 3: Replace Starter Rules with Rule Groups~~

Status: completed on 2026-04-25.

Implemented the classification-shaped Cycle 2 rule matrix as canonical rule data:

```text
scripts/lib/layer-boundary-rules.mjs
scripts/__tests__/layer-boundary-rules.test.ts
```

The module now exports named source-layer rules, the ordered `boundaryRules` list, and an empty `allowedExceptions`
list. Runtime checker behaviour remains on the legacy glob-shaped starter rules through `initialBoundaryRules =
legacyInitialBoundaryRules`; Step 4 is the explicit migration point that should switch `initialBoundaryRules` to
`boundaryRules` after generic evaluation understands source-layer and target-category vocabulary.

Observed focused gate:

```text
scripts/__tests__/layer-boundary-rules.test.ts: 20 tests passing
scripts/__tests__/layer-boundary-classification.test.ts: 45 tests passing

Test files: 2 passed
Tests: 65 passed
```

Observed checker compatibility safety gate:

```text
scripts/__tests__/layer-boundary-checker.test.ts: 12 tests passing

Test files: 1 passed
Tests: 12 passed
```

Replace `initialBoundaryRules` with a declarative matrix.

Suggested exports:

```ts
export const boundaryRules = [
    domainBoundaryRule,
    applicationBoundaryRule,
    infrastructureBoundaryRule,
    presentationAdapterBoundaryRule,
    uiBoundaryRule,
];

export const allowedExceptions = [];
```

Use stable rule ids, for example:

```ts
"domain-boundary";
"application-boundary";
"infrastructure-boundary";
"presentation-adapter-boundary";
"ui-boundary";
```

Stable ids make tests and future reports easier to maintain.

### ~~Step 4: Make Rule Evaluation Generic~~

Status: completed on 2026-04-25.

Implemented classification-driven evaluation in:

```text
scripts/lib/layer-boundary-rule-evaluation.mjs
scripts/lib/layer-boundary-rules.mjs
scripts/lib/layer-boundary-checker.mjs
scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

`initialBoundaryRules` now points to `boundaryRules`. `evaluateBoundaryRules(...)` returns an internal status object
for allowed, skipped-by-exception, or violation results. `checkLayerBoundaries(...)` still returns only public
violations, and `formatViolations(...)` remains unchanged.

Observed focused gate:

```text
scripts/__tests__/layer-boundary-rules.test.ts: 20 tests passing
scripts/__tests__/layer-boundary-rule-evaluation.test.ts: 14 tests passing
scripts/__tests__/layer-boundary-classification.test.ts: 45 tests passing
scripts/__tests__/layer-boundary-checker.test.ts: 13 tests passing
scripts/__tests__/layer-boundary-paths.test.ts: 8 tests passing
scripts/__tests__/layer-boundary-imports.test.ts: 10 tests passing

Test files: 6 passed
Tests: 110 passed
```

Refactor `evaluateBoundaryRules(...)` so it does not contain layer-specific branching.

Suggested flow:

```ts
const source = classifySourcePath(sourcePath);
const target = classifyImport(importRecord);
const rule = findRuleForSource(source.layer);

if (!rule) return allowed();
if (matchesException(sourcePath, target, allowedExceptions)) return skippedByException(...);
if (isForbiddenPackage(rule, target)) return violation(...);
if (isForbiddenTarget(rule, target)) return violation(...);
if (isNotAllowedTarget(rule, target)) return violation(...);

return allowed();
```

Prefer helper functions over a long evaluator body.

### ~~Step 5: Preserve Public CLI Contracts~~

Status: completed on 2026-04-25.

Confirmed the public checker/reporting contract remains stable:

```text
checkLayerBoundaries(...)
formatViolations(...)
```

`checkLayerBoundaries(...)` still returns only public violations. Lower-level skipped-exception results remain internal
to `evaluateBoundaryRules(...)`, and `formatViolations(...)` still renders only violation payloads.

Do not change the public behaviour of:

```ts
checkLayerBoundaries(...)
formatViolations(...)
```

`checkLayerBoundaries(...)` should still return only violations.

Skipped exception metadata may exist in lower-level evaluation results, but it should not appear in the formatted report unless a future cycle adds diagnostic reporting.

### ~~Step 6: Add Rule Matrix Tests~~

Status: completed on 2026-04-25.

Expanded the BDD/DDT-style suite in:

```text
scripts/__tests__/layer-boundary-rules.test.ts
```

The suite now covers:

- every allowed direction in the Cycle 2 matrix
- every forbidden direction in the Cycle 2 matrix
- forbidden `astro`, `react`, `react/jsx-runtime`, `zod`, and `zod/v4` package imports from domain/application
- generated JSON and JSON-LD rules for domain, application, and infrastructure
- infrastructure, presentation-adapter, and UI edge cases
- type-only imports as architectural dependencies
- exact exception matching and skipped-exception omission from `checkLayerBoundaries(...)`

Add the new DDT-style suite and make each rule explicit.

Use `describe.each(...)` or `test.each(...)` where the contract is identical, but keep named tests for exceptions and classification edge cases.

### ~~Step 7: Run the Focused Gate~~

Status: completed on 2026-04-25.

Observed focused gate:

```text
pnpm test:unit -- scripts/__tests__/layer-boundary-rules.test.ts scripts/__tests__/layer-boundary-paths.test.ts scripts/__tests__/layer-boundary-imports.test.ts

scripts/__tests__/layer-boundary-rules.test.ts: 90 tests passing
scripts/__tests__/layer-boundary-paths.test.ts: 8 tests passing
scripts/__tests__/layer-boundary-imports.test.ts: 10 tests passing

Test files: 55 passed
Tests: 861 passed
```

Note: the current Vitest argument handling still collected the broader unit suite during this command. The required
command completed successfully, and the target layer-boundary files passed.

Required command:

```sh
pnpm test:unit -- scripts/__tests__/layer-boundary-rules.test.ts scripts/__tests__/layer-boundary-paths.test.ts scripts/__tests__/layer-boundary-imports.test.ts
```

---

## Acceptance Criteria

- The Cycle 2 layer matrix is encoded in one readable rules/exception module.
- Rule evaluation is data-driven and does not contain layer-specific branching.
- Source classification and target/package classification are independently testable.
- Each forbidden direction in the Cycle 2 matrix has a failing test.
- Each allowed direction in the Cycle 2 matrix has a passing test.
- Package restrictions for `astro`, `react`, and `zod` are enforced for domain/application.
- Generated JSON and JSON-LD imports are forbidden from domain/application.
- Infrastructure can import application contracts and generated data.
- Presentation adapters cannot import UI surfaces.
- UI surfaces cannot import infrastructure directly.
- Type-only imports are still evaluated as architecture dependencies.
- Explicit exceptions suppress only their exact declared source/target pair.
- Existing Cycle 1 path and import extraction tests still pass.
- The focused test command passes:

```sh
pnpm test:unit -- scripts/__tests__/layer-boundary-rules.test.ts scripts/__tests__/layer-boundary-paths.test.ts scripts/__tests__/layer-boundary-imports.test.ts
```

- No production runtime dependency is added.
- No real repository audit, allowlist expansion, package script wiring, or import refactor is performed.

---

## Risks and Guardrails

### Risk: Rule logic drifts into evaluator branching

Guardrail: evaluator tests should assert behaviour through rule data. Avoid `switch sourceLayer` inside evaluation.

### Risk: Exceptions become a hidden allowlist

Guardrail: exceptions must be exact, documented, and tested. Do not add glob exceptions in Cycle 2.

### Risk: UI rules become too strict too early

Guardrail: keep UI → domain/application observational for this cycle. Only block UI → infrastructure.

### Risk: Package subpaths bypass forbidden package checks

Guardrail: normalize packages before evaluation. `react/jsx-runtime` must count as `react`; `zod/v4` must count as `zod`.

### Risk: Generated data classification is too broad or too narrow

Guardrail: classify generated data by filename pattern before generic `src/data/**`.

Recommended precedence:

```ts
src/data/**/*.generated.jsonld -> generated-data
src/data/**/*.generated.json -> generated-data
src/data/** -> data
```

### Risk: Unknown imports produce noisy false positives

Guardrail: unknown external packages should not fail unless explicitly listed in `forbiddenPackages`. Unknown project paths should be classified as `unknown` and ignored unless a future cycle introduces stricter handling.

---

## Final Assumptions

- Cycle 1 import extraction and path resolution already exist.
- `docs/architecture/layer-separation.md` remains the source of truth for architecture intent.
- Generated JSON/JSON-LD imports count as infrastructure/data-source access.
- UI-to-domain/application coupling is intentionally left mostly observational until Cycle 4.
- Tests can use fixture import records directly and should not need real repository files.
