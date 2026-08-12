# [PLAN] Subphase 1.4 — Complete Release-Policy-Driven Artifact Enforcement

## Scope Classification

**Recommended structure: medium-scope phases.**

Four phases are sufficient:

1. harden the release-policy core;
2. make the build consume the publishable surface;
3. make pack verification enforce exact set membership;
4. prove the real artifact and close traceability.

Do not introduce microservices. This is cohesive package/build tooling; the appropriate modular boundary is:

```text
                   pure domain core
                        |
         +--------------+--------------+
         |                             |
         v                             v
export-generation shell         pack-verification shell
         |                             |
         v                             v
generated TS + SVGs            diagnostics / exit status
```

The only intentional production behavior change is:

> Assets already recorded as `releaseDecision.action: "exclude"` must cease to appear in the standalone npm artifact.

Internal repository availability should remain unchanged.

---

# Current Baseline

## Already implemented — preserve and build upon

The current branch already has:

```text
scripts/lib/release-policy.mjs
scripts/lib/generate-exports.mjs

src/index.ts
src/publishable.ts
src/generated/internal/*
src/generated/publishable/*
```

`derivePublishableIcons()` already centralizes the important rules:

```text
phosphor
    -> publish

custom + include + permitted
    -> publish

custom + exclude
    -> do not publish

custom + include + !permitted
    -> finding
```

and `diffAssetFileSets()` already provides exact set-difference semantics.

The generator also already creates separate internal and publishable surfaces and shards them at 300 exports, directly
addressing the previous >500-line generated barrel problem.

Do **not** redo this work.

---

# Phase 1 — Harden the Release-Policy Core

## Goal

Make `release-policy.mjs` the authoritative, fail-closed domain model for publication eligibility before additional
consumers depend on it.

## Scope

Modify:

```text
packages/astro-icons/scripts/lib/release-policy.mjs
packages/astro-icons/scripts/test/release-policy.test.mjs
```

Potentially modify existing inventory contract tests if a rule belongs there instead.

---

## Cycle 1.1 — Detect Duplicate Manifest Records

### Red

```gherkin
Feature: Attribution manifest uniqueness

Scenario: Duplicate release metadata is rejected
  Given two manifest assets reference the same SVG file
  When publication policy is derived
  Then a duplicate-manifest finding is reported
  And neither record silently overrides the other
```

The current `indexManifestByFile()` uses `Map.set()`, so a duplicate filename silently makes the later record win.

### Green

Introduce a stable finding:

```js
releasePolicy.duplicateManifestAsset;
```

Detect duplicates while indexing.

Do not select a winner.

### Refactor

Prefer a small indexing result:

```js
{
    byFile,
    findings,
}
```

rather than throwing from deep inside the pure core.

---

## Cycle 1.2 — Make Inventory-Group Handling Exhaustive

### Red

```gherkin
Feature: Inventory group exhaustiveness

Scenario: Unknown inventory groups fail closed
  Given an icon has an unsupported inventory group
  When publication policy is derived
  Then an unsupported-group finding is reported
  And the icon is not published
```

### Green

Avoid semantics equivalent to:

```js
if (group === "phosphor") {
    ...
} else {
    // implicitly custom
}
```

Prefer an explicit decision:

```text
phosphor -> baseline publication
custom   -> manifest-controlled
other    -> policy finding
```

### Refactor

Centralize supported vocabulary.

Do not duplicate group literals in consumers.

---

## Cycle 1.3 — Characterize Malformed Release Decisions

### Red

Use DDT:

| Group    | Action        | Conclusion            | Expected                    |
| -------- | ------------- | --------------------- | --------------------------- |
| phosphor | N/A           | N/A                   | publish                     |
| custom   | `include`     | `permitted`           | publish                     |
| custom   | `include`     | `undetermined`        | finding                     |
| custom   | `include`     | `restricted`          | finding                     |
| custom   | `include`     | `permission-required` | finding                     |
| custom   | `exclude`     | any                   | exclude                     |
| custom   | missing       | any                   | finding or schema rejection |
| custom   | unknown value | any                   | finding or schema rejection |

The important requirement is **fail closed**.

### Green

Use the existing manifest-contract layer as the first choice if it already validates this vocabulary.

Only add runtime validation to `release-policy.mjs` for invariants not guaranteed by that boundary.

### Refactor

Avoid creating two competing validators.

The architectural rule should be:

```text
structural validation
        ↓
release-policy semantics
        ↓
publication plan
```

---

