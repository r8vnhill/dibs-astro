# [PLAN] Step 4: Make Rule Evaluation Classification-Driven

Status: completed on 2026-04-25.

Implemented the classification-driven evaluator and switched runtime defaults to the Cycle 2 rule matrix:

* `scripts/lib/layer-boundary-rule-evaluation.mjs`
* `scripts/lib/layer-boundary-rules.mjs`
* `scripts/lib/layer-boundary-checker.mjs`
* `scripts/__tests__/layer-boundary-rule-evaluation.test.ts`
* `scripts/__tests__/layer-boundary-rules.test.ts`
* `scripts/__tests__/layer-boundary-checker.test.ts`

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

Verification used the direct Vitest command because `pnpm test:unit -- ...` forwarded a literal `--` to Vitest in this environment and ran the broader suite, which hit an unrelated Shiki timeout.

## Summary

Migrate boundary evaluation from legacy path-glob matching to the Cycle 2 classification-driven rule matrix.

This step switches runtime evaluation from `legacyInitialBoundaryRules` to `boundaryRules`, evaluates imports through the classification helpers introduced in Step 2, and preserves the public checker/formatter contract for callers.

The result of this phase should be:

* `initialBoundaryRules === boundaryRules`;
* `evaluateBoundaryRules(...)` understands source-layer and target-category rules;
* `checkLayerBoundaries(...)` still returns the same public violation shape expected by callers;
* `formatViolations(...)` remains stable and does not display skipped exceptions;
* legacy path-glob matching is no longer used for rule evaluation.

## Design Correction

Do **not** import classification helpers into `layer-boundary-rules.mjs`.

`layer-boundary-rules.mjs` should remain a declarative data module:

```js
export const boundaryRules = [
    domainBoundaryRule,
    applicationBoundaryRule,
    infrastructureBoundaryRule,
    presentationAdapterBoundaryRule,
    uiBoundaryRule,
];

export const initialBoundaryRules = boundaryRules;

export const allowedExceptions = [];
```

Classification and evaluation belong in an evaluator module because they are behaviour, not rule data. Keeping ESM modules small and explicit also keeps imports/exports understandable and testable; Node’s ESM model is built around explicit `import` / `export` declarations for reusable modules. ([Node.js][1])

## Files to Change

### Production

* `scripts/lib/layer-boundary-rules.mjs`
* `scripts/lib/layer-boundary-checker.mjs`
* preferably add `scripts/lib/layer-boundary-rule-evaluation.mjs`

### Tests

* `scripts/__tests__/layer-boundary-rules.test.ts`
* add `scripts/__tests__/layer-boundary-rule-evaluation.test.ts`
* update `scripts/__tests__/layer-boundary-checker.test.ts`

Keeping evaluator tests separate from rule-data tests is cleaner than placing direct evaluator tests inside `layer-boundary-rules.test.ts`.

## Recommended Module Split

### `layer-boundary-rules.mjs`

Owns only rule declarations:

```js
export const boundaryRules = [
    domainBoundaryRule,
    applicationBoundaryRule,
    infrastructureBoundaryRule,
    presentationAdapterBoundaryRule,
    uiBoundaryRule,
];

export const initialBoundaryRules = boundaryRules;

export const allowedExceptions = [];
```

Keep `legacyInitialBoundaryRules` only if a test or migration note still needs it:

```js
export const legacyInitialBoundaryRules = [
    // old starter rules, if still useful for historical tests
];
```

If no test uses it after Step 4, delete it.

### `layer-boundary-rule-evaluation.mjs`

Owns generic evaluation:

```js
import {
    classifyImport,
    classifySourcePath,
} from "./layer-boundary-classification.mjs";

import {
    allowedExceptions,
    initialBoundaryRules,
} from "./layer-boundary-rules.mjs";

export function evaluateBoundaryRules(
    sourceFile,
    importRecord,
    resolvedTarget,
    rules = initialBoundaryRules,
    exceptions = allowedExceptions,
) {
    // classification-driven evaluation
}
```

