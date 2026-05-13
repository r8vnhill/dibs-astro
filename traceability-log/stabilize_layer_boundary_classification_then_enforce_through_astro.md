# [PLAN] Stabilize Layer Boundary Classification, Then Enforce Through Astro

## Summary

Refactor and harden the layer-boundary checker internals first, then move the primary enforcement path from the manual `check:architecture` script into an Astro integration.

The pure checker remains in `scripts/lib`. The direct `check:architecture` command stays available for debugging, but `pnpm build` and `pnpm check` become the main enforcement paths through Astro.

## Guiding Decisions

1. **Stabilize before relocating enforcement.**
   Clean up classification and rule-evaluation behaviour before wiring the checker into Astro’s lifecycle.

2. **Preserve public checker behaviour.**
   Exported classifier APIs, rule semantics, finding formats, and return shapes stay stable.

3. **Keep the checker pure.**
   Astro owns *when* the checker runs; `scripts/lib` owns *what* the checker does.

4. **Avoid dev-server noise.**
   Normal `astro dev` must not run layer-boundary checks.

5. **Keep a direct diagnostic path.**
   `pnpm run check:architecture` remains available even after Astro becomes the main enforcement path.

6. **No new dependency for this work.**
   Use existing Vitest coverage, plain data tables, injected test doubles, and current project utilities.

---

# ~~Stage 0: Confirm Scope and Behavioural Policy~~

## Goal

Make the cross-plan decisions explicit before editing implementation code.

## Decisions

* Malformed import records should **fail fast** with a clear `TypeError`.
* Valid but unresolved imports should classify as `unknown`.
* Unknown/future import kinds should classify as `"value"` to remain fail-closed.
* Import-specifier helpers should live outside `layer-boundary-paths.mjs`; keep path normalization and import classification separate.
* Astro integration should use:

  * `astro:build:start` for `pnpm build`;
  * gated `astro:config:setup` for `pnpm check`;
  * `SKIP_LAYER_BOUNDARY_CHECK=true` as the global override;
  * `LAYER_BOUNDARY_CHECK=true` as the `astro check` opt-in;
  * an internal `hasRun` guard to avoid duplicate execution. 

## Files in scope

```text
scripts/lib/layer-boundary-classification.mjs
scripts/lib/layer-boundary-imports.mjs
scripts/lib/layer-boundary-paths.mjs
scripts/lib/layer-boundary-rule-evaluation.mjs
scripts/lib/layer-boundary-checker.mjs
scripts/__tests__/layer-boundary-classification.test.ts
scripts/__tests__/layer-boundary-rule-evaluation.test.ts
scripts/__tests__/layer-boundary-checker.test.ts
config/integrations/layer-boundary-check.ts
config/integrations/layer-boundary-check-runner.ts
config/integrations/__tests__/layer-boundary-check.test.ts
scripts/run-astro-check.mjs
astro.config.ts
package.json
```

---

# ~~Stage 1: Characterize the Current Classifier Contract~~

## Goal

Freeze current classification behaviour before extraction or refactoring.

## Test first

Extend `scripts/__tests__/layer-boundary-classification.test.ts`.

Cover:

* source-layer classification for all known source layers;
* target classification for all known targets;
* unknown source and target paths;
* Windows-path normalization;
* sibling false positives:

  * `src/domain-extra/foo.ts`;
  * `src/datax/file.json`;
  * `packages/site-core-extra/src/index.ts`;
* precedence-sensitive overlaps:

  * `src/presentation/adapters/foo.ts` → `presentation-adapter`;
  * `src/presentation/foo.ts` → `presentation`;
  * `src/data/foo.generated.json` → `generated-data`;
  * `src/data/foo.json` → `data`;
* unresolved relative imports;
* unresolved project-alias imports;
* unresolved bare package imports;
* scoped package imports;
* unknown import kinds classified as `"value"`;
* malformed records throwing a useful error.

The uploaded cleanup plan already identifies these as the key classifier risks: overlap precedence, similarly named paths, unresolved imports, unknown import kinds, and malformed/future records. 

## Implementation

No production change yet.

## Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

## Exit criteria

* Current classifier behaviour is pinned.
* Ambiguous edge cases have explicit expected behaviour.
* Malformed-record policy is no longer deferred.

---

# ~~Stage 2: Characterize Downstream Rule Evaluation~~

## Goal

Ensure the downstream rule evaluator continues to consume the same classified import shape after classifier refactors.

## Result

Completed in `scripts/__tests__/layer-boundary-rule-evaluation.test.ts`.

The evaluator contract now covers resolved-target precedence, unresolved package metadata, scoped package names,
unresolved unknown imports, exact and near-miss exceptions, type import kinds, unknown import kinds, and malformed
records. The suite also documents the current empty-import-path behaviour as allowed-by-default instead of changing
production code in this stage.