## Cycle 1.4 — Remove Non-Idiomatic Test API Patching

The current `release-policy.test.mjs` mutates `test` to manufacture a `test.each` API, even though the test suite later
uses an ordinary loop for its actual release-policy matrix.

### Red

```gherkin
Feature: Table-driven release-policy tests

Scenario: Policy matrices run using standard node:test primitives
  Given the release-policy matrix
  When its cases execute
  Then each case has a descriptive test name
  And no global or imported test API is mutated
```

### Green

Remove:

```js
test.each = ...
```

Use ordinary DDT:

```js
for (const testCase of cases) {
    test(testCase.label, () => {
        // ...
    });
}
```

### Refactor

Extract a tiny local helper only if several test files genuinely need it.

Do not build a testing abstraction around one matrix.

---

## Acceptance Criteria

- Duplicate manifest entries cannot silently override one another.
- Unknown inventory groups fail closed.
- Unknown/malformed release actions cannot accidentally become publishable.
- Existing include/permitted semantics remain intact.
- Publication results remain deterministic.
- Ordering invariance remains covered metamorphically.
- Tests use standard `node:test`.
- No new dependency is introduced.
- `release-policy.mjs` remains pure and below 500 lines.
- Functions remain approximately ≤25 lines.

## Non-Goals

- Do not change any frozen `releaseDecision`.
- Do not add `risk-accepted`.
- Do not change build output yet.
- Do not introduce Zod here unless the existing manifest-contract layer proves insufficient.
- Do not migrate test frameworks.

## Suggested Execution Order

Run first.

The build should not depend more heavily on the policy core until its ambiguity cases are characterized.

---

# Phase 2 — Make the Build Consume the Publishable Surface

## Goal

Complete the half-finished internal/public API split so that the standalone package contains only policy-approved
exports and SVGs.

## Scope

Modify:

```text
packages/astro-icons/tsup.config.ts
packages/astro-icons/scripts/copy-assets.mjs
packages/astro-icons/package.json
```

Potentially modify:

```text
generate-icons-index.js
```

only for orchestration improvements required by the build.

---

## Cycle 2.1 — Build the Standalone Package from `publishable.ts`

### Red

```gherkin
Feature: Published package entry surface

Scenario: The package entry uses the release-approved surface
  Given internal and publishable export surfaces exist
  When @ravenhill/astro-icons is built
  Then dist/index.js is generated from the publishable surface
  And internal-only exports do not appear in the package entry
```

### Green

Change the `tsup` entry from:

```ts
entry: ["src/index.ts"],
```

to the publishable source while preserving the output contract:

```text
dist/index.js
dist/index.d.ts
dist/index.js.map
```

The current config still targets `src/index.ts`, despite the generated `src/publishable.ts` already existing.

### Refactor

Keep consumer-facing imports unchanged:

```js
import { Acorn } from "@ravenhill/astro-icons";
```

Do not expose `publishable.ts` as a second public package subpath unless a genuine consumer use case exists.

---

## Cycle 2.2 — Make Asset Copying Policy-Driven

### Red

```gherkin
Feature: Release-policy-driven asset copying

Scenario: Publishable SVGs enter dist
  Given an SVG is present in the publishable asset plan
  When package assets are copied
  Then the SVG is copied to dist

Scenario: Excluded SVGs do not enter dist
  Given an SVG is excluded by release policy
  When package assets are copied
  Then the SVG is absent from dist
```

### Green

Replace the current:

```text
readdir(src)
    -> all *.svg
    -> copy all
```

behavior. `copy-assets.mjs` currently does exactly that.

Instead:

```text
source inventory + manifest
        ↓
derivePublishableIcons()
        ↓
copy exactly those files
```

### Refactor

Make `copy-assets.mjs` an imperative shell:

```js
export async function main(...) {
    ...
}
```

with effects isolated from selection policy.

A useful decomposition is:

```text
load release inputs
derive publication plan   <- pure/core
ensure dist
copy planned files        <- effect
report summary
```

Do not independently reimplement `include`, `exclude`, or redistribution semantics in this script.

---

## Cycle 2.3 — Generate Before Building

### Red

```gherkin
Feature: Generated publication surface freshness

Scenario: A build cannot consume stale generated exports
  Given the icon inventory or release policy changed
  When the package build runs
  Then publishable generated exports are refreshed or verified first
```

### Green

Prefer a named generation/check step before `tsup`.

Do not rely on maintainers remembering to run:

```text
pnpm generate-icons
```

manually.

Choose between:

```text
generate -> build
```

or, if generated artifacts are intentionally committed:

```text
generate --check -> build
```

The latter is preferable when reproducibility and clean-tree verification are important.

### Refactor

Avoid embedding a long root-level command directly into multiple package scripts.

Give generation/freshness checking one named script.

---

## Cycle 2.4 — Preserve Internal Website Behavior

### Red

```gherkin
Feature: Internal icon compatibility

Scenario: Excluded assets remain usable inside the monorepo
  Given an icon is excluded from standalone publication
  And existing site code imports it through the internal icon surface
  When the site is type-checked and built
  Then the internal import continues to resolve
```

### Green

Keep:

```text
src/index.ts
```

as the complete internal surface.

Only the package build switches to:

```text
src/publishable.ts
```

### Refactor

Document the distinction once:

```text
internal availability != publication eligibility
```

---

## Acceptance Criteria

- `tsup` builds the publishable surface.
- `dist/*.svg` contains only publishable assets.
- Excluded custom assets remain internally accessible.
- Consumer package entry paths remain unchanged.
- Generated sharding remains deterministic.
- Generated modules stay below 500 lines.
- The build cannot silently use stale publication metadata.
- `copy-assets.mjs` does not implement release policy itself.

## Non-Goals

- Do not delete excluded SVGs from `src/`.
- Do not change website behavior.
- Do not rename existing publishable exports.
- Do not add a new bundler.
- Do not split this into another npm package.
- Do not change licensing evidence.

## Suggested Execution Order

1. characterize standalone/public API behavior;
2. switch `tsup`;
3. constrain copying;
4. verify internal compatibility.

---

# Phase 3 — Replace Count Parity with Exact Artifact-Set Enforcement

## Goal

Make the pack checker answer:

> "Does this tarball contain exactly the policy-approved SVGs?"

rather than:

> "Does it contain as many SVGs as `src/`?"

The current evaluator still calls `checkSvgParity(files, srcSvgCount)`, and `main()` still reads the source SVG count.

## Scope

Modify:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
packages/astro-icons/scripts/test/assert-pack-files.test.mjs
```

Reuse:

```text
packages/astro-icons/scripts/lib/release-policy.mjs
```

Potentially split tests into:

```text
scripts/test/pack-contract.test.mjs
scripts/test/assert-pack-files-cli.test.mjs
```

---

## Cycle 3.1 — Introduce Exact SVG Set Comparison

### Red

```gherkin
Feature: Exact package SVG membership

Scenario: Exact publication set passes
  Given the expected publishable SVG set
  And the tarball contains exactly those SVGs
  When pack contents are evaluated
  Then no SVG-set finding is reported

Scenario: A publishable SVG is missing
  Given scadrial.svg is publishable
  And it is absent from the package
  Then scadrial.svg is reported as missing

Scenario: A non-publishable SVG is packaged
  Given roshar.svg is excluded
  And package/dist/roshar.svg exists
  Then roshar.svg is reported as unexpected

Scenario: Equal cardinality with different members fails
  Given expected and actual SVG sets contain the same number of files
  But their membership differs
  Then both differences are reported
```

### Green

Replace:

```js
checkSvgParity(files, srcSvgCount);
```

with something equivalent to:

```js
checkPublishedSvgSet({
    files,
    publishableIcons,
});
```

Reuse `diffAssetFileSets()` rather than implementing another set-difference algorithm.

### Refactor

Use structured findings:

```js
{
    missingAssets: [],
    unexpectedAssets: [],
}
```

Counts should become summary information only.

---

## Cycle 3.2 — Remove Source Filesystem Knowledge from the Evaluator

### Red

```gherkin
Feature: Pack evaluator domain boundary

Scenario: Package validity does not depend on source SVG count
  Given a tarball file list
  And a release-policy-derived publishable set
  When pack contents are evaluated
  Then no source filesystem scan is required
```

### Green

Move from:

```js
evaluatePackContents({
    files,
    manifest,
    srcSvgCount,
});
```

toward:

```js
evaluatePackContents({
    files,
    manifest,
    publishableIcons,
});
```

or, better:

```js
evaluatePackContents({
    files,
    releasePlan,
});
```

if a cohesive release-plan structure naturally emerges.

### Refactor

Delete `countSourceSvgs()` from the CLI once unused.

Do not retain count parity as a "secondary safety check"; exact set equality strictly subsumes it.

---

## Cycle 3.3 — Eliminate Duplicate Redistribution Semantics

The pack checker currently has its own:

```js
findIncludedAssetsWithoutPermittedRedistribution();
```

while `release-policy.mjs` now independently owns `isIncludedAction()` and `hasPermittedRedistribution()`.

### Red

```gherkin
Feature: Single release-policy source of truth

