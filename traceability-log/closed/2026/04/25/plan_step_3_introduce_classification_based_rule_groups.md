# [PLAN] Step 3: Introduce Classification-Based Rule Groups

Status: completed on 2026-04-25.

Implemented in:

* `scripts/lib/layer-boundary-rules.mjs`
* `scripts/__tests__/layer-boundary-rules.test.ts`
* `docs/architecture/layer-separation.md`

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

## Summary

Introduce the complete Cycle 2 declarative rule matrix in `scripts/lib/layer-boundary-rules.mjs` using source-layer and target-category vocabulary. This step defines the stable rule data that Step 4 will evaluate through `classifySourcePath(...)`, `classifyResolvedTarget(...)`, and package classification.

Step 3 must not change runtime checker behaviour yet. The current evaluator still expects path-glob-shaped rules, so this step must keep the existing checker baseline isolated from the new rule shape.

## Primary Goal

Create the new canonical rule model:

```js
{
    id,
    source,
    allowedTargets,
    forbiddenTargets,
    forbiddenPackages,
    message,
    suggestion,
}
```

where:

* `source` is a single source-layer id, not a glob list.
* `allowedTargets` and `forbiddenTargets` use classification ids, not path globs.
* package restrictions are represented through `forbiddenPackages`.
* rule messages are stable and human-facing.
* exception handling is declared but empty for now.

## Important Compatibility Decision

Do **not** make the current checker consume `boundaryRules` in Step 3.

The original plan says:

```js
export const initialBoundaryRules = boundaryRules;
```

That is only safe after Step 4 updates the evaluator. Until then, it creates an implicit behaviour change because the evaluator still interprets `source` and `forbiddenTargets` as glob-like fields.

Use this Step 3 export shape instead:

```js
export const boundaryRules = [
    domainBoundaryRule,
    applicationBoundaryRule,
    infrastructureBoundaryRule,
    presentationAdapterBoundaryRule,
    uiBoundaryRule,
];

export const allowedExceptions = [];

// Temporary compatibility export.
// Remove or replace in Step 4 after evaluator migration.
export const initialBoundaryRules = legacyInitialBoundaryRules;
```

Then Step 4 becomes the explicit migration point:

```js
export const initialBoundaryRules = boundaryRules;
```

This keeps Step 3 green without pretending the evaluator already understands the new vocabulary.

## Files to Change

### Add or update

* `scripts/lib/layer-boundary-rules.mjs`
* `scripts/__tests__/layer-boundary-rules.test.ts`

### Do not change yet

* `scripts/lib/layer-boundary-checker.mjs`
* `evaluateBoundaryRules(...)`
* `checkLayerBoundaries(...)`
* `formatViolations(...)`
* CLI behaviour
* import extraction
* path resolution
* classification helpers added in Step 2

## Rule Constants

Define one named rule per source layer:

```js
export const domainBoundaryRule = { /* ... */ };
export const applicationBoundaryRule = { /* ... */ };
export const infrastructureBoundaryRule = { /* ... */ };
export const presentationAdapterBoundaryRule = { /* ... */ };
export const uiBoundaryRule = { /* ... */ };
```

Then define the canonical ordered list:

```js
export const boundaryRules = [
    domainBoundaryRule,
    applicationBoundaryRule,
    infrastructureBoundaryRule,
    presentationAdapterBoundaryRule,
    uiBoundaryRule,
];
```

Keep the order intentional: domain → application → infrastructure → presentation adapter → UI.

## Stable Rule IDs

Use these exact ids:

* `domain-boundary`
* `application-boundary`
* `infrastructure-boundary`
* `presentation-adapter-boundary`
* `ui-boundary`

## Target Vocabulary

Use a small, explicit vocabulary aligned with Step 2 classification helpers:

* `domain`
* `application`
* `infrastructure`
* `presentation-adapter`
* `presentation`
* `ui`
* `data`
* `generated-data`
* `assets`
* `styles`
* `utils`
* `external`
* `unknown`