## Test first

Extend `scripts/__tests__/layer-boundary-rule-evaluation.test.ts`.

Cover:

* package imports still produce `external-package`;
* scoped packages preserve the correct package name;
* resolved imports take precedence over unresolved import specifier classification;
* unresolved non-package imports fall back to `unknown`;
* exceptions still match classified target/package data;
* type imports still receive the same rule treatment;
* unknown import kinds remain value imports;
* malformed records surface as clear classifier errors.

The cleanup plan explicitly calls out rule-evaluation coverage as the integration-level contract for package-vs-resolved-target handling, exception matching, and fallback behaviour. 

## Implementation

No production change unless existing tests expose ambiguous or currently broken behaviour.

## Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

## Exit criteria

* Rule-evaluation behaviour is protected before helper extraction.
* Classifier output shape is confirmed through a real consumer.

---

# Stage 3: Extract Import-Specifier Helpers

## Goal

Centralize import-path extraction, import-kind classification, package-name extraction, and unresolved-import classification.

## Implementation

Add:

```text
scripts/lib/layer-boundary-imports.mjs
```

Suggested helpers:

```js
extractImportPath(importRecord)
classifyImportKind(kind)
isRelativeImport(importPath)
isProjectAliasImport(importPath)
isBarePackageImport(importPath)
packageNameFromImportPath(importPath)
classifyUnresolvedImport(importPath)
```

Policy:

* `extractImportPath()` throws `TypeError` when both `importPath` and `target` are missing or invalid.
* `classifyImportKind()` returns `"type"` only for known type import/re-export kinds.
* unknown import kinds return `"value"`.
* `classifyUnresolvedImport()` returns:

  * `{ target: "external-package", packageName }` for bare packages;
  * `{ target: "unknown" }` otherwise.

Keep `layer-boundary-paths.mjs` focused on project path normalization. The cleanup plan specifically recommends a separate import helper module rather than putting import-specifier logic into the path helper. 

## Tests

Add focused cases for:

* `react`;
* `react/jsx-runtime`;
* `@scope/pkg`;
* `@scope/pkg/subpath`;
* `node:fs`, preserving current behaviour;
* `~/...` aliases;
* `$...` aliases;
* relative imports;
* absolute paths;
* `src/...` unresolved paths;
* malformed records.

## Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

## Exit criteria

* Import-specifier logic has one source of truth.
* Classifier public return shapes are unchanged.
* Rule-evaluation tests remain green.

---

# Stage 4: Replace Predicate Wrappers With Declarative Classification Rules

## Goal

Reduce repeated prefix predicates and make rule precedence explicit.

## Implementation

Refactor `scripts/lib/layer-boundary-classification.mjs`.

Introduce ordered rule tables:

```js
const uiPrefixes = Object.freeze([
    "src/components",
    "src/layouts",
    "src/pages",
]);

const sourceRules = Object.freeze([
    { layer: "domain", prefixes: ["src/domain"] },
    { layer: "application", prefixes: ["src/application"] },
    { layer: "infrastructure", prefixes: ["src/infrastructure"] },
    { layer: "presentation-adapter", prefixes: ["src/presentation/adapters"] },
    { layer: "ui", prefixes: uiPrefixes },
    { layer: "content-core", prefixes: ["packages/content-core/src"] },
    { layer: "site-core", prefixes: ["packages/site-core/src"] },
]);

const targetRules = Object.freeze([
    { target: "presentation-adapter", prefixes: ["src/presentation/adapters"] },
    {
        target: "generated-data",
        prefixes: ["src/data"],
        suffixes: [".generated.json", ".generated.jsonld"],
    },
    { target: "domain", prefixes: ["src/domain"] },
    { target: "application", prefixes: ["src/application"] },
    { target: "infrastructure", prefixes: ["src/infrastructure"] },
    { target: "presentation", prefixes: ["src/presentation"] },
    { target: "ui", prefixes: uiPrefixes },
    { target: "data", prefixes: ["src/data"] },
    { target: "utils", prefixes: ["src/utils"] },
    { target: "assets", prefixes: ["src/assets"] },
    { target: "styles", prefixes: ["src/styles"] },
    { target: "content-core", prefixes: ["packages/content-core/src"] },
    { target: "site-core", prefixes: ["packages/site-core/src"] },
]);
```

Keep specific rules before general rules:

* `presentation-adapter` before `presentation`;
* `generated-data` before `data`.

The source plan already identifies those ordering constraints as core invariants, not incidental implementation details. 

## Tests

Add invariant-style tests for:

* rule ordering;
* sibling path false positives;
* UI prefix reuse;
* generated-data precedence;
* presentation-adapter precedence;
* classifier result stability.

## Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
pnpm run check:architecture
```

## Exit criteria

* Repeated predicate wrappers are removed.
* Rule tables preserve current behaviour.
* Overlapping-prefix cases are explicitly tested.
* `check:architecture` still passes before Astro integration begins.

---

# Stage 5: Add Astro-Facing Enforcement Helper

## Goal

Create a small adapter from checker results to Astro failure semantics without coupling the checker core to Astro.

## Implementation

Add:

```text
config/integrations/layer-boundary-check-runner.ts
```

Suggested helper:

```ts
async function enforceLayerBoundaries(options: {
    cwd: string;
    logger: AstroIntegrationLogger;
    runBoundaryCheck: BoundaryCheckRunner;
}): Promise<void>
```

Responsibilities:

* call `runBoundaryCheck({ cwd })`;
* log the existing success message when there are no findings;
* log the formatted report when findings exist;
* throw an error when findings exist;
* avoid `process.exit`;
* avoid direct `console` calls;
* avoid direct `process.env` reads.

The Astro integration plan already separates this enforcement helper from hook wiring to keep the integration testable. 

## Tests

Add:

```text
config/integrations/__tests__/layer-boundary-check.test.ts
```

Cover:

* success logs `No layer boundary findings found.`;
* findings log the formatted report;
* findings throw;
* injected `cwd` is passed to the runner;
* injected checker is used;
* helper does not call `process.exit`;
* helper does not write directly to `console`.

## Verification

```bash
pnpm test:unit -- config/integrations/__tests__/layer-boundary-check.test.ts
```

## Exit criteria

* Astro-facing failure semantics are tested without invoking Astro.
* Checker core remains independent from Astro.

---

# Stage 6: Add the Astro Integration Factory

## Goal

Register lifecycle hooks that run the checker during build and gated check flows.

## Implementation

Add:

```text
config/integrations/layer-boundary-check.ts
```

Integration behaviour:

* name: `dibs-layer-boundary-check`;
* register `astro:build:start`;
* register `astro:config:setup`;
* use Astro logger;
* run at most once per process;
* throw on findings;
* skip when `SKIP_LAYER_BOUNDARY_CHECK=true`;
* run `astro:config:setup` only when `LAYER_BOUNDARY_CHECK=true`.

Environment policy:

```text
SKIP_LAYER_BOUNDARY_CHECK=true
```

always wins.

```text
LAYER_BOUNDARY_CHECK=true
```

enables config-setup enforcement.

The integration plan requires exact string matching, a global skip variable, a gated config-setup check path, and a run-once guard. 

## Tests

Extend `config/integrations/__tests__/layer-boundary-check.test.ts`.

Cover:

* `astro:build:start` runs by default;
* `astro:build:start` skips when `SKIP_LAYER_BOUNDARY_CHECK=true`;
* `astro:config:setup` skips by default;
* `astro:config:setup` runs when `LAYER_BOUNDARY_CHECK=true`;
* `SKIP_LAYER_BOUNDARY_CHECK=true` overrides `LAYER_BOUNDARY_CHECK=true`;
* checker runs only once if both hooks are invoked;
* checker receives `cwd`;
* thrown errors propagate from the hook.

## Verification

```bash
pnpm test:unit -- config/integrations/__tests__/layer-boundary-check.test.ts
```

## Exit criteria

* Hook behaviour is covered with injected test doubles.
* No full Astro build is required for unit coverage.
* Duplicate execution is prevented.

---

# Stage 7: Wire the Integration Into Astro and `astro check`

## Goal

Make Astro own the main enforcement path without removing the direct diagnostic script.

## Implementation

Update `astro.config.ts`:

```ts
import { layerBoundaryCheckIntegration } from "./config/integrations/layer-boundary-check";