Scenario: A non-permitted included asset blocks packaging
  Given release policy reports the asset as invalid
  When pack contents are evaluated
  Then that policy finding is surfaced
  And the pack checker does not independently reinterpret the manifest
```

### Green

Have the pack evaluator consume policy findings produced by the release-policy core.

### Refactor

Delete duplicate release-policy predicates from `assert-pack-files.mjs`.

The dependency direction should become:

```text
release-policy
      ↓
pack-contract
```

never:

```text
release-policy <-> pack-contract
```

---

## Cycle 3.4 — Separate Semantic Findings from Presentation

### Red

```gherkin
Feature: Structured pack findings

Scenario: Multiple independent violations remain available to callers
  Given missing files
  And unexpected assets
  And blocked files
  When the contract is evaluated
  Then each finding category is represented structurally
```

### Green

Keep the evaluator data-oriented.

Format only at the CLI boundary:

```text
evaluatePackContents()
        ↓
structured result
        ↓
formatPackFindings()
        ↓
console
```

### Refactor

This is a good opportunity to shorten `printFindings()` and remove repeated formatting branches.

Keep formatting functions approximately ≤25 lines.

---

## Cycle 3.5 — Remove Dry-Run Tarball Cleanup

`packPackage()` currently executes `npm pack --dry-run --json`, but successful validation still invokes
`removePackedTarballs()`. The function harmlessly ignores `ENOENT`, but the cleanup is semantically obsolete for a dry
run.

### Red

```gherkin
Feature: Dry-run package inspection

Scenario: --pack creates no cleanup responsibility
  Given npm pack runs with --dry-run
  When validation succeeds
  Then no tarball deletion is attempted
```

### Green

Remove cleanup from the `--pack` path.

If stdin mode does not require physical tarball cleanup, remove the dependency entirely.

### Refactor

Shrink `defaultDependencies` accordingly.

---

## Cycle 3.6 — Harden Legacy Cleanup Only If It Must Survive

If cleanup remains for backwards compatibility, its filename must be treated as untrusted external data.

### Red — DDT

| Filename                | Expected |
| ----------------------- | -------- |
| `astro-icons-0.1.0.tgz` | accept   |
| `../victim.txt`         | reject   |
| `../../victim.txt`      | reject   |
| absolute POSIX path     | reject   |
| absolute Windows path   | reject   |
| nested unexpected path  | reject   |

### Red — PBT

The repository already has `fast-check` 4.5.3, so this is one place where PBT is genuinely justified.

Property:

```text
For every accepted cleanup filename:

resolved path must remain beneath packageRoot
```

Test mixed path separators, repeated dot segments, Unicode, and arbitrary path fragments.

### Green

Introduce a pure containment resolver.

### Refactor

Keep:

```text
parse filename
    ↓
validate/resolve
    ↓
filesystem effect
```

as distinct boundaries.

If cleanup is removed completely, **skip this entire cycle and the PBT dependency remains unused for this subphase**.

---

## Acceptance Criteria

- Exact set equality replaces SVG count parity.
- Missing expected assets are named.
- Unexpected/excluded packaged assets are named.
- `srcSvgCount` is removed from the pack-contract API.
- Release-policy semantics have a single implementation.
- Pack diagnostics remain grouped and deterministic.
- Dry-run cleanup is removed.
- Any surviving deletion path is containment-checked.
- PBT is used only if that path-processing surface survives.
- Pure contract tests remain filesystem-independent.
- CLI tests use dependency injection rather than module mocking.

## Non-Goals

- Do not add another set library.
- Do not add a CLI framework.
- Do not add experimental ESM module mocking.
- Do not fuzz internally trusted manifest structures without a concrete threat model.
- Do not preserve obsolete SVG-count parity merely because previous characterization tests captured it.

## Suggested Execution Order

Run immediately after the build begins producing the correct publication surface.

---

# Phase 4 — Integrate, Verify, Document, and Close

## Goal

Prove that the real package-manager-derived artifact implements the same policy as the pure core, then close Subphase
1.4 and Phase 1.

## Scope

Potentially modify:

```text
packages/astro-icons/package.json
packages/astro-icons/AGENTS.md
packages/astro-icons/README.md