This separation gives you a focused unit-test target for evaluation without coupling rule-data tests to checker orchestration.

## Public Behaviour Contract

`checkLayerBoundaries(...)` should still expose only violations.

That means `evaluateBoundaryRules(...)` may return richer internal results, but `checkLayerBoundaries(...)` should continue to push only violation payloads into the public array.

```js
const result = evaluateBoundaryRules(
    sourceFile,
    importRecord,
    resolvedTarget,
);

if (result.status === "violation") {
    violations.push(result.violation);
}
```

`formatViolations(...)` should not need to know about:

* allowed imports;
* skipped imports;
* exception metadata;
* classification details beyond fields already attached to violations.

## Evaluation Result Shape

Use a discriminated result object:

```ts
type BoundaryEvaluationResult =
    | { status: "allowed" }
    | { status: "skipped-by-exception"; exception: BoundaryException }
    | { status: "violation"; violation: BoundaryViolation };
```

In JavaScript, represent this directly:

```js
return { status: "allowed" };

return {
    status: "skipped-by-exception",
    exception,
};

return {
    status: "violation",
    violation,
};
```

## Generic Evaluation Helpers

Add small helpers. Keep each helper narrow and easy to test.

```js
function findRuleForSource(sourceLayer, rules) {}

function matchesException(sourcePath, classifiedImport, exceptions) {}

function isForbiddenPackage(rule, classifiedImport) {}

function isForbiddenTarget(rule, classifiedImport) {}

function isNotAllowedTarget(rule, classifiedImport) {}

function toViolation(sourceFile, importRecord, resolvedTarget, classifiedSource, classifiedImport, rule, reason) {}
```

Prefer passing already-classified values into helpers instead of letting every helper reclassify.

## Evaluation Flow

Use this exact order to keep behaviour deterministic:

1. classify the source path;
2. allow unknown source layers;
3. find the rule for the source layer;
4. allow if no rule exists;
5. classify the import;
6. skip if an injected exception matches;
7. check forbidden packages;
8. check forbidden targets;
9. check not-allowed targets;
10. otherwise allow.

Suggested implementation shape:

```js
export function evaluateBoundaryRules(
    sourceFile,
    importRecord,
    resolvedTarget,
    rules = initialBoundaryRules,
    exceptions = allowedExceptions,
) {
    const sourceLayer = classifySourcePath(sourceFile);

    if (sourceLayer === "unknown") {
        return { status: "allowed" };
    }

    const rule = findRuleForSource(sourceLayer, rules);

    if (!rule) {
        return { status: "allowed" };
    }

    const classifiedImport = classifyImport(importRecord, resolvedTarget?.resolvedPath);

    const matchingException = matchesException(
        sourceFile,
        classifiedImport,
        exceptions,
    );

    if (matchingException) {
        return {
            status: "skipped-by-exception",
            exception: matchingException,
        };
    }

    if (isForbiddenPackage(rule, classifiedImport)) {
        return toViolation(
            sourceFile,
            importRecord,
            resolvedTarget,
            sourceLayer,
            classifiedImport,
            rule,
            "forbidden-package",
        );
    }

    if (isForbiddenTarget(rule, classifiedImport)) {
        return toViolation(
            sourceFile,
            importRecord,
            resolvedTarget,
            sourceLayer,
            classifiedImport,
            rule,
            "forbidden-target",
        );
    }

    if (isNotAllowedTarget(rule, classifiedImport)) {
        return toViolation(
            sourceFile,
            importRecord,
            resolvedTarget,
            sourceLayer,
            classifiedImport,
            rule,
            "not-allowed-target",
        );
    }

    return { status: "allowed" };
}
```

## Violation Precedence

Use explicit precedence when an import could match more than one rule condition:

1. forbidden package;
2. forbidden target;
3. not-allowed target.

This gives clearer diagnostics. For example, a domain file importing `react` should report a forbidden package violation even if the import is also classified as external or unknown.

## Classification Rules

Use the Step 2 helpers:

```js
const sourceLayer = classifySourcePath(sourceFile);
const classifiedImport = classifyImport(importRecord, resolvedTarget?.resolvedPath);
```

Expected classification behaviour:

* source `unknown` means allowed;
* target `unknown` means allowed unless explicitly forbidden;
* unknown packages are allowed unless `packageName` matches `forbiddenPackages`;
* package checks apply only when `classifiedImport.packageName` exists;
* target checks apply against `classifiedImport.target`;
* type-only imports are evaluated like value imports;
* unresolved imports are evaluated through package classification when possible;
* unresolved non-package imports are allowed unless classification gives a forbidden target.

## Exception Model for Step 4

Keep exceptions exact and intentionally minimal.

Suggested temporary shape:

```js
{
    sourcePath: "src/domain/foo.ts",
    importTarget: "react",
    reason: "Temporary migration exception",
}
```

Where `importTarget` matches either:

* the raw import path, for package imports;
* the normalized resolved project path, for resolved project imports.

Do **not** add glob exceptions in Step 4. That belongs in a later exception-hardening step.

Example matcher:

```js
function matchesException(sourcePath, classifiedImport, exceptions) {
    const normalizedSource = normalizeProjectPath(sourcePath);
    const importTarget = exceptionImportTarget(classifiedImport);

    return exceptions.find((exception) =>
        exception.sourcePath === normalizedSource &&
        exception.importTarget === importTarget
    );
}
```

This gives tests a usable injection seam without turning Step 4 into a full allowlist language.

## Public Violation Shape

Preserve formatter-facing fields:

```js
{
    sourceFile,
    importTarget,
    resolvedTarget,
    ruleId,
    message,
    suggestion,
}
```

Add richer fields for future tests and diagnostics:

```js
{
    importKind,
    packageName,
    sourceLayer,
    target,
    reason,
}
```

Recommended final shape:

```js
{
    sourceFile,
    importTarget: importRecord.importPath,
    resolvedTarget: resolvedTarget?.resolvedPath,
    ruleId: rule.id,
    message: rule.message,
    suggestion: rule.suggestion,

    importKind: importRecord.kind,
    packageName: classifiedImport.packageName,
    sourceLayer,
    target: classifiedImport.target,
    reason,
}
```

Do not require `formatViolations(...)` to display the new fields yet.

## Rule Data Update

In `scripts/lib/layer-boundary-rules.mjs`, switch:

```js
export const initialBoundaryRules = legacyInitialBoundaryRules;
```

to:

```js
export const initialBoundaryRules = boundaryRules;
```

Update Step 3 compatibility tests accordingly:

```js
expect(initialBoundaryRules).toBe(boundaryRules);
```

Delete this old Step 3 expectation:

```js
expect(initialBoundaryRules).not.toBe(boundaryRules);
```

## Test Plan

### 1. Rule-data tests

Update `scripts/__tests__/layer-boundary-rules.test.ts`.

Required assertions:

* `boundaryRules` still contains the five Cycle 2 rules in order;
* `initialBoundaryRules === boundaryRules`;
* `allowedExceptions` is still empty by default;
* rule ids remain stable;
* rule sources remain unique;
* every rule still has `message` and `suggestion`.

### 2. Evaluator tests

Add `scripts/__tests__/layer-boundary-rule-evaluation.test.ts`.

Use focused BDD-style suites:

```ts
suite("evaluateBoundaryRules", () => {
    describe("source classification", () => {
        // unknown source, known source with no rule
    });

    describe("target rules", () => {
        // allowed target, forbidden target, not-allowed target
    });

    describe("package rules", () => {
        // forbidden package, allowed package, unknown package
    });

    describe("exceptions", () => {
        // exact package exception, exact resolved-target exception
    });

    describe("import kinds", () => {
        // type-only import evaluated like value import
    });
});
```