Only include `external` and `unknown` in rules if Step 2 classification already exposes them and Step 4 intends to evaluate them. Otherwise, keep them out of the rule matrix for now.

## Rule Matrix

### Domain

Domain code may depend only on domain code.

```js
allowedTargets: ["domain"],
forbiddenTargets: [
    "application",
    "infrastructure",
    "presentation-adapter",
    "presentation",
    "ui",
    "generated-data",
    "data",
],
forbiddenPackages: ["astro", "react", "zod"],
```

### Application

Application code may depend on domain and application code.

```js
allowedTargets: ["domain", "application"],
forbiddenTargets: [
    "infrastructure",
    "presentation-adapter",
    "presentation",
    "ui",
    "generated-data",
    "data",
],
forbiddenPackages: ["astro", "react", "zod"],
```

### Infrastructure

Infrastructure code may depend on domain/application contracts, infrastructure code, and data sources.

```js
allowedTargets: [
    "domain",
    "application",
    "infrastructure",
    "data",
    "generated-data",
    "utils",
],
forbiddenTargets: [
    "presentation-adapter",
    "presentation",
    "ui",
],
forbiddenPackages: [],
```

### Presentation Adapter

Presentation adapters may compose application/domain/infrastructure with presentation-facing structures, but must not import UI components directly.

```js
allowedTargets: [
    "domain",
    "application",
    "infrastructure",
    "presentation-adapter",
    "presentation",
    "utils",
],
forbiddenTargets: ["ui"],
forbiddenPackages: [],
```

### UI

UI code may depend on presentation-facing APIs and stable domain/application abstractions, but must not reach directly into infrastructure.

```js
allowedTargets: [
    "presentation-adapter",
    "presentation",
    "ui",
    "assets",
    "styles",
    "utils",
    "domain",
    "application",
],
forbiddenTargets: ["infrastructure"],
forbiddenPackages: [],
```

## Messages and Suggestions

Use the messages and suggestions from:

```text
traceability-log/plan_cycle_2_data_driven_layer_rules.md
```

Add a test guard that every rule has:

* non-empty `message`
* non-empty `suggestion`
* no duplicated message across rules unless intentionally justified

Recommended message style:

* state the violated architectural direction
* name the source layer
* name the forbidden target or dependency kind
* avoid implementation-specific wording tied to path globs

Example style:

```js
message: "Domain code must not depend on application, infrastructure, presentation, UI, data, or framework packages.",
suggestion: "Move framework-dependent logic behind an application port or keep the dependency in an outer layer.",
```

## Exception List

Add the empty exception list now, but do not evaluate it yet:

```js
export const allowedExceptions = [];
```

Document the intended future shape in a short comment, not in evaluator code:

```js
/**
 * Temporary allowlist for intentionally documented architecture exceptions.
 *
 * Step 3 only declares the list. Step 5 will define matching semantics.
 */
export const allowedExceptions = [];
```

## Test Plan

Create `scripts/__tests__/layer-boundary-rules.test.ts`.

Use BDD-style `describe(...)` sections and DDT tables where the assertion shape repeats.

### Required tests

1. `boundaryRules` exposes exactly five rules in canonical order.

2. Each rule has the expected stable id.

3. Each rule has a single string `source`, not a glob array.

4. `allowedExceptions` starts empty.

5. Every rule has a non-empty `message` and `suggestion`.

6. Domain allows only `domain`.

7. Application allows only `domain` and `application`.

8. Domain and application forbid exactly these packages:

```js
["astro", "react", "zod"]
```

9. Non-domain/application rules do not forbid packages.

10. UI allows `domain` and `application`.

11. UI forbids only `infrastructure`.

12. `generated-data` is:

* forbidden from domain
* forbidden from application
* allowed from infrastructure

13. `presentation-adapter` forbids UI.

14. Rule ids are unique.

15. Rule sources are unique.

### Compatibility tests

