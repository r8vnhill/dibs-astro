# Harden the Release-Policy Pipeline and Establish a Single Audited Publication Plan

# Code-review findings

## P0 — The release plan does not actually use the frozen inventory

This is the most important remaining defect.

`publishable-plan.mjs` currently obtains the live `src/*.svg` list and reconstructs an inventory at publication time:

```js
const filenames = readdirSync(srcDir).filter((file) => file.endsWith(".svg"));
const inventory = buildIconInventory(filenames, CUSTOM_BASE_NAMES);
```

It never reads the committed `migration/icon-inventory.json`.

That is dangerous because `buildIconInventory()` classifies an asset as custom **only** when its basename appears in
`CUSTOM_BASE_NAMES`; every other SVG automatically becomes `"phosphor"`:

```js
return customBaseNameSet.has(baseName) ? "custom" : "phosphor";
```

Meanwhile, `derivePublishableIcons()` considers every `"phosphor"` inventory member automatically publishable.

Therefore this sequence is possible:

```text
developer adds some-new-third-party-logo.svg
              ↓
not in CUSTOM_BASE_NAMES
              ↓
dynamically classified as "phosphor"
              ↓
automatically considered publishable
              ↓
copy-assets copies it
              ↓
pack checker derives the same live classification
              ↓
pack checker considers it expected
```

The frozen inventory explicitly records the classification strategy, the nine custom basenames, and 1,521 audited
records. It should be the authority for publication, not merely evidence that can be reconstructed from current files.

### Recommended design

Make the direction explicit:

```text
                 frozen icon-inventory.json
                           +
                 attribution manifest
                           |
                           v
                   deriveReleasePlan()
                           |
              +------------+------------+
              |                         |
              v                         v
       generated exports          artifact copying
              |                         |
              +------------+------------+
                           |
                           v
                     pack verifier

live src/*.svg
      |
      v
inventory drift check only
```

The live source directory should answer:

> Does reality still match the audited inventory?

It should **not** answer:

> What classification should this newly discovered file receive?

For valid current repository state, this is behavior-preserving. It only causes previously unaudited future drift to
fail closed.

---

## P0 — The artifact integration test runs before the build that creates its artifact

The latest commit adds:

```text
scripts/test/pack-artifact.integration.test.mjs
```

to `test:pack-files`. But package `check` currently runs:

```text
test:licenses
→ test:pack-files
→ licenses:check
→ build
→ typecheck
→ lint
→ pack:check
```

So `pack-artifact.integration.test.mjs` executes `npm pack --dry-run --json` **before `build`**.

This is particularly problematic because `dist/` is ignored, while CI explicitly uses `GIT_CLEAN_FLAGS: -ffdx`. A clean
CI checkout therefore has no trustworthy pre-existing package build for that integration test to inspect. Locally, the
opposite problem occurs: it can inspect stale `dist/` from an earlier build.

The test consequently has two undesirable modes:

```text
clean workspace     → no artifact exists yet
dirty workspace     → potentially stale artifact
```

### Recommended fix

Keep:

```text
test:pack-files
```

strictly pure/unit-level.

Either remove `pack-artifact.integration.test.mjs` because `pack:check` already exercises the real dry-run adapter, or
expose:

```json
"test:pack-artifact": "node --test scripts/test/pack-artifact.integration.test.mjs"
```

and execute it **after `build`**.

I prefer simplifying it further:

```text
build
  ↓
pack:check
```

because `pack:check` already invokes the real CLI and real `npm pack --dry-run --json`. A second integration test that
independently reconstructs the same adapter adds surprisingly little independent evidence.

---

## P1 — Generated publishable exports can become stale relative to release policy

`tsup` correctly builds:

```ts
entry: {
    index: "src/publishable.ts";
}
```

which is an excellent improvement.

However, `src/publishable.ts` and its sharded modules are committed generated files, while package `build` currently
does only:

```text
tsup && node scripts/copy-assets.mjs
```

It does not regenerate or verify the generated export surface. The generator itself explicitly says to run
`pnpm generate-icons` manually or integrate it into the build.

That creates a second split-brain possibility. Suppose an asset changes from publishable to excluded:

```text
manifest changes
     |
     +---- copy-assets reads current policy → excludes SVG
     |
     +---- pack:check reads current policy → expects no SVG
     |
     └---- src/publishable.ts is stale → still exports SVG
```