Vitest supports running focused test files from the CLI, which is useful here because this migration touches several seams but should still be testable in small slices. ([Vitest][2])

### 3. Required evaluator cases

Add at least these direct evaluator tests:

#### Allows valid domain-to-domain import

```ts
expect(result.status).toBe("allowed");
```

#### Rejects domain-to-application import

Expected:

```ts
expect(result.status).toBe("violation");
expect(result.violation.ruleId).toBe("domain-boundary");
expect(result.violation.sourceLayer).toBe("domain");
expect(result.violation.target).toBe("application");
```

#### Rejects forbidden package from domain

Example:

```ts
importPath: "react"
```

Expected:

```ts
expect(result.status).toBe("violation");
expect(result.violation.reason).toBe("forbidden-package");
expect(result.violation.packageName).toBe("react");
```

#### Allows unknown source

Unknown source paths should not be governed by the matrix yet.

```ts
expect(result.status).toBe("allowed");
```

#### Allows unknown target by default

```ts
expect(result.status).toBe("allowed");
```

#### Evaluates type-only imports

A type-only import from domain to application should still violate:

```ts
expect(result.status).toBe("violation");
```

#### Skips exact exception

Inject an exception list:

```ts
const exceptions = [
    {
        sourcePath: "src/domain/foo.ts",
        importTarget: "react",
        reason: "Temporary migration exception",
    },
];
```

Expected:

```ts
expect(result.status).toBe("skipped-by-exception");
```

### 4. Checker integration tests

Update `scripts/__tests__/layer-boundary-checker.test.ts`.

Keep the tests focused on public integration behaviour:

* `checkLayerBoundaries(...)` returns only violations;
* skipped exceptions are not returned as violations;
* violations preserve formatter-facing fields;
* `formatViolations(...)` still produces usable output;
* Cycle 2 rule ids appear where expected;
* UI-to-infrastructure violations now use `ui-boundary`.

Do not duplicate the full matrix here. The checker test should prove integration, not every rule combination.

### 5. Formatter stability tests

Keep existing formatter tests passing.

Add one regression test only if needed:

```ts
expect(formatViolations([violation])).toContain(violation.message);
expect(formatViolations([violation])).toContain(violation.suggestion);
```

Avoid snapshot tests for the whole output unless the project already uses them. Structural assertions are easier to maintain.

## Suggested DDT Tables

Use DDT for repeated evaluator cases.

Example:

```ts
test.each([
    {
        name: "domain cannot import application",
        sourceFile: "src/domain/model.ts",
        importPath: "$application/use-case",
        resolvedPath: "src/application/use-case.ts",
        expectedRuleId: "domain-boundary",
        expectedTarget: "application",
    },
    {
        name: "application cannot import infrastructure",
        sourceFile: "src/application/use-case.ts",
        importPath: "$infrastructure/repository",
        resolvedPath: "src/infrastructure/repository.ts",
        expectedRuleId: "application-boundary",
        expectedTarget: "infrastructure",
    },
])("$name", ({ sourceFile, importPath, resolvedPath, expectedRuleId, expectedTarget }) => {
    const result = evaluateBoundaryRules(
        sourceFile,
        { importPath, kind: "value" },
        { resolvedPath },
    );

    expect(result.status).toBe("violation");
    expect(result.violation.ruleId).toBe(expectedRuleId);
    expect(result.violation.target).toBe(expectedTarget);
});
```

Keep one-off cases as named tests when the behaviour is special, such as exceptions or unknown targets.

## Migration Steps

### Step 4.1: Add evaluator module

Create:

```text
scripts/lib/layer-boundary-rule-evaluation.mjs
```

Move or wrap `evaluateBoundaryRules(...)` there.