Add explicit guards for the temporary Step 3 compatibility model:

```js
expect(initialBoundaryRules).not.toBe(boundaryRules);
expect(initialBoundaryRules).toBe(legacyInitialBoundaryRules);
```

Then, in Step 4, intentionally change this expectation to:

```js
expect(initialBoundaryRules).toBe(boundaryRules);
```

That makes the migration visible and prevents accidental partial wiring.

## Suggested Test Shape

```ts
describe("boundaryRules", () => {
    test("exposes the Cycle 2 rules in source-layer order", () => {
        expect(boundaryRules.map((rule) => rule.id)).toEqual([
            "domain-boundary",
            "application-boundary",
            "infrastructure-boundary",
            "presentation-adapter-boundary",
            "ui-boundary",
        ]);
    });

    test.each([
        ["domain-boundary", "domain"],
        ["application-boundary", "application"],
        ["infrastructure-boundary", "infrastructure"],
        ["presentation-adapter-boundary", "presentation-adapter"],
        ["ui-boundary", "ui"],
    ])("%s targets source layer %s", (id, source) => {
        const rule = boundaryRules.find((candidate) => candidate.id === id);

        expect(rule?.source).toBe(source);
    });
});
```

Use helper functions only if they reduce repetition without hiding intent:

```ts
const ruleById = (id: string) => {
    const rule = boundaryRules.find((candidate) => candidate.id === id);

    if (!rule) {
        throw new Error(`Missing boundary rule: ${id}`);
    }

    return rule;
};
```

## Focused Acceptance Gate

Run the rule-data and classification tests:

```sh
pnpm test:unit -- scripts/__tests__/layer-boundary-rules.test.ts scripts/__tests__/layer-boundary-classification.test.ts
```

Vitest supports filtering by file name through CLI arguments, so this is a reasonable focused gate for Step 3 rather than running unrelated suites. ([Vitest][1])

## Optional Safety Gate

Run the existing checker tests only if they use the legacy fixture/export and remain behaviourally stable:

```sh
pnpm test:unit -- scripts/__tests__/layer-boundary-checker.test.ts
```

Do not require the full checker suite to validate the new `boundaryRules` shape until Step 4 migrates evaluation.

## Non-Goals

Step 3 must not include:

* evaluator migration
* exception matching
* richer violation metadata
* CLI output changes
* checker public API changes
* repository-wide import refactors
* real architecture audit
* package script rewiring
* path-glob fallback evaluation for the new rule shape

## Step 3 Completion Criteria

Step 3 is complete when:

* `boundaryRules` contains the five full Cycle 2 rule groups.
* `allowedExceptions` exists and is empty.
* all new rule-data tests pass.
* classification tests from Step 2 still pass.
* current checker behaviour is not accidentally changed.
* Step 4 has a clear, mechanical migration point: make the evaluator consume classification-shaped rules and then alias `initialBoundaryRules` to `boundaryRules`.

## Step 4 Handoff Notes

Step 4 should:

1. update `evaluateBoundaryRules(...)` to classify source and target imports before rule evaluation;
2. evaluate `allowedTargets`, `forbiddenTargets`, and `forbiddenPackages`;
3. switch `initialBoundaryRules` to `boundaryRules`;
4. update checker tests from legacy path-glob expectations to classification-driven expectations;
5. keep CLI-visible formatting stable unless Step 5 explicitly changes violation output.

## Rationale References

The plan keeps the new rule matrix as named ESM exports, which aligns with the standard module model used by Node.js and modern JavaScript tooling. ([Node.js][2]) The focused test gate is also consistent with Vitest’s documented support for running targeted test files through filename filtering and `vitest run` workflows. ([Vitest][1])

[1]: https://vitest.dev/guide/filtering?utm_source=chatgpt.com "Test Filtering | Guide"
[2]: https://nodejs.org/api/esm.html?utm_source=chatgpt.com "ECMAScript modules | Node.js v25.9.0 Documentation"