The SVG-set contract can pass while `dist/index.js` references an SVG that is not packaged.

### Recommended design

Because generated sources are committed, prefer a **check mode**, not automatic CI rewriting:

```text
derive expected generated files
            ↓
compare with committed generated files
            ↓
fail if stale
```

For example:

```text
pnpm generate-icons --check
```

or a package-specific equivalent.

This also improves reproducibility: CI proves generated code corresponds to its declared inputs rather than silently
repairing it.

---

## P1 — Publication-sensitive commands do not share the already-existing manifest validation

There is already strong validation code in `license-metadata.mjs`. It detects:

- duplicate manifest records;
- missing and unexpected attribution records;
- unsupported `releaseDecision.action`;
- unsupported `redistribution.conclusion`;
- unresolved placeholders;
- invalid referenced license files.

But `release-policy.mjs` does not consume those guarantees directly. Its `indexManifestByFile()` uses ordinary
`Map.set()`, meaning duplicate records silently use the last value, and `resolveCustomIcon()` treats **anything other
than `"include"`** as non-publishable without distinguishing valid `"exclude"`/`"pending"` from malformed vocabulary.

`licenses:check` catches this when the entire package `check` sequence is used, but direct commands such as:

```text
pnpm build
pnpm pack:check
```

should also fail closed because they are publication-sensitive commands.

### Recommended abstraction

Avoid two policy validators:

```text
           BAD
license-metadata validation
          |
        separate
          |
release-policy assumptions
```

Prefer:

```text
      attribution contract
              |
              v
   validated release inputs
              |
              v
       release policy
              |
  +-----------+-----------+
  |                       |
build                   verify
```

I would either make `deriveReleasePlan()` perform the publication-relevant structural validation, or extract the shared
vocabulary/coverage portion from `license-metadata.mjs` into a neutral pure module such as:

```text
scripts/lib/attribution-contract.mjs
```

Do **not** add Zod merely for this refactor. The repository already has explicit validators that express these
domain-specific diagnostics well; using them is preferable to adding another validation model. The root project does
already use Zod 4.3.6, but there is no need to duplicate a working solution here.

---

## P1 — The main quality gate does not execute the new policy/build tests

`test:audit-icons` now includes:

```text
release-policy.test.mjs
generate-exports.test.mjs
copy-assets.test.mjs
icon-inventory.contract.test.mjs
```

but package `check` never calls `test:audit-icons`.

That is particularly unfortunate because these are precisely the tests protecting the new release-surface architecture.

The root `pnpm check` delegates to `pnpm --filter @ravenhill/astro-icons check`; there is no separate root invocation
compensating for the omission.

So the normal CI `test:check` job does not currently guarantee those tests run, even though CI calls the root
`pnpm check`.

### Recommendation

`@ravenhill/astro-icons check` should include:

```text
test:audit-icons
test:licenses
test:pack-files
```

before proceeding to integration-level gates.

---

## P2 — `pack-artifact.integration.test.mjs` duplicates the production adapter instead of testing it

The integration test defines another Windows/POSIX `npm pack --dry-run --json` adapter, parses its own output, then
invokes the same evaluator and publication-plan functions as production.

That gives less independent coverage than a black-box test of:

```text
node scripts/assert-pack-files.mjs --pack
```

and creates duplicate process-launch logic.

For integration tests, exercise the actual boundary unless you specifically want a lower-level contract test.

A better hierarchy is:

```text
release-policy.test.mjs
        pure

pack-contract.test.mjs
        pure

assert-pack-files-cli.test.mjs
        injected shell

node assert-pack-files.mjs --pack
        real integration
```

That is both simpler and stronger.

---

## P2 — Tests mutate the imported `node:test` API

Both the release-policy and pack-contract suites manufacture `test.each` by assigning to the imported `test` function:

```js
if (test.each === undefined) {
    test.each = ...
}
```

This is unnecessary and makes the suite look like it uses an API that `node:test` does not actually provide.

For DDT, ordinary JavaScript is clearer:

```js
for (const testCase of testCases) {
    test(testCase.label, () => {
        // ...
    });
}
```

The release-policy suite already uses this style for one of its matrices, so removing the compatibility shim also
improves internal consistency.

There is also an indentation regression inside that loop: the body of the callback is not indented to the project's
requested four-space nesting level. This is minor but worth fixing while touching the test.

---