traceability-log/open/
    phase_1_establish_licensing_provenance_and_attribution.md
```

Do not modify frozen evidence.

---

## Cycle 4.1 — Establish the Test Pyramid

Use three levels.

### Pure policy

```text
release-policy.test.mjs
```

Covers:

- group/action/conclusion matrix;
- duplicates;
- unknown records/groups;
- deterministic ordering;
- metamorphic invariants.

### Pure pack contract

```text
pack-contract.test.mjs
```

Covers:

- required files;
- blocked files;
- required legal references;
- exact asset set;
- aggregated findings.

### CLI/integration shell

```text
assert-pack-files-cli.test.mjs
```

Covers:

- import safety;
- injected effects;
- exit status;
- diagnostic/output delegation;
- packer-output normalization.

Do not force this exact split if the current files remain cohesive and comfortably under 500 lines.

---

## Cycle 4.2 — Add Real-Artifact Integration Verification

### Red

```gherkin
Feature: Real npm publication artifact

Scenario: The dry-run package implements release policy
  Given @ravenhill/astro-icons has been generated and built
  When npm computes its publishable file list
  Then every policy-approved SVG is present
  And no excluded SVG is present
  And every required legal file is present
  And development-only files are absent
```

### Green

Continue using:

```text
npm pack --dry-run --json
```

as the machine-readable artifact boundary.

Do not infer package contents from:

```text
src/
package.json.files
dist/
```

alone.

The actual packer's output is the integration oracle.

---

## Cycle 4.3 — Cross-Check API and Asset Surfaces

### Red

```gherkin
Feature: Published API and SVG artifact agree

Scenario: Every published SVG export has its packaged file
  Given the generated publishable export surface
  And the npm dry-run file set
  When they are compared
  Then every public SVG reference has a corresponding packaged asset

Scenario: No excluded asset appears in the published API
  Given an asset is excluded by release policy
  When the package export surface is inspected
  Then its export is absent
```

### Green

Use generated publication records, not a whole-bundle textual snapshot.

### Refactor

Avoid coupling tests to tsup formatting.

Test semantic names and paths.

---

## Cycle 4.4 — Execute the Verification Ladder

Run in increasing scope:

```powershell
pnpm --filter @ravenhill/astro-icons test:audit-icons
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons test:pack-files
pnpm --filter @ravenhill/astro-icons licenses:check
pnpm --filter @ravenhill/astro-icons build
pnpm --filter @ravenhill/astro-icons typecheck
pnpm --filter @ravenhill/astro-icons pack:check
pnpm --filter @ravenhill/astro-icons pack:dry-run
pnpm --filter @ravenhill/astro-icons lint
```

The current package already exposes these relevant scripts.

Do not encode a known `publint` failure as expected behavior:

```text
pass
    -> accept

known pre-existing failure, demonstrated against baseline
    -> document as external caveat

new failure
    -> block closure
```

---

## Cycle 4.5 — Optional Mutation Testing

Mutation testing is particularly valuable for:

```text
group === "phosphor"
action === "include"
conclusion === "permitted"
expected.has(file)
actual.has(file)
```

Use existing mutation-testing infrastructure if present.

Otherwise defer adding Stryker or equivalent to a broader repository-level quality initiative.

The current contract is not large enough to justify a new heavy dependency solely for this subphase.

---

## Cycle 4.6 — Documentation

### `AGENTS.md`

Explain:

```text
repository/internal availability
        !=
standalone publication eligibility
```

Document:

- release policy drives public exports and copied SVGs;
- `exclude` means absent from the standalone package;
- `include` requires permitted redistribution;
- `pack:check` checks the actual publishable artifact;
- no `risk-accepted` override currently exists.

### `README.md`

Keep only consumer-relevant guarantees:

- package includes required notices;
- publication is filtered through the recorded release policy.

Do not duplicate maintainer workflow.

---

## Cycle 4.7 — Protected-Evidence Check

Before traceability closure:

```powershell
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/src -- "*.svg"