If existing imports expect it from `layer-boundary-checker.mjs`, re-export it temporarily:

```js
export { evaluateBoundaryRules } from "./layer-boundary-rule-evaluation.mjs";
```

This avoids unnecessary churn in tests.

### Step 4.2: Switch `initialBoundaryRules`

In `layer-boundary-rules.mjs`:

```js
export const initialBoundaryRules = boundaryRules;
```

Update the Step 3 compatibility test.

### Step 4.3: Implement classification-driven evaluation

Replace picomatch-based logic with:

* source classification;
* import classification;
* rule lookup;
* package checks;
* target checks;
* exception check.

### Step 4.4: Adapt `checkLayerBoundaries(...)`

Only push violations:

```js
if (result.status === "violation") {
    violations.push(result.violation);
}
```

### Step 4.5: Preserve formatter compatibility

Do not update formatter output unless a failing test proves a necessary field was lost.

### Step 4.6: Remove dead glob-evaluation helpers

Remove or stop using:

* `matchesAny(...)`;
* evaluator-local `picomatch` usage;
* legacy source/target glob matching.

If `picomatch` is still used elsewhere, keep the dependency. If not, defer dependency removal to a cleanup step unless this repository already has dependency hygiene checks.

## Verification Command

Run the focused gate:

```sh
pnpm test:unit -- scripts/__tests__/layer-boundary-rules.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-checker.test.ts scripts/__tests__/layer-boundary-paths.test.ts scripts/__tests__/layer-boundary-imports.test.ts
```

If the package script forwards file arguments incorrectly, use the direct Vitest command already established in earlier steps. Vitest’s CLI accepts file-name filters as additional arguments, so direct invocation is a valid fallback for focused gates. ([Vitest][3])

Example fallback:

```sh
node ./node_modules/vitest/vitest.mjs run scripts/__tests__/layer-boundary-rules.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-checker.test.ts scripts/__tests__/layer-boundary-paths.test.ts scripts/__tests__/layer-boundary-imports.test.ts
```

## Non-Goals

Step 4 does not include:

* full layer-matrix DDT coverage;
* repository-wide import audit;
* real import refactors;
* package script rewiring;
* formatter redesign;
* broad exception language with globs;
* allowlist expansion;
* new rule ids;
* new architectural policy decisions;
* changing type-only import semantics;
* changing import extraction.

## Acceptance Criteria

Step 4 is complete when:

* `initialBoundaryRules === boundaryRules`;
* `evaluateBoundaryRules(...)` uses classification, not path globs;
* source rules are selected through `classifySourcePath(...)`;
* imports are evaluated through `classifyImport(...)`;
* forbidden packages are detected;
* forbidden targets are detected;
* not-allowed targets are detected;
* unknown sources are allowed;
* unknown targets are allowed unless explicitly forbidden;
* injected exact exceptions produce `status: "skipped-by-exception"`;
* `checkLayerBoundaries(...)` returns only violations;
* public violation fields remain formatter-compatible;
* `formatViolations(...)` still works;
* the focused Step 4 test gate passes.

## Step 5 / Step 6 Handoff

Step 5 should refine exception handling and violation metadata if needed:

* exact path/package exceptions;
* optional reason fields;
* possible expiry or owner fields;
* reporting skipped exceptions separately if useful.

Step 6 should add broad matrix coverage:

* DDT table for every source layer × target category;
* package restriction matrix;
* unknown/asset/style/utils cases;
* public regression tests for representative real imports.

----

[1]: https://nodejs.org/api/esm.html?utm_source=chatgpt.com "ECMAScript modules | Node.js v25.9.0 Documentation"
[2]: https://vitest.dev/guide/filtering?utm_source=chatgpt.com "Test Filtering | Guide"
[3]: https://vitest.dev/guide/cli?utm_source=chatgpt.com "Command Line Interface | Guide"