# What I would preserve

Several recent choices are exactly the right direction.

**Exact set comparison is much stronger than cardinality parity.** `diffAssetFileSets()` now identifies missing and
unexpected assets explicitly, and `pack-contract.test.mjs` includes the important equal-cardinality/different-members
case.

**The internal/publishable split is a good abstraction.** `tsup` builds the publishable barrel without altering the
package's `dist/index.js` contract, while internal consumers can retain the complete barrel.

**Generated sharding is also appropriate.** The generator uses a shard size of 300 rather than allowing a >1,500-line
barrel to grow indefinitely, satisfying the 500-line source-file objective with useful headroom.

**The functional-core/imperative-shell direction should remain.** `release-policy.mjs` is side-effect-free while
`copy-assets.mjs` owns filesystem effects, and both build and verification consume the shared policy layer.

I would not introduce microservices here. Separate processes, deployment units, IPC, and operational boundaries would
add cost with no useful isolation for package-generation tooling. Package-local modules are the correct modularity
level.

---

# Revised plan

## Scope classification

**Medium scope → organize as phases.**

Most of the architecture is now implemented. The remaining work is not large enough for milestones, but it touches
policy authority, generation, CI ordering, integration verification, and traceability, so direct red-green-refactor
cycles without phase boundaries would be too flat.

The plan should remain behavior-preserving for currently valid, audited inputs. The only observable enforcement change
is to **fail closed on source/evidence drift that should never have been silently publishable**.

---

# Phase 1 — Repair the Verification Pipeline

## Goal

Make every test execute at the correct abstraction level and ensure integration tests only inspect freshly built
artifacts.

## Scope

Modify:

```text
packages/astro-icons/package.json
packages/astro-icons/scripts/test/pack-artifact.integration.test.mjs
```

Potentially delete `pack-artifact.integration.test.mjs` if `pack:check` subsumes it.

### Cycle 1.1 — Separate pure tests from artifact integration

#### Red

```gherkin
Feature: Pack-contract verification layers

Scenario: Pack unit tests require no build artifact
  Given a clean checkout with no dist directory
  When test:pack-files runs
  Then all tests can execute without building the package

Scenario: Real artifact verification uses a fresh build
  Given the package has been built successfully
  When pack:check runs
  Then the npm dry-run artifact is evaluated
```

#### Green

Change:

```text
test:pack-files
    pack-contract
    CLI unit tests
    pack-artifact integration
```

to:

```text
test:pack-files
    pack-contract
    CLI unit tests
```

Then either:

```text
build
→ test:pack-artifact
```

or preferably:

```text
build
→ pack:check
```

using the existing production CLI.

#### Refactor

Delete duplicated `readPackFiles()` process-launch logic if `pack:check` becomes the integration oracle.

---

### Cycle 1.2 — Put release-policy tests in the normal gate

#### Red

```gherkin
Feature: Astro-icons quality gate

Scenario: Release-policy tests are mandatory
  Given the package check command
  When it runs in CI
  Then release-policy, export-generation, asset-copying, licensing,
       and pack-contract tests all execute
```

#### Green

Make `check` include `test:audit-icons`.

Suggested sequence:

```text
test:audit-icons
→ test:licenses
→ test:pack-files
→ licenses:check
→ generated-exports:check
→ build
→ typecheck
→ pack:check
→ lint
```

Putting `pack:check` before `lint` is useful here because a `publint` tooling problem should not prevent collection of
the package-contract evidence.

#### Refactor

If script composition becomes unreadable, introduce a few semantic aggregate scripts such as:

```text
test:unit
verify:generated
verify:artifact
```

rather than repeating long commands.

---

## Acceptance criteria

- `test:pack-files` succeeds without `dist/`.
- Real artifact checks execute only after `build`.
- `test:audit-icons` participates in normal `check`.
- No test relies on stale local build output.
- CI and local `check` use the same ordering.
- No production behavior changes.

## Non-goals

- Do not redesign release policy yet.
- Do not change license decisions.
- Do not add dependencies.
- Do not publish.

## Suggested execution order

Run first. It restores trustworthy feedback for every later cycle.

---

# Phase 2 — Make the Frozen Inventory the Publication Authority

## Goal

Derive publication from audited evidence and use the source directory only to detect drift.

## Scope

Modify:

```text
packages/astro-icons/scripts/lib/publishable-plan.mjs
packages/astro-icons/scripts/lib/release-policy.mjs
packages/astro-icons/scripts/test/release-policy.test.mjs
```

Potentially extract:

```text
packages/astro-icons/scripts/lib/release-plan.mjs
```

only if it produces a cleaner dependency boundary.

---

### Cycle 2.1 — Reject source files absent from the frozen inventory

#### Red

```gherkin
Feature: Frozen inventory authority

Scenario: An unreviewed source SVG cannot become publishable
  Given icon-inventory.json does not contain worldhopper.svg
  And src/worldhopper.svg exists
  When the release plan is resolved
  Then publication is blocked
  And worldhopper.svg is reported as untracked

Scenario: A frozen inventory member must still exist in source
  Given icon-inventory.json contains roshar.svg
  And src/roshar.svg is absent
  When the release plan is resolved
  Then publication is blocked
  And roshar.svg is reported as missing
```

Use DDT for:

| Inventory | Source  | Expected                 |
| --------- | ------- | ------------------------ |
| present   | present | continue                 |
| present   | absent  | missing-source finding   |
| absent    | present | untracked-source finding |

#### Green

Load the committed inventory rather than reconstructing classification from source names.

Add a pure comparison such as:

```js
diffSourceAgainstInventory({
    inventoryFiles,
    sourceFiles,
});
```

Then:

```text
read frozen inventory
read manifest
list source SVGs
        ↓
check source/inventory parity
        ↓
derive publication policy
```

#### Refactor

`CUSTOM_BASE_NAMES` should remain part of **inventory generation/auditing**, not release-time classification.

---

### Cycle 2.2 — Make release vocabulary fail closed

#### Red

```gherkin
Feature: Release-policy vocabulary

Scenario Outline: Unknown release vocabulary blocks publication
  Given a custom asset has <field> equal to <value>
  When its release plan is derived
  Then a policy finding is returned

Examples:
  | field                       | value        |
  | releaseDecision.action      | experimental |
  | redistribution.conclusion  | unknown      |
```

Also:

```gherkin
Scenario: Duplicate manifest assets block publication
  Given two attribution records reference roshar.svg
  When release policy is derived
  Then duplicate evidence is reported
  And neither record silently wins
```

#### Green

Reuse the existing vocabulary and duplicate detection from the attribution validation layer.

Prefer one shared publication contract over reimplementing those enums.

#### Refactor

If naming permits, evolve:

```text
license-metadata.mjs
```

toward:

```text
attribution-contract.mjs
```

only if that makes ownership substantially clearer.

Do not create a generic validation framework.

---

### Cycle 2.3 — Return a cohesive release plan

Instead of passing partially related data:

```js
manifest;
publishableIcons;
```

through different layers, consider:

```js
{
    publishableIcons,
    policyFindings,
    sourceDrift,
}
```

or:

```js
{
    ok,
    publishableIcons,
    findings,
}
```

The shell can reject `!ok`; pure consumers receive a validated publication plan.

Keep the structure domain-specific and immutable by convention.

---

## Acceptance criteria

- Frozen `icon-inventory.json` determines classification.
- An unknown new SVG cannot be automatically treated as Phosphor.
- Source/inventory drift fails closed.
- Duplicate manifest records fail.
- Unsupported release vocabulary fails.
- Current valid publication output remains unchanged.
- The core remains filesystem-independent.
- Functions stay approximately ≤25 lines.
- Modules remain below 500 lines.
- No new validation dependency is needed.

## Non-goals

- Do not regenerate the frozen inventory.
- Do not change classification records.
- Do not change release decisions.
- Do not add `risk-accepted`.
- Do not remove internal SVGs.

## Suggested execution order

Run after Phase 1 so every new policy test is part of the normal quality gate.

---

# Phase 3 — Make Generated Publication Surfaces Reproducible

## Goal

Prevent committed generated exports from diverging from the current frozen release plan.

## Scope

Refactor:

```text
generate-icons-index.js
packages/astro-icons/scripts/lib/generate-exports.mjs
```

Modify package/root scripts as required.

---

### Cycle 3.1 — Separate planning from writing

#### Red

```gherkin
Feature: Generated export planning

Scenario: Equivalent release inputs produce identical generated outputs
  Given the same validated release plan
  When export generation is planned twice
  Then file paths and contents are identical

Scenario: Sharding is deterministic
  Given more icons than one shard allows
  When outputs are planned
  Then each icon appears exactly once
  And no part exceeds the configured shard capacity
```