git diff --check
git status --short
```

The manifest currently explicitly marks examples such as Bash and Kotlin as `exclude`; this phase should enforce those
existing decisions, not rewrite them.

### Acceptance

Protected evidence must remain unchanged.

Generated TypeScript files are allowed to change because they are derived implementation artifacts.

---

## Cycle 4.8 — Traceability Closure

Only after all verification succeeds:

```text
Subphase 1.4 -> DONE
Phase 1      -> complete, if all prior subphases remain complete
```

Record:

- the discovered count-parity flaw;
- introduction of exact publication-set enforcement;
- internal/public API separation;
- actual dry-run verification;
- exact command outcomes;
- intentionally excluded custom assets;
- any genuinely pre-existing tooling caveat;
- deferred `risk-accepted` policy.

Do not describe successful enforcement as legal approval.

---

## Acceptance Criteria

- Pure policy tests pass.
- Pure pack-contract tests pass.
- CLI-shell tests pass.
- Build uses `src/publishable.ts`.
- Internal site imports remain compatible.
- Only release-approved SVGs reach `dist`.
- The npm dry-run contains the exact expected SVG set.
- Required legal files are present.
- Blocked internals are absent.
- API exports and packaged assets agree.
- Frozen provenance evidence is unchanged.
- Source SVG bytes are unchanged.
- `git diff --check` passes.
- Traceability closes only after artifact-level verification.

## Non-Goals

- Do not publish.
- Do not contact rights holders.
- Do not change release decisions.
- Do not add `risk-accepted`.
- Do not introduce microservices.
- Do not replace `node:test`.
- Do not introduce another bundler.
- Do not add PBT unless the path-safety surface survives.
- Do not add mutation tooling solely for this verifier.
- Do not stage or commit.
- Do not archive the phase.

## Suggested Execution Order

Run last.

Artifact verification must precede traceability closure.

---

# Testing-Technique Decision

| Technique        | Decision           | Rationale                                                                                |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| **BDD**          | Strongly use       | Release rules map naturally to behavioral scenarios                                      |
| **DDT**          | Strongly use       | Excellent fit for action/conclusion/group, required-file, and blocked-file matrices      |
| **PBT**          | Conditional        | High value for surviving path-containment logic; low value for finite release vocabulary |
| **Mock testing** | Narrow use         | Inject imperative effects; do not mock pure policy functions                             |
| **Metamorphic**  | Use                | Ordering invariance and irrelevant-metadata invariance are meaningful                    |
| **Mutation**     | Optional           | Excellent for critical boolean policy predicates, but only if infrastructure is reusable |
| **Differential** | Do not manufacture | No independent equivalent policy implementation exists                                   |
| **Fuzzing**      | Defer              | No sufficiently broad hostile parser surface after obsolete cleanup is removed           |
| **Integration**  | Essential          | The actual package-manager artifact is the definitive outer-boundary check               |

One additional improvement over the uploaded plan is that **PBT is no longer categorically rejected**. The repository
already depends on `fast-check`, so if legacy cleanup/path parsing remains, path containment is a mature and genuinely
useful PBT target.

# Toolchain Modernization

Keep modernization separate from this corrective subphase.

The repository is currently on TypeScript 5.9.2 and Astro 5.15.1. TypeScript 6.0 is now released, but it is
intentionally a transition release with breaking changes/deprecations ahead of the native TypeScript 7 compiler, so
upgrading it should have its own characterization/migration work. ([TypeScript][1]) Astro 7 is also current and brings
its Rust compiler/Vite 8 transition, which is substantial enough to deserve an independent upgrade plan rather than
being folded into licensing enforcement. ([Astro][2])

For runtime/tooling, Node 24 is the appropriate production target today: Node lists v24 as LTS and v26 as Current, and
recommends production applications use LTS releases. ([Node.js][3]) pnpm 11.20 is the sensible stable upgrade target;
pnpm 12 is currently a Rust-rewrite release candidate, while 11.20 contains relevant package-substitution and lockfile
hardening. ([pnpm][4])

I would therefore defer modernization as:

```text
Subphase 1.4 closure
        ↓
Node -> 24 LTS
        ↓
pnpm -> 11.20+
        ↓
Astro 5 -> supported migration path toward Astro 7
        ↓
TypeScript 5.9 -> 6.0
```

with each major migration separately characterized.

## Most important change from the original plan

The uploaded plan says, in effect, **"preserve SVG parity."** I would explicitly revoke that acceptance criterion.

The new invariant should be:

```text
actual packaged SVG set
        ==
release-policy-derived publishable SVG set
```

That is the semantic contract the rest of the architecture should now converge on.

[1]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html?utm_source=chatgpt.com "Documentation - TypeScript 6.0"
[2]: https://astro.build/blog/astro-7/?utm_source=chatgpt.com "Astro 7.0"
[3]: https://nodejs.org/en/about/previous-releases?utm_source=chatgpt.com "Node.js Releases"
[4]: https://pnpm.io/blog?utm_source=chatgpt.com "Blog"