export default defineConfig({
    integrations: [
        // existing integrations...
        layerBoundaryCheckIntegration(),
    ],
});
```

Place the integration late in the integration list unless a concrete ordering dependency says otherwise.

Update `scripts/run-astro-check.mjs` so only the spawned `astro check` process receives:

```text
LAYER_BOUNDARY_CHECK=true
```

Use environment merging:

```js
env: {
    ...process.env,
    LAYER_BOUNDARY_CHECK: "true",
}
```

The Astro plan explicitly keeps `check:architecture` as a direct command while moving `pnpm build` and `pnpm check` onto Astro lifecycle enforcement. 

## Tests

Add or adjust tests for `scripts/run-astro-check.mjs` if that wrapper already has test coverage.

Cover:

* spawned process receives `LAYER_BOUNDARY_CHECK=true`;
* existing environment variables are preserved;
* global `process.env` is not mutated;
* `SKIP_LAYER_BOUNDARY_CHECK=true` is preserved if already present.

## Verification

```bash
pnpm test:unit -- config/integrations/__tests__/layer-boundary-check.test.ts
pnpm test:unit -- scripts/__tests__/layer-boundary-checker.test.ts
pnpm run check:architecture
pnpm run build
pnpm run check
```

## Exit criteria

* `pnpm build` runs the checker through Astro.
* `pnpm check` runs the checker through the Astro-check wrapper.
* `astro dev` remains unaffected.

---

# Stage 8: Remove Redundant Root Check Chaining

## Goal

Make the Astro integration the primary enforcement path for `pnpm check`.

## Precondition

Before editing `package.json`, perform manual failure verification:

1. introduce a temporary known boundary violation;
2. confirm `pnpm run check` fails;
3. confirm `pnpm run build` fails;
4. revert the violation;
5. confirm both commands pass.

The Astro plan recommends this manual verification before removing `check:architecture` from the root `check` chain. 

## Implementation

Update the root `check` script by removing the redundant chained call:

```bash
&& pnpm run check:architecture
```

Keep:

```json
"check:architecture": "..."
```

as a direct diagnostic command.

## Verification

```bash
pnpm run check
pnpm run build
pnpm run check:architecture
```

## Exit criteria

* `pnpm run check` no longer directly chains `check:architecture`.
* `pnpm run check` still fails on architecture violations.
* `pnpm run build` fails on architecture violations.
* `pnpm run check:architecture` remains available.

---

# Stage 9: Final Integration Verification

## Goal

Confirm the full staged migration works end to end.

## Run

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
pnpm test:unit -- scripts/__tests__/layer-boundary-checker.test.ts
pnpm test:unit -- config/integrations/__tests__/layer-boundary-check.test.ts
pnpm run check:architecture
pnpm run check
pnpm run build
```

## Manual matrix

| Command / context                           | Expected result                                              |
| ------------------------------------------- | ------------------------------------------------------------ |
| `pnpm build`                                | runs layer-boundary check through `astro:build:start`        |
| `pnpm check`                                | runs layer-boundary check through gated `astro:config:setup` |
| `astro dev`                                 | does not run layer-boundary check                            |
| `astro preview`                             | does not run layer-boundary check                            |
| `SKIP_LAYER_BOUNDARY_CHECK=true pnpm build` | skips check                                                  |
| `SKIP_LAYER_BOUNDARY_CHECK=true pnpm check` | skips check                                                  |
| both hooks invoked in one process           | checker runs once                                            |
| `pnpm run check:architecture`               | still runs direct diagnostic checker                         |

---

# Combined Acceptance Criteria

The integrated plan is complete when:

* classifier exported functions keep the same names and return shapes;
* source and target classification results remain unchanged;
* overlapping-prefix cases are regression-tested;
* repeated source/target predicate wrappers are replaced by ordered rule tables;
* UI prefixes are declared once and reused;
* import-specifier logic is centralized in a dedicated helper module;
* path normalization remains separate from import-specifier classification;
* unresolved imports classify deterministically;
* malformed import records fail with a clear error;
* unknown import kinds classify as `"value"`;
* package-name extraction is tested for scoped and unscoped packages;
* rule-evaluation tests confirm downstream behaviour is unchanged;
* `layerBoundaryCheckIntegration()` is registered in `astro.config.ts`;
* `pnpm build` enforces layer boundaries through Astro;
* `pnpm check` enforces layer boundaries through the Astro-check wrapper;
* normal dev-server startup does not run the checker;
* `SKIP_LAYER_BOUNDARY_CHECK=true` disables the integration;
* `LAYER_BOUNDARY_CHECK=true` enables config-setup enforcement;
* checker execution is guarded so it runs at most once per process;
* checker findings are logged through the Astro logger;
* findings fail the Astro command by throwing;
* success logs the existing success message;
* `check:architecture` remains available as a manual command;
* the root `check` script no longer needs to chain `check:architecture`;
* no new runtime dependency is introduced.

---

# Suggested Commit Breakdown

1. `test: characterize layer boundary classification`
2. `test: lock layer boundary rule evaluation contract`
3. `refactor: extract layer boundary import helpers`
4. `refactor: use declarative layer boundary rules`
5. `test: add layer boundary invariant coverage`
6. `feat: add Astro layer boundary enforcement helper`
7. `feat: add layer boundary Astro integration`
8. `build: enable layer boundary check during Astro check`
9. `build: remove redundant architecture check chaining`

This split keeps each commit reviewable and lets CI identify whether a failure comes from classifier semantics, rule evaluation, Astro hook wiring, or package-script migration.