#### Green

Move toward:

```text
validated release plan
        ↓
planGeneratedOutputs()
        ↓
Map<path, content>
```

Then keep writing/deletion in a thin shell.

The existing `planExportModules()` is already a useful core primitive; build on it rather than replacing it.

#### Refactor

`generateIconSurfaces()` currently performs input loading, policy derivation, surface planning, writing, stale-file
removal, and reporting. Split these responsibilities sufficiently to keep functional blocks small.

---

### Cycle 3.2 — Add a non-mutating generated-files check

#### Red

```gherkin
Feature: Generated export freshness

Scenario: Current generated exports pass
  Given committed generated files match the release plan
  When generate-icons --check executes
  Then it succeeds without modifying the repository

Scenario: A stale public export fails
  Given publishable.ts differs from the release plan
  When generate-icons --check executes
  Then it fails
  And identifies the stale generated path
```

#### Green

Add a genuine check-only mode.

Do **not** implement CI verification as:

```text
generate files
git diff
```

when the generator can directly compare planned and current content without mutations.

#### Refactor

Reuse the same output planning for both:

```text
--write
--check
```

so the two modes cannot drift.

---

### Cycle 3.3 — Verify built API-to-asset integrity

#### Red

```gherkin
Feature: Published module asset integrity

Scenario: Every SVG import in dist/index.js exists in the artifact
  Given the package has been built
  When its JavaScript module imports are inspected
  Then every .svg specifier corresponds to a packaged SVG

Scenario: Every packaged SVG is approved by the release plan
  Given the npm dry-run artifact
  When its SVG members are inspected
  Then no unapproved SVG exists
```

#### Green

For the JavaScript import side, prefer the already-used workspace dependency `es-module-lexer` rather than a regex
parser. The root workspace currently already has `es-module-lexer` 2.x.

If the test lives inside `@ravenhill/astro-icons` and pnpm's strict dependency boundary requires it, declare it
explicitly as a package dev dependency rather than relying on accidental root resolution.

#### Refactor

Test semantic specifiers, not the textual format produced by tsup.

---

## Acceptance criteria

- Generated output planning is pure.
- `--check` performs no writes.
- A stale `src/publishable.ts` blocks `check`.
- Shards remain deterministic and below 500 lines.
- Every bundled SVG reference exists in the publishable artifact.
- Existing public package entrypoint remains unchanged.
- Internal icon imports remain unchanged.

## Non-goals

- Do not replace tsup.
- Do not snapshot the complete bundle.
- Do not auto-rewrite generated files in CI.
- Do not publish a second entrypoint.

## Suggested execution order

Run after the release plan is authoritative.

---

# Phase 4 — Close Artifact Verification and Traceability

## Goal

Prove the release artifact end-to-end, then close traceability only after all gates pass from a clean checkout.

## Scope

Modify:

```text
packages/astro-icons/package.json
packages/astro-icons/AGENTS.md
traceability-log/...
```

README only if the consumer-facing guarantee changed.

---

### Cycle 4.1 — Establish the final verification ladder

The target should be approximately:

```text
test:audit-icons
        ↓
test:licenses
        ↓
test:pack-files
        ↓
licenses:check
        ↓
generate-icons:check
        ↓
build
        ↓
typecheck
        ↓
pack:check
        ↓
artifact API/asset integrity
        ↓
lint
```

Run that exact path in CI from a clean checkout.

---

### Cycle 4.2 — Repository-purity verification

#### Red

```gherkin
Feature: Publication enforcement preserves evidence

Scenario: Verification does not alter frozen evidence
  Then third-party-icons.json is unchanged
  And icon-inventory.json is unchanged
  And source SVG bytes are unchanged
  And generated notices are unchanged
```

#### Green

Check the protected diffs plus:

```powershell
git diff --check
git status --short
```

---

### Cycle 4.3 — Re-close traceability

The latest commit already moved the Subphase 1.4/Phase 1 traceability files into `closed/`.

Given the clean-build integration issue and the live-reclassification issue, I would treat that closure as premature.
Reopen—or otherwise mark the traceability status pending—until the corrected verification ladder passes.

Record:

- frozen-inventory authority;
- source/inventory drift gate;
- generated-surface freshness;
- exact tarball SVG-set contract;
- API-to-asset integrity;
- clean CI outcome.

---

## Acceptance criteria

- Full package check succeeds from a clean checkout.
- No test consumes stale `dist/`.
- Publication classification comes only from frozen evidence.
- Generated public API matches current release policy.
- Real artifact passes exact-set validation.
- Every bundled SVG reference exists in the tarball.
- Frozen evidence remains unchanged.
- `git diff --check` passes.
- Traceability closes only after those results are recorded.

## Non-goals

- Do not publish.
- Do not stage/commit as part of verification.
- Do not change legal decisions.
- Do not treat a software check as legal approval.
- Do not combine unrelated framework upgrades with this fix.

## Suggested execution order

Run last.

---

# Testing-technique assessment

**BDD:** strong fit and should remain the default. The release contract is naturally expressed as policy scenarios.

**DDT:** strongly recommended for release action × redistribution conclusion, inventory/source presence, required
package files, blocked paths, and generated-shard boundaries.

**PBT:** useful only selectively. The workspace already has `fast-check` 4.5.3, and current fast-check is 4.9.0, but I
would not add PBT merely for the finite release-decision matrix. It could add value for set-algebra/generator
invariants—permutation invariance, shard completeness, uniqueness, and round-trip planning—but the existing explicit
metamorphic tests may already provide enough value.

**Metamorphic testing:** high value here. Retain ordering invariance, and add invariants such as “adding an untracked
source file changes a valid plan into a drift failure” and “reordering inventory records cannot change the publication
set.”

**Mock testing:** use only at imperative boundaries (`readFile`, `readdir`, process invocation, writes). Pure
policy/generator functions should use direct values.

**Mutation testing:** useful for `group === "phosphor"`, `action === "include"`, `conclusion === "permitted"`, and
expected/actual set membership. I would add Stryker only as a repository-wide quality initiative, not solely for this
subphase.

**Differential testing:** not warranted yet because there is no independently implemented equivalent release-policy
engine. Comparing two consumers of the same function is not differential testing.

**Fuzz testing:** also not warranted. There is no sufficiently complex hostile parser boundary remaining to justify a
fuzz harness.

---

# Toolchain recommendations

Keep these **separate from the behavior-preserving release-contract repair**.

The CI still runs **Node 20**, which is now EOL. Node's official release table recommends production applications use an
Active or Maintenance LTS line; Node 24 is LTS while Node 26 remains Current. Move CI to **Node 24 LTS** in a dedicated
modernization change.

The repository pins **pnpm 9.15.9**. pnpm 11 is the stable production line, and 11.20 includes security hardening; pnpm
12 is currently a Rust-rewrite release candidate, so I would target **pnpm 11.20+**, not 12 yet.

`@ravenhill/astro-icons` is on **publint 0.3.19**, while 0.3.21 is the current release. A patch upgrade to 0.3.21 is
reasonable dependency hygiene, but I found no basis for claiming it fixes the existing module-resolution caveat, so test
that separately.

The workspace is on **TypeScript 5.9.2**, while TypeScript 6.0 has been released. TS 6 is a transition release with
compatibility/deprecation implications, so it deserves its own characterized upgrade rather than being bundled into this
artifact-contract change.

Likewise, the site is on **Astro 5.15.1**, while Astro 7.1 is current. Astro 7 introduces Vite 8 and a Rust compiler,
among other substantial changes, so migrate that separately after the Node baseline is modernized. Astro provides its
official upgrade CLI for that path.

`tsup` is already at 8.5.1 in this package, and nothing in these commits suggests replacing it. The package's
configuration is small and appropriate for this use case.

## Recommended priority

The order I would use is:

```text
P0  Frozen inventory becomes publication authority
P0  Fix clean-build/integration-test ordering
P1  Add generated-output freshness check
P1  Reuse fail-closed attribution validation
P1  Wire policy/generator tests into check
P2  Remove duplicated integration adapter
P2  Remove test.each monkey-patching
    ↓
clean end-to-end verification
    ↓
traceability closure
    ↓
Node 24 / pnpm 11 modernization
    ↓
TypeScript 6 / Astro 7 migrations
```

The biggest conceptual improvement is to make **one immutable audited release plan** drive generation, copying, and
verification. The current architecture is close, but deriving that plan from the live directory means the very thing
being verified can currently influence the expected answer. That is the boundary I would fix first.
